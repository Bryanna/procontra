begin;

create index if not exists ix_t_pacientes_directorio_tenant
  on api.t_pacientes(f_idempresa,f_app,f_activo,f_uuid_sucursal_preferida);
create index if not exists ix_t_consentimientos_paciente_estado
  on api.t_consentimientos(f_idempresa,f_app,f_uuid_paciente,f_estado,f_creado_en desc);
create index if not exists ix_t_ciclos_continuidad_paciente_estado
  on api.t_ciclos_continuidad(f_idempresa,f_app,f_uuid_paciente,f_estado);

create or replace function api.fn_consultar_pacientes(
  p_empresa integer,
  p_app integer,
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
  f_aseguradora text,
  f_sucursal text,
  f_codigo_sucursal text,
  f_activo boolean,
  f_estado_consentimiento text,
  f_creado_en timestamptz,
  f_total_registros bigint
) language sql stable security definer set search_path=api,public as $$
  with pacientes_base as (
    select
      p.f_uuid,
      p.f_codigo_interno,
      p.f_nombre_completo,
      p.f_telefono,
      p.f_aseguradora,
      s.f_nombre as sucursal,
      s.f_codigo as codigo_sucursal,
      p.f_activo,
      c.f_estado as estado_consentimiento,
      p.f_creado_en
    from api.t_pacientes p
    left join api.t_sucursales s
      on s.f_uuid=p.f_uuid_sucursal_preferida
      and s.f_idempresa=p.f_idempresa
      and s.f_app=p.f_app
    left join lateral (
      select c1.f_estado
      from api.t_consentimientos c1
      where c1.f_uuid_paciente=p.f_uuid
        and c1.f_idempresa=p.f_idempresa
        and c1.f_app=p.f_app
      order by c1.f_creado_en desc,c1.f_id desc
      limit 1
    ) c on true
    where p.f_idempresa=p_empresa and p.f_app=p_app
      and (coalesce(trim(p_codigo_sucursal),'')='' or s.f_codigo=trim(p_codigo_sucursal))
      and (coalesce(trim(p_busqueda),'')=''
        or p.f_codigo_interno ilike '%'||trim(p_busqueda)||'%'
        or p.f_nombre_completo ilike '%'||trim(p_busqueda)||'%'
        or p.f_telefono ilike '%'||trim(p_busqueda)||'%'
        or coalesce(p.f_aseguradora,'') ilike '%'||trim(p_busqueda)||'%')
  ), pacientes_filtrados as (
    select * from pacientes_base where case coalesce(p_filtro,'all')
      when 'active' then f_activo
      when 'inactive' then not f_activo
      when 'with_consent' then estado_consentimiento='active'
      when 'without_consent' then estado_consentimiento is distinct from 'active'
      else true end
  )
  select
    f_uuid,f_codigo_interno,f_nombre_completo,f_telefono,f_aseguradora,
    sucursal,codigo_sucursal,f_activo,estado_consentimiento,f_creado_en,
    count(*) over()
  from pacientes_filtrados
  order by f_nombre_completo,f_codigo_interno
  limit greatest(1,least(coalesce(p_limite,25),100))
  offset greatest(coalesce(p_desplazamiento,0),0)
$$;

create or replace function api.fn_resumen_pacientes(
  p_empresa integer,
  p_app integer
) returns table(
  f_total_pacientes bigint,
  f_pacientes_activos bigint,
  f_consentimientos_vigentes bigint,
  f_continuidad_activa bigint,
  f_alertas_pendientes bigint
) language sql stable security definer set search_path=api,public as $$
  with pacientes_tenant as (
    select p.f_uuid,p.f_activo
    from api.t_pacientes p
    where p.f_idempresa=p_empresa and p.f_app=p_app
  )
  select
    (select count(*) from pacientes_tenant),
    (select count(*) from pacientes_tenant where f_activo),
    (select count(*) from pacientes_tenant p where exists (
      select 1 from api.t_consentimientos c
      where c.f_uuid_paciente=p.f_uuid and c.f_idempresa=p_empresa and c.f_app=p_app and c.f_estado='active'
    )),
    (select count(*) from pacientes_tenant p where exists (
      select 1 from api.t_ciclos_continuidad cc
      where cc.f_uuid_paciente=p.f_uuid and cc.f_idempresa=p_empresa and cc.f_app=p_app and cc.f_estado='active'
    )),
    (select count(*) from api.t_alertas a
      join api.t_ciclos_continuidad cc on cc.f_uuid=a.f_uuid_ciclo
        and cc.f_idempresa=a.f_idempresa and cc.f_app=a.f_app
      join pacientes_tenant p on p.f_uuid=cc.f_uuid_paciente
      where a.f_idempresa=p_empresa and a.f_app=p_app
        and a.f_estado in ('scheduled','stock_review','ready'))
$$;

revoke all on function api.fn_consultar_pacientes(integer,integer,text,text,text,integer,integer) from public,anon,authenticated;
revoke all on function api.fn_resumen_pacientes(integer,integer) from public,anon,authenticated;
grant execute on function api.fn_consultar_pacientes(integer,integer,text,text,text,integer,integer) to service_role;
grant execute on function api.fn_resumen_pacientes(integer,integer) to service_role;

commit;
