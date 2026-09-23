begin;

create or replace function api.fn_consultar_planes_seguimiento(
  p_empresa integer,p_app integer,p_busqueda text default '',p_estado text default 'all',p_codigo_ars text default '',
  p_codigo_sucursal text default '',p_limite integer default 25,p_desplazamiento integer default 0
) returns table(
  f_uuid uuid,f_uuid_paciente uuid,f_nombre_completo text,f_telefono text,f_ars text,f_codigo_ars text,
  f_cantidad_recetas smallint,f_modo text,f_sucursal text,f_codigo_sucursal text,f_medicamentos text,f_medico text,
  f_numero_caso text,f_fecha_primera_compra date,f_fecha_ultima_compra date,f_numero_receta_actual smallint,
  f_proxima_compra date,f_fecha_contacto date,f_estado text,f_ultimo_resultado text,f_total_registros bigint
) language sql stable security definer set search_path=api,public as $$
  with parametros as (
    select (current_timestamp at time zone 'America/Santo_Domingo')::date as hoy
  ), filtrados as (
    select pl.*,pa.f_nombre_completo,pa.f_telefono,r.f_nombre as ars,r.f_codigo as codigo_ars,
      coalesce(pl.f_cantidad_recetas_plan,r.f_cantidad_recetas)::smallint as cantidad_recetas,r.f_modo,
      s.f_nombre as sucursal,s.f_codigo as codigo_sucursal
    from api.t_planes_seguimiento pl
    cross join parametros x
    join api.t_pacientes pa on pa.f_uuid=pl.f_uuid_paciente and pa.f_idempresa=pl.f_idempresa and pa.f_app=pl.f_app
    join api.t_reglas_ars r on r.f_uuid=pl.f_uuid_regla_ars
    left join api.t_sucursales s on s.f_uuid=pa.f_uuid_sucursal_preferida and s.f_idempresa=pl.f_idempresa and s.f_app=pl.f_app
    where pl.f_idempresa=p_empresa and pl.f_app=p_app
      and case coalesce(p_estado,'all')
        when 'contact_today' then pl.f_estado='active' and pl.f_fecha_contacto=x.hoy
        when 'overdue' then pl.f_estado='active' and pl.f_fecha_contacto<x.hoy
        when 'next_7_days' then pl.f_estado='active' and pl.f_fecha_contacto>x.hoy and pl.f_fecha_contacto<=x.hoy+interval '7 days'
        when 'all' then true
        else pl.f_estado=p_estado
      end
      and (p_codigo_ars='' or r.f_codigo=p_codigo_ars)
      and (p_codigo_sucursal='' or s.f_codigo=p_codigo_sucursal)
      and (trim(p_busqueda)='' or pa.f_nombre_completo ilike '%'||trim(p_busqueda)||'%' or pa.f_telefono ilike '%'||trim(p_busqueda)||'%' or pl.f_medicamentos ilike '%'||trim(p_busqueda)||'%')
  )
  select f_uuid,f_uuid_paciente,f_nombre_completo,f_telefono,ars,codigo_ars,cantidad_recetas,f_modo,sucursal,codigo_sucursal,
    f_medicamentos,f_medico,f_numero_caso,f_fecha_primera_compra,f_fecha_ultima_compra,f_numero_receta_actual,
    f_proxima_compra,f_fecha_contacto,f_estado,f_ultimo_resultado,count(*) over()
  from filtrados
  order by f_fecha_contacto nulls last,f_nombre_completo
  limit greatest(1,least(p_limite,100)) offset greatest(p_desplazamiento,0);
$$;

notify pgrst, 'reload schema';

commit;
