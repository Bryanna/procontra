-- Vincula una compra de seguimiento con dispensación, inventario y continuidad.
begin;

alter table api.t_dispensaciones
  add column if not exists f_uuid_plan_seguimiento uuid,
  add column if not exists f_numero_receta_plan smallint;

do $$ begin
  alter table api.t_dispensaciones add constraint fk_t_dispensaciones_plan_seguimiento
    foreign key (f_uuid_plan_seguimiento) references api.t_planes_seguimiento(f_uuid);
exception when duplicate_object then null; end $$;

alter table api.t_dispensaciones drop constraint if exists ck_t_dispensaciones_numero_receta_plan;
alter table api.t_dispensaciones add constraint ck_t_dispensaciones_numero_receta_plan
  check (f_numero_receta_plan is null or f_numero_receta_plan between 1 and 24);

create unique index if not exists ux_t_dispensaciones_plan_receta
  on api.t_dispensaciones(f_idempresa,f_app,f_uuid_plan_seguimiento,f_numero_receta_plan)
  where f_uuid_plan_seguimiento is not null and f_numero_receta_plan is not null and f_estado='posted';

-- El índice original solo permitía un producto por dispensación.
drop index if exists api.ux_t_movimientos_inventario_tenant_movimiento;
create unique index if not exists ux_t_movimientos_inventario_tenant_movimiento
  on api.t_movimientos_inventario(f_idempresa,f_idsucursal,f_app,f_uuid_dispensacion,f_uuid_producto,f_tipo_movimiento)
  where f_uuid_dispensacion is not null;

create or replace function api.fn_registrar_resultado_seguimiento(
  p_empresa integer,p_app integer,p_uuid_plan uuid,p_resultado text,p_canal text,p_observaciones text,
  p_proxima_accion date,p_usuario uuid
) returns void language plpgsql security definer set search_path=api,public as $$
declare v_plan api.t_planes_seguimiento%rowtype;
begin
  select * into v_plan from api.t_planes_seguimiento
  where f_uuid=p_uuid_plan and f_idempresa=p_empresa and f_app=p_app for update;
  if not found then raise exception 'Plan no disponible'; end if;
  if p_resultado='compro' then raise exception 'Compra requiere dispensación'; end if;
  if p_resultado not in ('contesto','no_contesto','ya_tiene_receta','no_tiene_receta','tiene_cita_medica','esperando_autorizacion','comprara_efectivo','volver_a_llamar','enviar_a_casa') then
    raise exception 'Resultado inválido';
  end if;
  insert into api.t_contactos_seguimiento(
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app,f_uuid_plan,f_canal,f_resultado,
    f_observaciones,f_proxima_accion_en,f_registrado_por
  ) values(
    v_plan.f_email_principal,v_plan.f_rnc_principal,v_plan.f_idempresa,v_plan.f_idsucursal,v_plan.f_app,v_plan.f_uuid,
    coalesce(nullif(p_canal,''),'call'),p_resultado,nullif(trim(coalesce(p_observaciones,'')),''),p_proxima_accion,p_usuario
  );
  update api.t_planes_seguimiento set f_ultimo_resultado=p_resultado,
    f_fecha_contacto=case when p_proxima_accion is not null then p_proxima_accion else f_fecha_contacto end,
    f_actualizado_en=now() where f_uuid=p_uuid_plan;
end; $$;

create or replace function api.fn_buscar_productos_dispensables(
  p_empresa integer,p_app integer,p_uuid_plan uuid,p_busqueda text default '',p_limite integer default 10
) returns table(
  f_uuid uuid,f_codigo text,f_nombre text,f_presentacion text,
  f_disponible numeric,f_actualizado_en timestamptz
) language sql stable security definer set search_path=api,public as $$
  with plan as (
    select f_idsucursal from api.t_planes_seguimiento
    where f_uuid=p_uuid_plan and f_idempresa=p_empresa and f_app=p_app and f_estado='active'
  )
  select pr.f_uuid,pr.f_codigo,pr.f_nombre,pr.f_presentacion,
    sum(greatest(pos.f_disponible-pos.f_reservado,0))::numeric as f_disponible,
    max(pos.f_actualizado_en) as f_actualizado_en
  from plan
  join api.t_posiciones_inventario pos
    on pos.f_idempresa=p_empresa and pos.f_app=p_app and pos.f_idsucursal=plan.f_idsucursal
   and pos.f_fecha_vencimiento>=current_date and pos.f_disponible-pos.f_reservado>0
  join api.t_productos pr
    on pr.f_uuid=pos.f_uuid_producto and pr.f_idempresa=pos.f_idempresa and pr.f_app=pos.f_app and pr.f_activo
  where trim(coalesce(p_busqueda,''))=''
     or pr.f_codigo ilike '%'||trim(p_busqueda)||'%'
     or pr.f_nombre ilike '%'||trim(p_busqueda)||'%'
  group by pr.f_uuid,pr.f_codigo,pr.f_nombre,pr.f_presentacion
  order by pr.f_nombre
  limit greatest(1,least(coalesce(p_limite,10),25));
