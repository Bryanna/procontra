begin;

create or replace function api.fn_consultar_pacientes(
  p_empresa integer,
  p_app integer,
  p_clave_datos text,
  p_busqueda text default '',
  p_filtro text default 'all',
  p_codigo_sucursal text default '',
  p_limite integer default 25,
  p_desplazamiento integer default 0
) returns table(
  f_uuid uuid,
  f_codigo_interno text,
  f_nombre_completo text,
  f_telefono text,
  f_identificacion_mascara text,
  f_nss_mascara text,
  f_fecha_nacimiento date,
  f_telefono_verificado boolean,
  f_aseguradora text,
  f_estado_seguimiento text,
  f_canal_contacto_preferido text,
  f_sucursal text,
  f_codigo_sucursal text,
  f_activo boolean,
  f_estado_consentimiento text,
  f_creado_en timestamptz,
  f_total_registros bigint
) language sql stable security definer set search_path=api,public,extensions as $$
  with parametros as (
    select trim(coalesce(p_busqueda,'')) as busqueda,
      regexp_replace(coalesce(p_busqueda,''),'\D','','g') as busqueda_digitos
  ), pacientes_base as (
    select
      p.f_uuid,p.f_codigo_interno,p.f_nombre_completo,p.f_telefono,
      p.f_identificacion_mascara,p.f_nss_mascara,p.f_fecha_nacimiento,
      p.f_telefono_verificado_en is not null as telefono_verificado,
      p.f_aseguradora,p.f_estado_seguimiento,p.f_canal_contacto_preferido,
      s.f_nombre as sucursal,s.f_codigo as codigo_sucursal,p.f_activo,
      c.f_estado as estado_consentimiento,p.f_creado_en
    from api.t_pacientes p
    cross join parametros q
    left join api.t_sucursales s
      on s.f_uuid=p.f_uuid_sucursal_preferida
      and s.f_idempresa=p.f_idempresa and s.f_app=p.f_app
    left join lateral (
      select c1.f_estado from api.t_consentimientos c1
      where c1.f_uuid_paciente=p.f_uuid
        and c1.f_idempresa=p.f_idempresa and c1.f_app=p.f_app
      order by c1.f_creado_en desc,c1.f_id desc limit 1
    ) c on true
    where p.f_idempresa=p_empresa and p.f_app=p_app
      and (coalesce(trim(p_codigo_sucursal),'')='' or s.f_codigo=trim(p_codigo_sucursal))
      and (q.busqueda=''
        or p.f_codigo_interno ilike '%'||q.busqueda||'%'
        or p.f_nombre_completo ilike '%'||q.busqueda||'%'
        or p.f_telefono ilike '%'||q.busqueda||'%'
        or coalesce(p.f_aseguradora,'') ilike '%'||q.busqueda||'%'
        or (length(coalesce(p_clave_datos,''))>=32 and length(q.busqueda_digitos)=11
          and p.f_identificacion_hash=encode(extensions.hmac(q.busqueda_digitos,p_clave_datos,'sha256'),'hex'))
        or (length(coalesce(p_clave_datos,''))>=32 and length(q.busqueda_digitos) between 8 and 12
          and p.f_nss_hash=encode(extensions.hmac(q.busqueda_digitos,p_clave_datos,'sha256'),'hex')))
  ), pacientes_filtrados as (
    select * from pacientes_base where case coalesce(p_filtro,'all')
      when 'today' then
        f_creado_en >= (date_trunc('day',current_timestamp at time zone 'America/Santo_Domingo') at time zone 'America/Santo_Domingo')
        and f_creado_en < ((date_trunc('day',current_timestamp at time zone 'America/Santo_Domingo') + interval '1 day') at time zone 'America/Santo_Domingo')
      when 'active' then f_activo
      when 'inactive' then not f_activo
      when 'with_consent' then estado_consentimiento='active'
      when 'without_consent' then estado_consentimiento is distinct from 'active'
      else true end
  )
  select f_uuid,f_codigo_interno,f_nombre_completo,f_telefono,
    f_identificacion_mascara,f_nss_mascara,f_fecha_nacimiento,telefono_verificado,
    f_aseguradora,f_estado_seguimiento,f_canal_contacto_preferido,
    sucursal,codigo_sucursal,f_activo,estado_consentimiento,f_creado_en,count(*) over()
  from pacientes_filtrados
  order by case when coalesce(p_filtro,'all')='today' then f_creado_en end desc,
    f_nombre_completo,f_codigo_interno
  limit greatest(1,least(coalesce(p_limite,25),100))
  offset greatest(coalesce(p_desplazamiento,0),0)
$$;

notify pgrst, 'reload schema';

commit;
