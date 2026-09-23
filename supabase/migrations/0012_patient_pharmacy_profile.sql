begin;

alter table api.t_pacientes
  add column if not exists f_identificacion_hash text,
  add column if not exists f_identificacion_mascara text,
  add column if not exists f_nss_cifrado text,
  add column if not exists f_nss_hash text,
  add column if not exists f_nss_mascara text,
  add column if not exists f_fecha_nacimiento date,
  add column if not exists f_telefono_verificado_en timestamptz,
  add column if not exists f_estado_seguimiento text not null default 'green',
  add column if not exists f_canal_contacto_preferido text not null default 'whatsapp';

alter table api.t_pacientes drop constraint if exists ck_t_pacientes_estado_seguimiento;
alter table api.t_pacientes add constraint ck_t_pacientes_estado_seguimiento
  check (f_estado_seguimiento in ('green','yellow','red','clinical'));
alter table api.t_pacientes drop constraint if exists ck_t_pacientes_canal_contacto;
alter table api.t_pacientes add constraint ck_t_pacientes_canal_contacto
  check (f_canal_contacto_preferido in ('whatsapp','call'));
alter table api.t_pacientes drop constraint if exists ck_t_pacientes_fecha_nacimiento;
alter table api.t_pacientes add constraint ck_t_pacientes_fecha_nacimiento
  check (f_fecha_nacimiento is null or (f_fecha_nacimiento >= date '1900-01-01' and f_fecha_nacimiento <= current_date));

create unique index if not exists ux_t_pacientes_tenant_identificacion_hash
  on api.t_pacientes(f_idempresa,f_app,f_identificacion_hash)
  where f_identificacion_hash is not null;
create unique index if not exists ux_t_pacientes_tenant_nss_hash
  on api.t_pacientes(f_idempresa,f_app,f_nss_hash)
  where f_nss_hash is not null;

-- The encryption key is supplied only by the trusted server. Full identifiers are
-- encrypted; user interfaces receive only masks and exact searches use keyed HMAC.
drop function if exists api.fn_consultar_pacientes(integer,integer,text,text,text,integer,integer);
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
  order by f_nombre_completo,f_codigo_interno
  limit greatest(1,least(coalesce(p_limite,25),100))
  offset greatest(coalesce(p_desplazamiento,0),0)
$$;

drop function if exists api.fn_crear_paciente(uuid,text,text,text,text,uuid,boolean);
create or replace function api.fn_crear_paciente(
  p_actor_uuid uuid,
  p_codigo text,
  p_nombre text,
  p_telefono text,
  p_aseguradora text,
  p_uuid_sucursal uuid,
  p_consentimiento boolean,
  p_identificacion text,
  p_nss text,
  p_fecha_nacimiento date,
  p_telefono_verificado boolean,
  p_estado_seguimiento text,
  p_canal_contacto text,
  p_clave_datos text
) returns uuid language plpgsql security definer set search_path=api,public,extensions as $$
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
  v_identificacion text:=nullif(regexp_replace(coalesce(p_identificacion,''),'\D','','g'),'');
  v_nss text:=nullif(regexp_replace(coalesce(p_nss,''),'\D','','g'),'');
  v_identificacion_hash text;
  v_nss_hash text;
