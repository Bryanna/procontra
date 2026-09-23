-- Numeración secuencial e inmutable para recetas de continuidad.
begin;

create or replace function api.fn_asignar_numero_receta_secuencial()
returns trigger language plpgsql set search_path=api,public as $$
begin
  new.f_numero_receta := 'RECETA-'
    || to_char(current_timestamp at time zone 'America/Santo_Domingo','YYYY')
    || '-'
    || lpad(new.f_id_secuencia::text,6,'0');
  return new;
end; $$;

drop trigger if exists tg_t_planes_seguimiento_numero_receta on api.t_planes_seguimiento;
create trigger tg_t_planes_seguimiento_numero_receta
before insert on api.t_planes_seguimiento
for each row execute function api.fn_asignar_numero_receta_secuencial();

update api.t_planes_seguimiento
set f_numero_receta='RECETA-'
  || to_char(f_creado_en at time zone 'America/Santo_Domingo','YYYY')
  || '-'
  || lpad(f_id_secuencia::text,6,'0')
where nullif(trim(coalesce(f_numero_receta,'')),'') is null;

create unique index if not exists ux_t_planes_seguimiento_numero_receta_secuencial
  on api.t_planes_seguimiento(f_numero_receta)
  where f_numero_receta ~ '^RECETA-[0-9]{4}-[0-9]{6,}$';

alter table api.t_planes_seguimiento alter column f_numero_receta set not null;

create or replace function api.fn_crear_plan_seguimiento(
  p_empresa integer,p_sucursal integer,p_app integer,p_email text,p_rnc text,p_usuario uuid,
  p_uuid_paciente uuid,p_codigo_ars text,p_fecha_primera_compra date,p_medicamentos text,
  p_numero_receta text,p_fecha_receta date,p_items jsonb,p_canales_recordatorio text[],
  p_medico text default null,p_numero_caso text default null,p_observaciones text default null,
  p_programacion_modo text default 'ars_rule',p_cantidad_recetas integer default null,
  p_numero_receta_actual integer default 1,p_fecha_ultima_compra date default null,
  p_proxima_compra date default null,p_fecha_contacto date default null
) returns uuid language plpgsql security definer set search_path=api,public as $$
declare
  v_regla api.t_reglas_ars%rowtype;
  v_uuid uuid;
  v_numero_receta text;
  v_paciente record;
  v_manual boolean;
  v_item jsonb;
  v_posicion integer;
  v_resumen text;
  v_uuid_sucursal uuid;
  v_hoy date:=(current_timestamp at time zone 'America/Santo_Domingo')::date;
