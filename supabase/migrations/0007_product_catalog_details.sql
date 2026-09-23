begin;

alter table api.t_productos
  add column if not exists f_codigo_barras character varying(14),
  add column if not exists f_principio_activo character varying(200),
  add column if not exists f_fabricante character varying(160),
  add column if not exists f_categoria character varying(120),
  add column if not exists f_unidad_medida character varying(60),
  add column if not exists f_registro_sanitario character varying(100),
  add column if not exists f_requiere_receta boolean not null default false,
  add column if not exists f_actualizado_en timestamp with time zone not null default now();

alter table api.t_productos
  drop constraint if exists ck_t_productos_codigo_barras;
alter table api.t_productos
  add constraint ck_t_productos_codigo_barras
  check (f_codigo_barras is null or f_codigo_barras ~ '^[0-9]{8,14}$');

create unique index if not exists ux_t_productos_tenant_codigo_barras
  on api.t_productos(f_idempresa,f_app,f_codigo_barras)
  where f_codigo_barras is not null;
create index if not exists ix_t_productos_busqueda_detallada
  on api.t_productos(f_idempresa,f_app,f_categoria,f_fabricante);

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
    select i.f_uuid_producto,s.f_codigo,
      sum(i.f_disponible) as disponible,
      sum(i.f_reservado) as reservado,
      sum(i.f_disponible-i.f_reservado) as existencia,
      max(i.f_minimo_reorden) as minimo,
      max(i.f_actualizado_en) as actualizado_en
    from api.t_posiciones_inventario i
    join api.t_sucursales s on s.f_uuid=i.f_uuid_sucursal
      and s.f_idempresa=i.f_idempresa and s.f_app=i.f_app
    where i.f_idempresa=p_empresa and i.f_app=p_app
    group by i.f_uuid_producto,s.f_codigo
  ), existencias as (
    select f_uuid_producto,
      jsonb_object_agg(f_codigo,jsonb_build_object(
        'onHand',disponible,'reserved',reservado,'available',existencia,'updatedAt',actualizado_en
      ) order by f_codigo) as por_sucursal
    from posiciones_sucursal group by f_uuid_producto
  ), estado as (
    select p.f_uuid,p.f_codigo,p.f_nombre,p.f_presentacion,
      coalesce(e.por_sucursal,'{}'::jsonb) as existencias,
      case
        when count(ps.*)=0 then 'no_data'
        when coalesce(sum(ps.existencia),0)<=0 then 'out_of_stock'
        when bool_or(ps.existencia>0 and ps.existencia<=ps.minimo) then 'low_stock'
        else 'available'
      end as estado
    from api.t_productos p
    left join existencias e on e.f_uuid_producto=p.f_uuid
    left join posiciones_sucursal ps on ps.f_uuid_producto=p.f_uuid
      and (coalesce(trim(p_codigo_sucursal),'')='' or ps.f_codigo=trim(p_codigo_sucursal))
    where p.f_idempresa=p_empresa and p.f_idsucursal=p_sucursal and p.f_app=p_app and p.f_activo
      and (coalesce(trim(p_busqueda),'')=''
        or p.f_codigo ilike '%'||trim(p_busqueda)||'%'
        or p.f_nombre ilike '%'||trim(p_busqueda)||'%'
        or coalesce(p.f_presentacion,'') ilike '%'||trim(p_busqueda)||'%'
        or coalesce(p.f_codigo_barras,'') ilike '%'||trim(p_busqueda)||'%'
        or coalesce(p.f_principio_activo,'') ilike '%'||trim(p_busqueda)||'%'
        or coalesce(p.f_fabricante,'') ilike '%'||trim(p_busqueda)||'%'
        or coalesce(p.f_categoria,'') ilike '%'||trim(p_busqueda)||'%'
        or coalesce(p.f_registro_sanitario,'') ilike '%'||trim(p_busqueda)||'%')
    group by p.f_uuid,p.f_codigo,p.f_nombre,p.f_presentacion,e.por_sucursal
  ), filtrado as (
    select * from estado where case coalesce(p_filtro,'all')
      when 'with_stock' then estado in ('available','low_stock')
      when 'low_stock' then estado='low_stock'
      when 'out_of_stock' then estado='out_of_stock'
      when 'without_data' then estado='no_data'
      else true end
  )
  select f_uuid,f_codigo,f_nombre,f_presentacion,existencias,estado,count(*) over()
  from filtrado order by f_nombre,f_codigo
  limit greatest(1,least(coalesce(p_limite,25),100))
  offset greatest(coalesce(p_desplazamiento,0),0)
$$;

create or replace function api.fn_crear_producto_inventario_detallado(
  p_actor_uuid uuid,
  p_codigo text,
  p_nombre text,
  p_presentacion text default null,
  p_codigo_barras text default null,
  p_principio_activo text default null,
  p_fabricante text default null,
  p_categoria text default null,
  p_unidad_medida text default null,
  p_registro_sanitario text default null,
  p_requiere_receta boolean default false,
  p_posiciones jsonb default '[]'::jsonb
) returns uuid language plpgsql security definer set search_path=api,public as $$
declare v_producto uuid;
begin
  if nullif(trim(coalesce(p_codigo_barras,'')),'') is not null
     and trim(p_codigo_barras) !~ '^[0-9]{8,14}$' then
    raise exception 'Código de barras inválido';
  end if;
  if length(trim(coalesce(p_principio_activo,'')))>200 then raise exception 'Principio activo inválido'; end if;
  if length(trim(coalesce(p_fabricante,'')))>160 then raise exception 'Fabricante inválido'; end if;
  if length(trim(coalesce(p_categoria,'')))>120 then raise exception 'Categoría inválida'; end if;
  if length(trim(coalesce(p_unidad_medida,'')))>60 then raise exception 'Unidad de medida inválida'; end if;
  if length(trim(coalesce(p_registro_sanitario,'')))>100 then raise exception 'Registro sanitario inválido'; end if;

  v_producto := api.fn_crear_producto_inventario(
    p_actor_uuid,p_codigo,p_nombre,p_presentacion,p_posiciones
  );
  update api.t_productos set
    f_codigo_barras=nullif(trim(coalesce(p_codigo_barras,'')),''),
    f_principio_activo=nullif(upper(trim(coalesce(p_principio_activo,''))),''),
    f_fabricante=nullif(upper(trim(coalesce(p_fabricante,''))),''),
    f_categoria=nullif(upper(trim(coalesce(p_categoria,''))),''),
    f_unidad_medida=nullif(upper(trim(coalesce(p_unidad_medida,''))),''),
    f_registro_sanitario=nullif(upper(trim(coalesce(p_registro_sanitario,''))),''),
    f_requiere_receta=coalesce(p_requiere_receta,false),
    f_actualizado_en=now()
  where f_uuid=v_producto;
  return v_producto;
exception
  when unique_violation then raise exception 'Código de barras ya existe';
end $$;

revoke all on function api.fn_crear_producto_inventario_detallado(uuid,text,text,text,text,text,text,text,text,text,boolean,jsonb) from public,anon,authenticated;
grant execute on function api.fn_crear_producto_inventario_detallado(uuid,text,text,text,text,text,text,text,text,text,boolean,jsonb) to service_role;

commit;