begin
  select f_idempresa,f_idsucursal,f_app,f_email_principal,f_rnc_principal,f_rol
    into v_empresa,v_sucursal_actor,v_app,v_email,v_rnc,v_rol
  from api.t_perfiles where f_uuid=p_actor_uuid and f_activo;
  if v_empresa is null or v_rol not in ('administrator','coordinator','attention') then
    raise exception 'Permiso de pacientes requerido';
  end if;
  select f_idsucursal into v_sucursal_paciente from api.t_sucursales
  where f_uuid=p_uuid_sucursal and f_idempresa=v_empresa and f_app=v_app and f_activo;
  if v_sucursal_paciente is null then raise exception 'Sucursal de paciente inválida'; end if;
  if length(trim(coalesce(p_nombre,'')))<3 or length(trim(p_nombre))>240 then raise exception 'Nombre de paciente inválido'; end if;
  if trim(coalesce(p_telefono,'')) !~ '^\+?[0-9]{10,15}$' then raise exception 'Teléfono de paciente inválido'; end if;
  if v_identificacion is not null and v_identificacion !~ '^[0-9]{11}$' then raise exception 'Cédula de paciente inválida'; end if;
  if v_nss is not null and v_nss !~ '^[0-9]{8,12}$' then raise exception 'NSS de paciente inválido'; end if;
  if p_fecha_nacimiento is not null and (p_fecha_nacimiento<date '1900-01-01' or p_fecha_nacimiento>current_date) then raise exception 'Fecha de nacimiento inválida'; end if;
  if coalesce(p_estado_seguimiento,'') not in ('green','yellow','red','clinical') then raise exception 'Estado de seguimiento inválido'; end if;
  if coalesce(p_canal_contacto,'') not in ('whatsapp','call') then raise exception 'Canal de contacto inválido'; end if;
  if length(coalesce(p_clave_datos,''))<32 then raise exception 'Configuración de seguridad no disponible'; end if;

  v_identificacion_hash:=case when v_identificacion is null then null else encode(extensions.hmac(v_identificacion,p_clave_datos,'sha256'),'hex') end;
  v_nss_hash:=case when v_nss is null then null else encode(extensions.hmac(v_nss,p_clave_datos,'sha256'),'hex') end;
  if v_identificacion_hash is not null and exists(select 1 from api.t_pacientes where f_idempresa=v_empresa and f_app=v_app and f_identificacion_hash=v_identificacion_hash) then raise exception 'Cédula de paciente ya registrada'; end if;
  if v_nss_hash is not null and exists(select 1 from api.t_pacientes where f_idempresa=v_empresa and f_app=v_app and f_nss_hash=v_nss_hash) then raise exception 'NSS de paciente ya registrado'; end if;

  v_codigo:=coalesce(nullif(upper(trim(coalesce(p_codigo,''))),''),'PAC-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)));
  if v_codigo !~ '^[A-Z0-9-]{3,60}$' then raise exception 'Código de paciente inválido'; end if;

  insert into api.t_pacientes(
    f_codigo_interno,f_nombre_completo,f_telefono,
    f_identificacion_cifrada,f_identificacion_hash,f_identificacion_mascara,
    f_nss_cifrado,f_nss_hash,f_nss_mascara,f_fecha_nacimiento,f_telefono_verificado_en,
    f_estado_seguimiento,f_canal_contacto_preferido,
    f_uuid_sucursal_preferida,f_aseguradora,f_activo,f_creado_en,f_actualizado_en,
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
  ) values(
    v_codigo,trim(regexp_replace(p_nombre,'\s+',' ','g')),p_telefono,
    case when v_identificacion is null then null else encode(extensions.pgp_sym_encrypt(v_identificacion,p_clave_datos,'cipher-algo=aes256'),'base64') end,
    v_identificacion_hash,case when v_identificacion is null then null else '***-*******-'||right(v_identificacion,1) end,
    case when v_nss is null then null else encode(extensions.pgp_sym_encrypt(v_nss,p_clave_datos,'cipher-algo=aes256'),'base64') end,
    v_nss_hash,case when v_nss is null then null else '***'||right(v_nss,4) end,
    p_fecha_nacimiento,case when coalesce(p_telefono_verificado,false) then now() else null end,
    p_estado_seguimiento,p_canal_contacto,
    p_uuid_sucursal,nullif(trim(coalesce(p_aseguradora,'')),''),true,now(),now(),
    v_email,v_rnc,v_empresa,v_sucursal_paciente,v_app
  ) returning f_uuid into v_paciente;

  if coalesce(p_consentimiento,false) then
    insert into api.t_consentimientos(
      f_uuid_paciente,f_canal,f_propositos,f_estado,f_version_politica,
      f_otorgado_en,f_exclusion_en,f_uuid_actor,f_creado_en,
      f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
    ) values(
      v_paciente,p_canal_contacto,array['continuity','reminders'],'active','2026-01',
      now(),null,p_actor_uuid,now(),v_email,v_rnc,v_empresa,v_sucursal_paciente,v_app
    );
  end if;
  return v_paciente;
exception
  when unique_violation then raise exception 'Registro de paciente duplicado';
end $$;

revoke all on function api.fn_consultar_pacientes(integer,integer,text,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function api.fn_consultar_pacientes(integer,integer,text,text,text,text,integer,integer) to service_role;
revoke all on function api.fn_crear_paciente(uuid,text,text,text,text,uuid,boolean,text,text,date,boolean,text,text,text) from public,anon,authenticated;
grant execute on function api.fn_crear_paciente(uuid,text,text,text,text,uuid,boolean,text,text,date,boolean,text,text,text) to service_role;

commit;
