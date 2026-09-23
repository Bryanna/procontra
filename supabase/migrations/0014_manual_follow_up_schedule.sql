-- Permite que el usuario digite la programación del plan sin perder las reglas ARS.
alter table api.t_planes_seguimiento
  add column if not exists f_programacion_modo varchar(20) not null default 'ars_rule',
  add column if not exists f_cantidad_recetas_plan smallint;

alter table api.t_planes_seguimiento drop constraint if exists ck_t_planes_seguimiento_programacion_modo;
alter table api.t_planes_seguimiento add constraint ck_t_planes_seguimiento_programacion_modo
  check (f_programacion_modo in ('ars_rule','manual'));
alter table api.t_planes_seguimiento drop constraint if exists ck_t_planes_seguimiento_cantidad_plan;
alter table api.t_planes_seguimiento add constraint ck_t_planes_seguimiento_cantidad_plan
  check (f_cantidad_recetas_plan is null or f_cantidad_recetas_plan between 1 and 24);

drop function if exists api.fn_crear_plan_seguimiento(integer,integer,integer,text,text,uuid,uuid,text,date,text,text,text,text);
create function api.fn_crear_plan_seguimiento(
  p_empresa integer,p_sucursal integer,p_app integer,p_email text,p_rnc text,p_usuario uuid,
  p_uuid_paciente uuid,p_codigo_ars text,p_fecha_primera_compra date,p_medicamentos text,
  p_medico text default null,p_numero_caso text default null,p_observaciones text default null,
  p_programacion_modo text default 'ars_rule',p_cantidad_recetas integer default null,
  p_numero_receta_actual integer default 1,p_fecha_ultima_compra date default null,
  p_proxima_compra date default null,p_fecha_contacto date default null
) returns uuid language plpgsql security definer set search_path=api,public as $$
declare v_regla api.t_reglas_ars%rowtype; v_uuid uuid; v_paciente record; v_manual boolean;
begin
  if p_fecha_primera_compra is null or p_fecha_primera_compra>current_date then raise exception 'Fecha de primera compra inválida'; end if;
  if length(trim(coalesce(p_medicamentos,'')))<2 then raise exception 'Medicamentos requeridos'; end if;
  select f_uuid into v_paciente from api.t_pacientes where f_uuid=p_uuid_paciente and f_idempresa=p_empresa and f_app=p_app and f_activo=true;
  if not found then raise exception 'Paciente no disponible'; end if;
  select * into v_regla from api.t_reglas_ars where f_codigo=p_codigo_ars and f_activa=true and f_idempresa=0 and f_app=0;
  if not found then raise exception 'ARS no configurada'; end if;
  if v_regla.f_modo='case_number' and length(trim(coalesce(p_numero_caso,'')))<2 then raise exception 'Número de caso requerido para IDOPPRIL'; end if;
  v_manual:=v_regla.f_modo='monthly' and p_programacion_modo='manual';
  if v_manual and (
    coalesce(p_cantidad_recetas,0) not between 1 and 24 or
    coalesce(p_numero_receta_actual,0) not between 1 and p_cantidad_recetas or
    p_fecha_ultima_compra is null or p_fecha_ultima_compra<p_fecha_primera_compra or
    p_proxima_compra is null or p_proxima_compra<p_fecha_ultima_compra or
    p_fecha_contacto is null or p_fecha_contacto>p_proxima_compra
  ) then raise exception 'Programación manual inválida'; end if;

  insert into api.t_planes_seguimiento(
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app,f_uuid_paciente,f_uuid_regla_ars,
    f_medicamentos,f_medico,f_numero_caso,f_fecha_primera_compra,f_fecha_ultima_compra,
    f_numero_receta_actual,f_proxima_compra,f_fecha_contacto,f_programacion_modo,f_cantidad_recetas_plan,
    f_observaciones,f_creado_por
  ) values (
    p_email,p_rnc,p_empresa,p_sucursal,p_app,p_uuid_paciente,v_regla.f_uuid,
    trim(p_medicamentos),nullif(trim(coalesce(p_medico,'')),''),nullif(trim(coalesce(p_numero_caso,'')),''),
    p_fecha_primera_compra,case when v_manual then p_fecha_ultima_compra else p_fecha_primera_compra end,
    case when v_manual then p_numero_receta_actual else 1 end,
    case when v_manual then p_proxima_compra when v_regla.f_modo='monthly' then api.fn_fecha_mensual(p_fecha_primera_compra,1) end,
    case when v_manual then p_fecha_contacto when v_regla.f_modo='monthly' then api.fn_fecha_mensual(p_fecha_primera_compra,1)-7 end,
    case when v_manual then 'manual' else 'ars_rule' end,case when v_manual then p_cantidad_recetas end,
    nullif(trim(coalesce(p_observaciones,'')),''),p_usuario
  ) returning f_uuid into v_uuid;
  return v_uuid;
end; $$;

