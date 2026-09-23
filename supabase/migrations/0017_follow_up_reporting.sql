-- Reporte operativo de seguimiento y separación explícita de datos demostrativos.
alter table api.t_planes_seguimiento
  add column if not exists f_es_prueba boolean not null default false,
  add column if not exists f_fuente_referencia varchar(260);

create index if not exists ix_t_planes_seguimiento_reporte
  on api.t_planes_seguimiento(f_idempresa,f_app,f_es_prueba,f_fecha_contacto);

create or replace function api.fn_reporte_seguimiento(
  p_empresa integer,
  p_app integer,
  p_busqueda text default '',
  p_codigo_sucursal text default '',
  p_resultado text default 'all',
  p_datos text default 'all',
  p_desde date default null,
  p_hasta date default null,
  p_limite integer default 50,
  p_desplazamiento integer default 0
) returns table(
  f_uuid uuid,
  f_nombre_completo text,
  f_telefono text,
  f_sucursal text,
  f_codigo_sucursal text,
  f_ars text,
  f_medicamentos text,
  f_medico text,
  f_fecha_primera_compra date,
  f_proxima_compra date,
  f_fecha_contacto date,
  f_estado text,
  f_ultimo_resultado text,
  f_total_contactos bigint,
  f_ultimo_contacto_en timestamptz,
  f_es_prueba boolean,
  f_fuente_referencia text,
  f_total_registros bigint
) language sql stable security definer set search_path=api,public as $$
  with base as (
    select
      pl.f_uuid,
      pa.f_nombre_completo,
      pa.f_telefono,
      s.f_nombre as sucursal,
      s.f_codigo as codigo_sucursal,
      r.f_nombre as ars,
      pl.f_medicamentos,
      pl.f_medico,
      pl.f_fecha_primera_compra,
      pl.f_proxima_compra,
      pl.f_fecha_contacto,
      pl.f_estado,
      pl.f_ultimo_resultado,
      count(c.f_uuid) as total_contactos,
      max(c.f_fecha_contacto) as ultimo_contacto_en,
      pl.f_es_prueba,
      pl.f_fuente_referencia
    from api.t_planes_seguimiento pl
    join api.t_pacientes pa
      on pa.f_uuid=pl.f_uuid_paciente
      and pa.f_idempresa=pl.f_idempresa
      and pa.f_app=pl.f_app
    join api.t_reglas_ars r on r.f_uuid=pl.f_uuid_regla_ars
    left join api.t_sucursales s
      on s.f_uuid=pa.f_uuid_sucursal_preferida
      and s.f_idempresa=pl.f_idempresa
      and s.f_app=pl.f_app
    left join api.t_contactos_seguimiento c
      on c.f_uuid_plan=pl.f_uuid
      and c.f_idempresa=pl.f_idempresa
      and c.f_app=pl.f_app
    where pl.f_idempresa=p_empresa and pl.f_app=p_app
      and (trim(coalesce(p_busqueda,''))='' or pa.f_nombre_completo ilike '%'||trim(p_busqueda)||'%' or pa.f_telefono ilike '%'||trim(p_busqueda)||'%' or pl.f_medicamentos ilike '%'||trim(p_busqueda)||'%')
      and (coalesce(p_codigo_sucursal,'')='' or s.f_codigo=p_codigo_sucursal)
      and (coalesce(p_resultado,'all')='all' or (p_resultado='sin_contacto' and pl.f_ultimo_resultado is null) or pl.f_ultimo_resultado=p_resultado)
      and (coalesce(p_datos,'all')='all' or (p_datos='test' and pl.f_es_prueba) or (p_datos='operational' and not pl.f_es_prueba))
      and (p_desde is null or coalesce(pl.f_fecha_contacto,pl.f_proxima_compra,pl.f_fecha_primera_compra)>=p_desde)
      and (p_hasta is null or coalesce(pl.f_fecha_contacto,pl.f_proxima_compra,pl.f_fecha_primera_compra)<=p_hasta)
    group by pl.f_uuid,pa.f_nombre_completo,pa.f_telefono,s.f_nombre,s.f_codigo,r.f_nombre
  )
  select base.*,count(*) over() from base
  order by f_fecha_contacto nulls last,f_nombre_completo
  limit greatest(1,least(p_limite,200)) offset greatest(p_desplazamiento,0);
$$;

create or replace function api.fn_resumen_reporte_seguimiento(
  p_empresa integer,
  p_app integer,
  p_busqueda text default '',
  p_codigo_sucursal text default '',
  p_resultado text default 'all',
  p_datos text default 'all',
  p_desde date default null,
  p_hasta date default null
) returns table(
  f_total bigint,
  f_contactar_hoy bigint,
  f_atrasados bigint,
  f_proximos_7_dias bigint,
  f_contactados bigint,
  f_no_contestaron bigint,
  f_sin_receta bigint,
  f_completados bigint
) language sql stable security definer set search_path=api,public as $$
  with base as (
    select pl.*
    from api.t_planes_seguimiento pl
    join api.t_pacientes pa
      on pa.f_uuid=pl.f_uuid_paciente
      and pa.f_idempresa=pl.f_idempresa
      and pa.f_app=pl.f_app
    left join api.t_sucursales s
      on s.f_uuid=pa.f_uuid_sucursal_preferida
      and s.f_idempresa=pl.f_idempresa
      and s.f_app=pl.f_app
    where pl.f_idempresa=p_empresa and pl.f_app=p_app
      and (trim(coalesce(p_busqueda,''))='' or pa.f_nombre_completo ilike '%'||trim(p_busqueda)||'%' or pa.f_telefono ilike '%'||trim(p_busqueda)||'%' or pl.f_medicamentos ilike '%'||trim(p_busqueda)||'%')
      and (coalesce(p_codigo_sucursal,'')='' or s.f_codigo=p_codigo_sucursal)
      and (coalesce(p_resultado,'all')='all' or (p_resultado='sin_contacto' and pl.f_ultimo_resultado is null) or pl.f_ultimo_resultado=p_resultado)
      and (coalesce(p_datos,'all')='all' or (p_datos='test' and pl.f_es_prueba) or (p_datos='operational' and not pl.f_es_prueba))
      and (p_desde is null or coalesce(pl.f_fecha_contacto,pl.f_proxima_compra,pl.f_fecha_primera_compra)>=p_desde)
      and (p_hasta is null or coalesce(pl.f_fecha_contacto,pl.f_proxima_compra,pl.f_fecha_primera_compra)<=p_hasta)
  )
  select
    count(*),
    count(*) filter(where f_estado='active' and f_fecha_contacto=current_date),
    count(*) filter(where f_estado='active' and f_fecha_contacto<current_date),
    count(*) filter(where f_estado='active' and f_fecha_contacto>current_date and f_fecha_contacto<=current_date+7),
    count(*) filter(where f_ultimo_resultado is not null),
    count(*) filter(where f_ultimo_resultado='no_contesto'),
    count(*) filter(where f_ultimo_resultado='no_tiene_receta'),
    count(*) filter(where f_estado='completed')
  from base;
$$;

grant execute on function api.fn_reporte_seguimiento(integer,integer,text,text,text,text,date,date,integer,integer) to service_role;
grant execute on function api.fn_resumen_reporte_seguimiento(integer,integer,text,text,text,text,date,date) to service_role;
notify pgrst,'reload schema';
