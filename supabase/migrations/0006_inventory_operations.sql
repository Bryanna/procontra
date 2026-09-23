begin;

create or replace function api.fn_consultar_inventario(
  p_empresa integer,
  p_sucursal integer,
  p_app integer,
  p_busqueda text default '',
  p_filtro text default 'all',
  p_codigo_sucursal text default '',
  p_limite integer default 25,
  p_desplazamiento integer default 0
) returns table(
  f_uuid uuid,
  f_codigo text,
  f_nombre text,
  f_presentacion text,
  f_existencias jsonb,
  f_estado text,
  f_total_registros bigint
) language sql stable security definer set search_path=api,public as $$
  with posiciones_sucursal as (
    select
      i.f_uuid_producto,
      s.f_codigo,
      sum(i.f_disponible) as disponible,
      sum(i.f_reservado) as reservado,
      sum(i.f_disponible - i.f_reservado) as existencia,
      max(i.f_minimo_reorden) as minimo,
      max(i.f_actualizado_en) as actualizado_en
    from api.t_posiciones_inventario i
    join api.t_sucursales s
      on s.f_uuid=i.f_uuid_sucursal
     and s.f_idempresa=i.f_idempresa
     and s.f_app=i.f_app
    where i.f_idempresa=p_empresa and i.f_app=p_app
    group by i.f_uuid_producto,s.f_codigo
  ), existencias as (
    select
      f_uuid_producto,
      jsonb_object_agg(
        f_codigo,
        jsonb_build_object(
          'onHand',disponible,
          'reserved',reservado,
          'available',existencia,
          'updatedAt',actualizado_en
        ) order by f_codigo
      ) as por_sucursal
    from posiciones_sucursal
    group by f_uuid_producto
  ), estado as (
    select
      p.f_uuid,
      p.f_codigo,
      p.f_nombre,
      p.f_presentacion,
      coalesce(e.por_sucursal,'{}'::jsonb) as existencias,
      case
        when count(ps.*)=0 then 'no_data'
        when coalesce(sum(ps.existencia),0)<=0 then 'out_of_stock'
        when bool_or(ps.existencia>0 and ps.existencia<=ps.minimo) then 'low_stock'
        else 'available'
      end as estado
    from api.t_productos p
    left join existencias e on e.f_uuid_producto=p.f_uuid
    left join posiciones_sucursal ps
      on ps.f_uuid_producto=p.f_uuid
     and (coalesce(trim(p_codigo_sucursal),'')='' or ps.f_codigo=trim(p_codigo_sucursal))
    where p.f_idempresa=p_empresa
      and p.f_idsucursal=p_sucursal
      and p.f_app=p_app
      and p.f_activo
      and (
        coalesce(trim(p_busqueda),'')=''
        or p.f_codigo ilike '%'||trim(p_busqueda)||'%'
        or p.f_nombre ilike '%'||trim(p_busqueda)||'%'
        or coalesce(p.f_presentacion,'') ilike '%'||trim(p_busqueda)||'%'
      )
    group by p.f_uuid,p.f_codigo,p.f_nombre,p.f_presentacion,e.por_sucursal
  ), filtrado as (
    select * from estado
    where case coalesce(p_filtro,'all')
      when 'with_stock' then estado in ('available','low_stock')
      when 'low_stock' then estado='low_stock'
      when 'out_of_stock' then estado='out_of_stock'
      when 'without_data' then estado='no_data'
      else true
    end
  )
  select
    f_uuid,
    f_codigo,
    f_nombre,
    f_presentacion,
    existencias,
    estado,
    count(*) over() as total_registros
  from filtrado
  order by f_nombre,f_codigo
  limit greatest(1,least(coalesce(p_limite,25),100))
  offset greatest(coalesce(p_desplazamiento,0),0)
$$;