$$;

create or replace function api.fn_registrar_compra_seguimiento(
  p_empresa integer,p_app integer,p_uuid_plan uuid,p_uuid_producto uuid,p_cantidad numeric,
  p_unidades_por_dia numeric,p_indicaciones_verificadas boolean,p_clave_idempotencia text,
  p_receta_esperada integer,p_canal text,p_observaciones text,p_usuario uuid
) returns uuid language plpgsql security definer set search_path=api,public as $$
declare
  v_plan api.t_planes_seguimiento%rowtype;
  v_regla api.t_reglas_ars%rowtype;
  v_actor api.t_perfiles%rowtype;
  v_sucursal api.t_sucursales%rowtype;
  v_posicion api.t_posiciones_inventario%rowtype;
  v_dispensacion uuid;
  v_existente_plan uuid;
  v_existente_producto uuid;
  v_existente_cantidad numeric;
  v_item uuid;
  v_ciclo uuid;
  v_numero integer;
  v_cantidad_recetas integer;
  v_dias integer;
  v_fecha_agotamiento date;
  v_fecha_alerta date;
begin
  if p_cantidad is null or p_cantidad<=0 or p_cantidad>999999 then raise exception 'Cantidad dispensada inválida'; end if;
  if p_unidades_por_dia is not null and (p_unidades_por_dia<=0 or p_unidades_por_dia>9999) then raise exception 'Unidades por día inválidas'; end if;
  if trim(coalesce(p_clave_idempotencia,'')) !~ '^[A-Za-z0-9:_-]{8,120}$' then raise exception 'Clave idempotente inválida'; end if;
  if coalesce(p_canal,'') not in ('call','whatsapp','in_person') then raise exception 'Canal inválido'; end if;

  select * into v_actor from api.t_perfiles
  where f_uuid=p_usuario and f_idempresa=p_empresa and f_app=p_app and f_activo
    and f_rol in ('administrator','pharmacist');
  if not found then raise exception 'No autorizado'; end if;

  -- Reintentos exactos retornan la misma dispensación sin efectos repetidos.
  select d.f_uuid,d.f_uuid_plan_seguimiento,i.f_uuid_producto,i.f_cantidad
  into v_dispensacion,v_existente_plan,v_existente_producto,v_existente_cantidad
  from api.t_dispensaciones d
  left join api.t_items_dispensacion i on i.f_uuid_dispensacion=d.f_uuid
  where d.f_idempresa=p_empresa and d.f_app=p_app and d.f_clave_idempotencia=p_clave_idempotencia;
  if found then
    if v_existente_plan=p_uuid_plan and v_existente_producto=p_uuid_producto and v_existente_cantidad=p_cantidad then return v_dispensacion; end if;
    raise exception 'Conflicto de clave idempotente';
  end if;

  select * into v_plan from api.t_planes_seguimiento
  where f_uuid=p_uuid_plan and f_idempresa=p_empresa and f_app=p_app and f_estado='active'
  for update;
  if not found then raise exception 'Plan no disponible'; end if;

  select d.f_uuid,d.f_uuid_plan_seguimiento,i.f_uuid_producto,i.f_cantidad
  into v_dispensacion,v_existente_plan,v_existente_producto,v_existente_cantidad
  from api.t_dispensaciones d
  left join api.t_items_dispensacion i on i.f_uuid_dispensacion=d.f_uuid
  where d.f_idempresa=p_empresa and d.f_app=p_app and d.f_clave_idempotencia=p_clave_idempotencia;
  if found then
    if v_existente_plan=p_uuid_plan and v_existente_producto=p_uuid_producto and v_existente_cantidad=p_cantidad then return v_dispensacion; end if;
    raise exception 'Conflicto de clave idempotente';
  end if;

  if p_receta_esperada is null or p_receta_esperada<>v_plan.f_numero_receta_actual then
    raise exception 'El plan cambió; actualice antes de confirmar la compra';
  end if;

  select * into v_regla from api.t_reglas_ars where f_uuid=v_plan.f_uuid_regla_ars and f_activa;
  if not found then raise exception 'ARS no configurada'; end if;

  select * into v_sucursal from api.t_sucursales
  where f_idempresa=p_empresa and f_app=p_app and f_idsucursal=v_plan.f_idsucursal and f_activo;
  if not found then raise exception 'Sucursal no disponible'; end if;

  if not exists(select 1 from api.t_productos where f_uuid=p_uuid_producto and f_idempresa=p_empresa and f_app=p_app and f_activo) then
    raise exception 'Producto dispensado requerido';
  end if;

  select * into v_posicion from api.t_posiciones_inventario
  where f_idempresa=p_empresa and f_app=p_app and f_idsucursal=v_plan.f_idsucursal
    and f_uuid_sucursal=v_sucursal.f_uuid and f_uuid_producto=p_uuid_producto
    and f_fecha_vencimiento>=current_date and f_disponible-f_reservado>=p_cantidad
  order by f_fecha_vencimiento,f_uuid
  limit 1 for update;
  if not found then raise exception 'Existencia insuficiente o desactualizada'; end if;

  insert into api.t_dispensaciones(
    f_clave_idempotencia,f_uuid_paciente,f_uuid_sucursal,f_estado,f_publicado_en,
    f_uuid_creado_por,f_uuid_plan_seguimiento,f_numero_receta_plan,
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
  ) values(
    p_clave_idempotencia,v_plan.f_uuid_paciente,v_sucursal.f_uuid,'posted',now(),
    p_usuario,v_plan.f_uuid,v_plan.f_numero_receta_actual,
    v_plan.f_email_principal,v_plan.f_rnc_principal,p_empresa,v_plan.f_idsucursal,p_app
  ) on conflict do nothing returning f_uuid into v_dispensacion;

  if v_dispensacion is null then
    select f_uuid into v_dispensacion from api.t_dispensaciones
    where f_idempresa=p_empresa and f_app=p_app
      and (f_clave_idempotencia=p_clave_idempotencia or
           (f_uuid_plan_seguimiento=p_uuid_plan and f_numero_receta_plan=v_plan.f_numero_receta_actual and f_estado='posted'));
    if found then return v_dispensacion; end if;
    raise exception 'No se pudo publicar la dispensación';
  end if;

  insert into api.t_items_dispensacion(
    f_uuid_dispensacion,f_uuid_producto,f_cantidad,f_unidades_por_dia,f_indicaciones_verificadas,
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
  ) values(
    v_dispensacion,p_uuid_producto,p_cantidad,p_unidades_por_dia,coalesce(p_indicaciones_verificadas,false),
    v_plan.f_email_principal,v_plan.f_rnc_principal,p_empresa,v_plan.f_idsucursal,p_app
  ) returning f_uuid into v_item;

  update api.t_posiciones_inventario
  set f_disponible=f_disponible-p_cantidad,f_actualizado_en=now(),f_fuente='dispensation'
  where f_uuid=v_posicion.f_uuid;

  insert into api.t_movimientos_inventario(
    f_uuid_dispensacion,f_uuid_producto,f_uuid_sucursal,f_tipo_movimiento,f_cantidad,f_uuid_aprobado_por,
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
  ) values(
    v_dispensacion,p_uuid_producto,v_sucursal.f_uuid,'dispensation',-p_cantidad,p_usuario,
    v_plan.f_email_principal,v_plan.f_rnc_principal,p_empresa,v_plan.f_idsucursal,p_app
  );

  if coalesce(p_indicaciones_verificadas,false) and p_unidades_por_dia is not null then
    v_dias:=floor(p_cantidad/p_unidades_por_dia);
    if v_dias<1 then raise exception 'Cobertura calculada inválida'; end if;
    v_fecha_agotamiento:=current_date+v_dias;
    v_fecha_alerta:=v_fecha_agotamiento-7;
    insert into api.t_ciclos_continuidad(
      f_uuid_paciente,f_uuid_item_dispensacion,f_estado,f_dias_cobertura,f_fecha_agotamiento,f_fecha_alerta,
      f_version_regla,f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
    ) values(
      v_plan.f_uuid_paciente,v_item,'active',v_dias,v_fecha_agotamiento,v_fecha_alerta,
      'dispensation-v1',v_plan.f_email_principal,v_plan.f_rnc_principal,p_empresa,v_plan.f_idsucursal,p_app
    ) returning f_uuid into v_ciclo;
    insert into api.t_alertas(
      f_uuid_ciclo,f_version_plantilla,f_programado_en,f_estado,f_inventario_capturado_en,
      f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
    ) values(
      v_ciclo,'continuity-v1',v_fecha_alerta::timestamptz,'scheduled',now(),
      v_plan.f_email_principal,v_plan.f_rnc_principal,p_empresa,v_plan.f_idsucursal,p_app
    );
  else
    insert into api.t_ciclos_continuidad(
      f_uuid_paciente,f_uuid_item_dispensacion,f_estado,f_version_regla,f_motivo_revision,
      f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
    ) values(
      v_plan.f_uuid_paciente,v_item,'review_required','dispensation-v1','Indicaciones o unidades por día pendientes de verificación',
      v_plan.f_email_principal,v_plan.f_rnc_principal,p_empresa,v_plan.f_idsucursal,p_app
    );
  end if;

  insert into api.t_contactos_seguimiento(
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app,f_uuid_plan,f_canal,f_resultado,
    f_observaciones,f_registrado_por
  ) values(
    v_plan.f_email_principal,v_plan.f_rnc_principal,p_empresa,v_plan.f_idsucursal,p_app,v_plan.f_uuid,
    p_canal,'compro',nullif(trim(coalesce(p_observaciones,'')),''),p_usuario
  );

  v_cantidad_recetas:=coalesce(v_plan.f_cantidad_recetas_plan,v_regla.f_cantidad_recetas);
  if v_regla.f_modo='monthly' then
    v_numero:=v_plan.f_numero_receta_actual+1;
    update api.t_planes_seguimiento set
      f_fecha_ultima_compra=current_date,f_numero_receta_actual=v_numero,
      f_estado=case when v_numero>=v_cantidad_recetas then 'completed' else 'active' end,
      f_proxima_compra=case when v_numero>=v_cantidad_recetas then null else api.fn_fecha_mensual(current_date,1) end,
      f_fecha_contacto=case when v_numero>=v_cantidad_recetas then null else api.fn_fecha_mensual(current_date,1)-7 end,
      f_ultimo_resultado='compro',f_actualizado_en=now()
    where f_uuid=v_plan.f_uuid;
  else
    update api.t_planes_seguimiento set f_fecha_ultima_compra=current_date,
      f_ultimo_resultado='compro',f_actualizado_en=now() where f_uuid=v_plan.f_uuid;
  end if;

  insert into api.t_eventos_auditoria(
    f_uuid_actor,f_uuid_sucursal,f_tipo_evento,f_tipo_entidad,f_uuid_entidad,f_uuid_correlacion,
    f_metadatos_seguros,f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
  ) values(
    p_usuario,v_sucursal.f_uuid,'follow_up.purchase_posted','dispensation',v_dispensacion,p_uuid_plan,
    jsonb_build_object('quantity',p_cantidad,'prescription',v_plan.f_numero_receta_actual),
    v_plan.f_email_principal,v_plan.f_rnc_principal,p_empresa,v_plan.f_idsucursal,p_app
  );

  return v_dispensacion;
end; $$;

revoke all on function api.fn_buscar_productos_dispensables(integer,integer,uuid,text,integer) from public,anon,authenticated;
grant execute on function api.fn_buscar_productos_dispensables(integer,integer,uuid,text,integer) to service_role;
revoke all on function api.fn_registrar_compra_seguimiento(integer,integer,uuid,uuid,numeric,numeric,boolean,text,integer,text,text,uuid) from public,anon,authenticated;
grant execute on function api.fn_registrar_compra_seguimiento(integer,integer,uuid,uuid,numeric,numeric,boolean,text,integer,text,text,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