create or replace function api.fn_registrar_resultado_seguimiento(
  p_empresa integer,p_app integer,p_uuid_plan uuid,p_resultado text,p_canal text,p_observaciones text,
  p_proxima_accion date,p_usuario uuid
) returns void language plpgsql security definer set search_path=api,public as $$
declare v_plan api.t_planes_seguimiento%rowtype; v_regla api.t_reglas_ars%rowtype; v_numero integer; v_cantidad integer;
begin
  select * into v_plan from api.t_planes_seguimiento where f_uuid=p_uuid_plan and f_idempresa=p_empresa and f_app=p_app for update;
  if not found then raise exception 'Plan no disponible'; end if;
  if p_resultado not in ('contesto','no_contesto','ya_tiene_receta','no_tiene_receta','tiene_cita_medica','esperando_autorizacion','comprara_efectivo','volver_a_llamar','enviar_a_casa','compro') then raise exception 'Resultado inválido'; end if;
  select * into v_regla from api.t_reglas_ars where f_uuid=v_plan.f_uuid_regla_ars;
  v_cantidad:=coalesce(v_plan.f_cantidad_recetas_plan,v_regla.f_cantidad_recetas);
  insert into api.t_contactos_seguimiento(
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app,f_uuid_plan,f_canal,f_resultado,
    f_observaciones,f_proxima_accion_en,f_registrado_por
  ) values (
    v_plan.f_email_principal,v_plan.f_rnc_principal,v_plan.f_idempresa,v_plan.f_idsucursal,v_plan.f_app,v_plan.f_uuid,
    coalesce(nullif(p_canal,''),'call'),p_resultado,nullif(trim(coalesce(p_observaciones,'')),''),p_proxima_accion,p_usuario
  );
  if p_resultado='compro' and v_regla.f_modo='monthly' then
    v_numero:=v_plan.f_numero_receta_actual+1;
    update api.t_planes_seguimiento set
      f_fecha_ultima_compra=current_date,f_numero_receta_actual=v_numero,
      f_estado=case when v_numero>=v_cantidad then 'completed' else 'active' end,
      f_proxima_compra=case when v_numero>=v_cantidad then null else api.fn_fecha_mensual(current_date,1) end,
      f_fecha_contacto=case when v_numero>=v_cantidad then null else api.fn_fecha_mensual(current_date,1)-7 end,
      f_ultimo_resultado=p_resultado,f_actualizado_en=now()
    where f_uuid=p_uuid_plan;
  else
    update api.t_planes_seguimiento set f_ultimo_resultado=p_resultado,
      f_fecha_contacto=case when p_proxima_accion is not null then p_proxima_accion else f_fecha_contacto end,
      f_actualizado_en=now() where f_uuid=p_uuid_plan;
  end if;
end; $$;

create or replace function api.fn_consultar_planes_seguimiento(
  p_empresa integer,p_app integer,p_busqueda text default '',p_estado text default 'all',p_codigo_ars text default '',
  p_codigo_sucursal text default '',p_limite integer default 25,p_desplazamiento integer default 0
) returns table(
  f_uuid uuid,f_uuid_paciente uuid,f_nombre_completo text,f_telefono text,f_ars text,f_codigo_ars text,
  f_cantidad_recetas smallint,f_modo text,f_sucursal text,f_codigo_sucursal text,f_medicamentos text,f_medico text,
  f_numero_caso text,f_fecha_primera_compra date,f_fecha_ultima_compra date,f_numero_receta_actual smallint,
  f_proxima_compra date,f_fecha_contacto date,f_estado text,f_ultimo_resultado text,f_total_registros bigint
) language sql stable security definer set search_path=api,public as $$
  with filtrados as (
    select pl.*,pa.f_nombre_completo,pa.f_telefono,r.f_nombre as ars,r.f_codigo as codigo_ars,
      coalesce(pl.f_cantidad_recetas_plan,r.f_cantidad_recetas)::smallint as cantidad_recetas,r.f_modo,
      s.f_nombre as sucursal,s.f_codigo as codigo_sucursal
    from api.t_planes_seguimiento pl
    join api.t_pacientes pa on pa.f_uuid=pl.f_uuid_paciente and pa.f_idempresa=pl.f_idempresa and pa.f_app=pl.f_app
    join api.t_reglas_ars r on r.f_uuid=pl.f_uuid_regla_ars
    left join api.t_sucursales s on s.f_uuid=pa.f_uuid_sucursal_preferida and s.f_idempresa=pl.f_idempresa and s.f_app=pl.f_app
    where pl.f_idempresa=p_empresa and pl.f_app=p_app
      and (p_estado='all' or pl.f_estado=p_estado)
      and (p_codigo_ars='' or r.f_codigo=p_codigo_ars)
      and (p_codigo_sucursal='' or s.f_codigo=p_codigo_sucursal)
      and (trim(p_busqueda)='' or pa.f_nombre_completo ilike '%'||trim(p_busqueda)||'%' or pa.f_telefono ilike '%'||trim(p_busqueda)||'%' or pl.f_medicamentos ilike '%'||trim(p_busqueda)||'%')
  )
  select f_uuid,f_uuid_paciente,f_nombre_completo,f_telefono,ars,codigo_ars,cantidad_recetas,f_modo,sucursal,codigo_sucursal,
    f_medicamentos,f_medico,f_numero_caso,f_fecha_primera_compra,f_fecha_ultima_compra,f_numero_receta_actual,
    f_proxima_compra,f_fecha_contacto,f_estado,f_ultimo_resultado,count(*) over()
  from filtrados order by f_fecha_contacto nulls last,f_nombre_completo limit greatest(1,least(p_limite,100)) offset greatest(p_desplazamiento,0);
$$;

grant execute on function api.fn_crear_plan_seguimiento(integer,integer,integer,text,text,uuid,uuid,text,date,text,text,text,text,text,integer,integer,date,date,date) to service_role;
notify pgrst, 'reload schema';