create or replace function api.fn_crear_producto_inventario(
  p_actor_uuid uuid,
  p_codigo text,
  p_nombre text,
  p_presentacion text default null,
  p_posiciones jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path=api,public as $$
declare
  v_producto uuid;
  v_empresa integer;
  v_sucursal integer;
  v_app integer;
  v_email character varying(180);
  v_rnc character varying(20);
  v_posicion jsonb;
  v_sucursal_uuid uuid;
  v_sucursal_id integer;
  v_disponible numeric;
  v_minimo numeric;
  v_costo numeric;
  v_precio numeric;
  v_lote text;
  v_vencimiento date;
begin
  select f_idempresa,f_idsucursal,f_app,f_email_principal,f_rnc_principal
    into v_empresa,v_sucursal,v_app,v_email,v_rnc
  from api.t_perfiles
  where f_uuid=p_actor_uuid and f_activo and f_rol in ('administrator','inventory');
  if not found then raise exception 'Permiso de inventario requerido'; end if;

  if trim(coalesce(p_codigo,''))='' or length(trim(p_codigo))>60 then
    raise exception 'Código de producto inválido';
  end if;
  if trim(coalesce(p_nombre,''))='' or length(trim(p_nombre))>240 then
    raise exception 'Nombre de producto inválido';
  end if;
  if jsonb_typeof(coalesce(p_posiciones,'[]'::jsonb))<>'array' then
    raise exception 'Posiciones de inventario inválidas';
  end if;

  insert into api.t_productos(
    f_codigo,f_nombre,f_presentacion,f_activo,f_version_catalogo,
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
  ) values(
    trim(p_codigo),upper(trim(p_nombre)),nullif(trim(coalesce(p_presentacion,'')),''),true,'manual',
    v_email,v_rnc,v_empresa,v_sucursal,v_app
  ) returning f_uuid into v_producto;

  for v_posicion in select value from jsonb_array_elements(coalesce(p_posiciones,'[]'::jsonb)) loop
    begin
      v_sucursal_uuid := (v_posicion->>'branchId')::uuid;
      v_disponible := (v_posicion->>'onHand')::numeric;
      v_minimo := (v_posicion->>'reorderMinimum')::numeric;
      v_lote := trim(coalesce(v_posicion->>'lot',''));
      v_vencimiento := (v_posicion->>'expiryDate')::date;
      v_costo := nullif(v_posicion->>'cost','')::numeric;
      v_precio := nullif(v_posicion->>'price','')::numeric;
    exception when others then
      raise exception 'Posición de inventario inválida';
    end;

    select f_idsucursal into v_sucursal_id
    from api.t_sucursales
    where f_uuid=v_sucursal_uuid and f_idempresa=v_empresa and f_app=v_app and f_activo;
    if not found then raise exception 'Sucursal de inventario inválida'; end if;
    if v_disponible<0 or v_minimo<0 then raise exception 'Existencia y mínimo deben ser no negativos'; end if;
    if v_lote='' then raise exception 'Lote requerido para existencia inicial'; end if;
    if v_vencimiento<current_date then raise exception 'Vencimiento de inventario inválido'; end if;
    if coalesce(v_costo,0)<0 or coalesce(v_precio,0)<0 then raise exception 'Costo y precio deben ser no negativos'; end if;

    insert into api.t_posiciones_inventario(
      f_uuid_producto,f_uuid_sucursal,f_disponible,f_reservado,f_minimo_reorden,
      f_lote,f_fecha_vencimiento,f_costo,f_precio,f_actualizado_en,f_fuente,
      f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
    ) values(
      v_producto,v_sucursal_uuid,v_disponible,0,v_minimo,
      v_lote,v_vencimiento,v_costo,v_precio,now(),'manual_product_create',
      v_email,v_rnc,v_empresa,v_sucursal_id,v_app
    );
  end loop;

  insert into api.t_eventos_auditoria(
    f_uuid_actor,f_tipo_evento,f_tipo_entidad,f_uuid_entidad,f_uuid_correlacion,
    f_metadatos_seguros,f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
  ) values(
    p_actor_uuid,'inventory.product_created','product',v_producto,gen_random_uuid(),
    jsonb_build_object('code',trim(p_codigo),'initialBranchPositions',jsonb_array_length(coalesce(p_posiciones,'[]'::jsonb))),
    v_email,v_rnc,v_empresa,v_sucursal,v_app
  );
  return v_producto;
exception
  when unique_violation then raise exception 'Código de producto ya existe';
end $$;

revoke all on function api.fn_consultar_inventario(integer,integer,integer,text,text,text,integer,integer) from public,anon,authenticated;
revoke all on function api.fn_crear_producto_inventario(uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function api.fn_consultar_inventario(integer,integer,integer,text,text,text,integer,integer) to service_role;
grant execute on function api.fn_crear_producto_inventario(uuid,text,text,text,jsonb) to service_role;

commit;
