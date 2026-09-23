begin;

drop function if exists api.fn_resumen_pacientes(integer,integer);
create or replace function api.fn_resumen_pacientes(
  p_empresa integer,
  p_app integer
) returns table(
  f_total_pacientes bigint,
  f_pacientes_activos bigint,
  f_pacientes_inactivos bigint,
  f_consentimientos_vigentes bigint,
  f_sin_consentimiento_vigente bigint,
  f_continuidad_activa bigint,
  f_alertas_pendientes bigint,
  f_nuevos_mes bigint,
  f_con_sucursal_preferida bigint
) language sql stable security definer set search_path=api,public as $$
  with pacientes_tenant as (
    select p.f_uuid,p.f_activo,p.f_creado_en,p.f_uuid_sucursal_preferida,
      (select c.f_estado from api.t_consentimientos c
       where c.f_uuid_paciente=p.f_uuid and c.f_idempresa=p_empresa and c.f_app=p_app
       order by c.f_creado_en desc,c.f_id desc limit 1) as estado_consentimiento
    from api.t_pacientes p
    where p.f_idempresa=p_empresa and p.f_app=p_app
  )
  select
    (select count(*) from pacientes_tenant),
    (select count(*) from pacientes_tenant where f_activo),
    (select count(*) from pacientes_tenant where not f_activo),
    (select count(*) from pacientes_tenant where estado_consentimiento='active'),
    (select count(*) from pacientes_tenant where estado_consentimiento is distinct from 'active'),
    (select count(*) from pacientes_tenant p where exists (
      select 1 from api.t_ciclos_continuidad cc
      where cc.f_uuid_paciente=p.f_uuid and cc.f_idempresa=p_empresa and cc.f_app=p_app and cc.f_estado='active'
    )),
    (select count(*) from api.t_alertas a
      join api.t_ciclos_continuidad cc on cc.f_uuid=a.f_uuid_ciclo and cc.f_idempresa=a.f_idempresa and cc.f_app=a.f_app
      join pacientes_tenant p on p.f_uuid=cc.f_uuid_paciente
      where a.f_idempresa=p_empresa and a.f_app=p_app and a.f_estado in ('scheduled','stock_review','ready')),
    (select count(*) from pacientes_tenant where f_creado_en>=date_trunc('month',current_timestamp)),
    (select count(*) from pacientes_tenant where f_uuid_sucursal_preferida is not null)
$$;

create or replace function api.fn_crear_paciente(
  p_actor_uuid uuid,
  p_codigo text,
  p_nombre text,
  p_telefono text,
  p_aseguradora text,
  p_uuid_sucursal uuid,
  p_consentimiento boolean default false
) returns uuid language plpgsql security definer set search_path=api,public as $$
declare
  v_empresa integer;
  v_sucursal_actor integer;
  v_sucursal_paciente integer;
  v_app integer;
  v_email varchar(180);
  v_rnc varchar(20);
  v_rol text;
  v_paciente uuid;
  v_codigo text;
begin
  select f_idempresa,f_idsucursal,f_app,f_email_principal,f_rnc_principal,f_rol
    into v_empresa,v_sucursal_actor,v_app,v_email,v_rnc,v_rol
  from api.t_perfiles
  where f_uuid=p_actor_uuid and f_activo;
  if v_empresa is null or v_rol not in ('administrator','coordinator','attention') then
    raise exception 'Permiso de pacientes requerido';
  end if;
  select f_idsucursal into v_sucursal_paciente from api.t_sucursales
  where f_uuid=p_uuid_sucursal and f_idempresa=v_empresa and f_app=v_app and f_activo;
  if v_sucursal_paciente is null then raise exception 'Sucursal de paciente inválida'; end if;
  if length(trim(coalesce(p_nombre,'')))<3 or length(trim(p_nombre))>240 then raise exception 'Nombre de paciente inválido'; end if;
  if trim(coalesce(p_telefono,'')) !~ '^\+?[0-9]{10,15}$' then raise exception 'Teléfono de paciente inválido'; end if;
  v_codigo:=coalesce(nullif(upper(trim(coalesce(p_codigo,''))),''),'PAC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));
  if v_codigo !~ '^[A-Z0-9-]{3,60}$' then raise exception 'Código de paciente inválido'; end if;

  insert into api.t_pacientes(
    f_codigo_interno,f_nombre_completo,f_telefono,f_identificacion_cifrada,
    f_uuid_sucursal_preferida,f_aseguradora,f_activo,f_creado_en,f_actualizado_en,
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
  ) values(
    v_codigo,trim(regexp_replace(p_nombre,'\s+',' ','g')),p_telefono,null,
    p_uuid_sucursal,nullif(trim(coalesce(p_aseguradora,'')),''),true,now(),now(),
    v_email,v_rnc,v_empresa,v_sucursal_paciente,v_app
  ) returning f_uuid into v_paciente;

  if coalesce(p_consentimiento,false) then
    insert into api.t_consentimientos(
      f_uuid_paciente,f_canal,f_propositos,f_estado,f_version_politica,
      f_otorgado_en,f_exclusion_en,f_uuid_actor,f_creado_en,
      f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
    ) values(
      v_paciente,'whatsapp',array['continuity','reminders'],'active','2026-01',
      now(),null,p_actor_uuid,now(),v_email,v_rnc,v_empresa,v_sucursal_paciente,v_app
    );
  end if;
  return v_paciente;
exception
  when unique_violation then raise exception 'Código de paciente ya existe';
end $$;

revoke all on function api.fn_crear_paciente(uuid,text,text,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function api.fn_crear_paciente(uuid,text,text,text,text,uuid,boolean) to service_role;

commit;