begin
  if p_fecha_primera_compra is null or p_fecha_primera_compra>v_hoy then raise exception 'Fecha de primera compra inválida'; end if;
  if p_fecha_receta is null or p_fecha_receta>v_hoy then raise exception 'Fecha de receta inválida'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'Renglones de receta requeridos'; end if;
  if coalesce(cardinality(p_canales_recordatorio),0) not between 1 and 2
     or not p_canales_recordatorio <@ array['call','whatsapp']::text[]
     or cardinality(p_canales_recordatorio)<>cardinality(array(select distinct unnest(p_canales_recordatorio))) then
    raise exception 'Canales de recordatorio inválidos';
  end if;

  v_posicion:=0;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_posicion:=v_posicion+1;
    if length(trim(coalesce(v_item->>'medicine','')))<2 then raise exception 'Renglones de receta inválidos'; end if;
    if v_item ? 'quantity' and v_item->>'quantity' is not null and
       ((v_item->>'quantity') !~ '^[0-9]+([.][0-9]+)?$' or (v_item->>'quantity')::numeric<=0 or (v_item->>'quantity')::numeric>999999) then
      raise exception 'Renglones de receta inválidos';
    end if;
  end loop;

  select string_agg(trim(item.value->>'medicine'),', ' order by item.ordinality)
  into v_resumen from jsonb_array_elements(p_items) with ordinality as item(value,ordinality);
  if length(v_resumen)>2000 then raise exception 'Medicamentos requeridos'; end if;

  select f_uuid into v_paciente from api.t_pacientes
  where f_uuid=p_uuid_paciente and f_idempresa=p_empresa and f_app=p_app and f_activo=true;
  if not found then raise exception 'Paciente no disponible'; end if;
  select * into v_regla from api.t_reglas_ars
  where f_codigo=p_codigo_ars and f_activa=true and f_idempresa=0 and f_app=0;
  if not found then raise exception 'ARS no configurada'; end if;
  if v_regla.f_modo='case_number' and length(trim(coalesce(p_numero_caso,'')))<2 then
    raise exception 'Número de caso requerido para IDOPPRIL';
  end if;

  v_manual:=v_regla.f_modo='monthly' and p_programacion_modo='manual';
  if v_manual and (
    coalesce(p_cantidad_recetas,0) not between 1 and 24 or
    coalesce(p_numero_receta_actual,0) not between 1 and p_cantidad_recetas or
    p_fecha_ultima_compra is null or p_fecha_ultima_compra<p_fecha_primera_compra or
    p_proxima_compra is null or p_proxima_compra<p_fecha_ultima_compra
  ) then raise exception 'Programación manual inválida'; end if;

  insert into api.t_planes_seguimiento(
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app,f_uuid_paciente,f_uuid_regla_ars,
    f_medicamentos,f_numero_receta,f_fecha_receta,f_canales_recordatorio,f_dias_anticipacion_recordatorio,
    f_medico,f_numero_caso,f_fecha_primera_compra,f_fecha_ultima_compra,f_numero_receta_actual,
    f_proxima_compra,f_fecha_contacto,f_programacion_modo,f_cantidad_recetas_plan,f_observaciones,f_creado_por
  ) values (
    p_email,p_rnc,p_empresa,p_sucursal,p_app,p_uuid_paciente,v_regla.f_uuid,
    v_resumen,'AUTO',p_fecha_receta,p_canales_recordatorio,3,
    nullif(trim(coalesce(p_medico,'')),''),nullif(trim(coalesce(p_numero_caso,'')),''),p_fecha_primera_compra,
    case when v_manual then p_fecha_ultima_compra else p_fecha_primera_compra end,
    case when v_manual then p_numero_receta_actual else 1 end,
    case when v_manual then p_proxima_compra when v_regla.f_modo='monthly' then api.fn_fecha_mensual(p_fecha_primera_compra,1) end,
    case when v_manual then (p_proxima_compra-interval '3 days')::date
         when v_regla.f_modo='monthly' then (api.fn_fecha_mensual(p_fecha_primera_compra,1)-interval '3 days')::date end,
    case when v_manual then 'manual' else 'ars_rule' end,case when v_manual then p_cantidad_recetas end,
    nullif(trim(coalesce(p_observaciones,'')),''),p_usuario
  ) returning f_uuid,f_numero_receta into v_uuid,v_numero_receta;

  insert into api.t_items_receta_seguimiento(
    f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app,f_uuid_plan,f_posicion,
    f_medicamento,f_dosis,f_cantidad,f_creado_por
  )
  select p_email,p_rnc,p_empresa,p_sucursal,p_app,v_uuid,item.ordinality::smallint,
    trim(item.value->>'medicine'),nullif(trim(coalesce(item.value->>'dosage','')),''),
    case when item.value->>'quantity' is null then null else (item.value->>'quantity')::numeric end,p_usuario
  from jsonb_array_elements(p_items) with ordinality as item(value,ordinality);

  select f_uuid into v_uuid_sucursal from api.t_sucursales
  where f_idempresa=p_empresa and f_app=p_app and f_idsucursal=p_sucursal limit 1;
  insert into api.t_eventos_auditoria(
    f_uuid_actor,f_uuid_sucursal,f_tipo_evento,f_tipo_entidad,f_uuid_entidad,f_uuid_correlacion,
    f_metadatos_seguros,f_email_principal,f_rnc_principal,f_idempresa,f_idsucursal,f_app
  ) values (
    p_usuario,v_uuid_sucursal,'follow_up.plan_registered','follow_up_plan',v_uuid,v_uuid,
    jsonb_build_object('prescriptionNumber',v_numero_receta,'prescriptionDate',p_fecha_receta,
      'itemCount',jsonb_array_length(p_items),'reminderChannels',to_jsonb(p_canales_recordatorio),'reminderLeadDays',3),
    p_email,p_rnc,p_empresa,p_sucursal,p_app
  );
  return v_uuid;
end; $$;

commit;
