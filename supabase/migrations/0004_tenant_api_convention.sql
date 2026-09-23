-- Multi-tenant API convention: schema api, t_* tables, f_* fields.
begin;
create schema if not exists api;

create or replace function api.fn_mover_tabla(p_origen text, p_destino text) returns void language plpgsql as $$ begin if to_regclass('public.'||p_origen) is not null and to_regclass('api.'||p_destino) is null then execute format('alter table public.%I set schema api',p_origen); execute format('alter table api.%I rename to %I',p_origen,p_destino); end if; end $$;

select api.fn_mover_tabla('branches','t_sucursales');
select api.fn_mover_tabla('profiles','t_perfiles');
select api.fn_mover_tabla('branch_memberships','t_membresias_sucursales');
select api.fn_mover_tabla('patients','t_pacientes');
select api.fn_mover_tabla('consents','t_consentimientos');
select api.fn_mover_tabla('products','t_productos');
select api.fn_mover_tabla('inventory_positions','t_posiciones_inventario');
select api.fn_mover_tabla('documents','t_documentos');
select api.fn_mover_tabla('dispensations','t_dispensaciones');
select api.fn_mover_tabla('dispensation_items','t_items_dispensacion');
select api.fn_mover_tabla('dispensation_documents','t_documentos_dispensacion');
select api.fn_mover_tabla('inventory_movements','t_movimientos_inventario');
select api.fn_mover_tabla('continuity_cycles','t_ciclos_continuidad');
select api.fn_mover_tabla('alerts','t_alertas');
select api.fn_mover_tabla('reservations','t_reservas');
select api.fn_mover_tabla('tasks','t_tareas');
select api.fn_mover_tabla('audit_events','t_eventos_auditoria');
select api.fn_mover_tabla('outbox_events','t_eventos_salida');

drop function api.fn_mover_tabla(text,text);

create or replace function api.fn_renombrar_columna(p_tabla text,p_origen text,p_destino text) returns void language plpgsql as $$ begin if exists(select 1 from information_schema.columns where table_schema='api' and table_name=p_tabla and column_name=p_origen) and not exists(select 1 from information_schema.columns where table_schema='api' and table_name=p_tabla and column_name=p_destino) then execute format('alter table api.%I rename column %I to %I',p_tabla,p_origen,p_destino); end if; end $$;

select api.fn_renombrar_columna('t_sucursales','id','f_uuid');
select api.fn_renombrar_columna('t_sucursales','code','f_codigo');
select api.fn_renombrar_columna('t_sucursales','name','f_nombre');
select api.fn_renombrar_columna('t_sucursales','address','f_direccion');
select api.fn_renombrar_columna('t_sucursales','active','f_activo');
select api.fn_renombrar_columna('t_sucursales','created_at','f_creado_en');
select api.fn_renombrar_columna('t_perfiles','id','f_uuid');
select api.fn_renombrar_columna('t_perfiles','display_name','f_nombre_mostrar');
select api.fn_renombrar_columna('t_perfiles','role','f_rol');
select api.fn_renombrar_columna('t_perfiles','active','f_activo');
select api.fn_renombrar_columna('t_perfiles','created_at','f_creado_en');
select api.fn_renombrar_columna('t_membresias_sucursales','profile_id','f_uuid_perfil');
select api.fn_renombrar_columna('t_membresias_sucursales','branch_id','f_uuid_sucursal');
select api.fn_renombrar_columna('t_pacientes','id','f_uuid');
select api.fn_renombrar_columna('t_pacientes','internal_code','f_codigo_interno');
select api.fn_renombrar_columna('t_pacientes','full_name','f_nombre_completo');
select api.fn_renombrar_columna('t_pacientes','phone','f_telefono');
select api.fn_renombrar_columna('t_pacientes','government_id_encrypted','f_identificacion_cifrada');
select api.fn_renombrar_columna('t_pacientes','preferred_branch_id','f_uuid_sucursal_preferida');
select api.fn_renombrar_columna('t_pacientes','insurer','f_aseguradora');
select api.fn_renombrar_columna('t_pacientes','active','f_activo');
select api.fn_renombrar_columna('t_pacientes','created_at','f_creado_en');
select api.fn_renombrar_columna('t_pacientes','updated_at','f_actualizado_en');
select api.fn_renombrar_columna('t_consentimientos','id','f_uuid');
select api.fn_renombrar_columna('t_consentimientos','patient_id','f_uuid_paciente');
select api.fn_renombrar_columna('t_consentimientos','channel','f_canal');
select api.fn_renombrar_columna('t_consentimientos','purposes','f_propositos');
select api.fn_renombrar_columna('t_consentimientos','status','f_estado');
select api.fn_renombrar_columna('t_consentimientos','policy_version','f_version_politica');
select api.fn_renombrar_columna('t_consentimientos','granted_at','f_otorgado_en');
select api.fn_renombrar_columna('t_consentimientos','opted_out_at','f_exclusion_en');
select api.fn_renombrar_columna('t_consentimientos','actor_id','f_uuid_actor');
select api.fn_renombrar_columna('t_consentimientos','created_at','f_creado_en');
select api.fn_renombrar_columna('t_productos','id','f_uuid');
select api.fn_renombrar_columna('t_productos','code','f_codigo');
select api.fn_renombrar_columna('t_productos','name','f_nombre');
select api.fn_renombrar_columna('t_productos','presentation','f_presentacion');
select api.fn_renombrar_columna('t_productos','active','f_activo');
select api.fn_renombrar_columna('t_productos','catalog_version','f_version_catalogo');
select api.fn_renombrar_columna('t_productos','created_at','f_creado_en');
select api.fn_renombrar_columna('t_posiciones_inventario','id','f_uuid');
select api.fn_renombrar_columna('t_posiciones_inventario','product_id','f_uuid_producto');
select api.fn_renombrar_columna('t_posiciones_inventario','branch_id','f_uuid_sucursal');
select api.fn_renombrar_columna('t_posiciones_inventario','on_hand','f_disponible');
select api.fn_renombrar_columna('t_posiciones_inventario','reserved','f_reservado');
select api.fn_renombrar_columna('t_posiciones_inventario','reorder_minimum','f_minimo_reorden');
select api.fn_renombrar_columna('t_posiciones_inventario','lot','f_lote');
select api.fn_renombrar_columna('t_posiciones_inventario','expiry_date','f_fecha_vencimiento');
select api.fn_renombrar_columna('t_posiciones_inventario','cost','f_costo');
select api.fn_renombrar_columna('t_posiciones_inventario','price','f_precio');
select api.fn_renombrar_columna('t_posiciones_inventario','updated_at','f_actualizado_en');
select api.fn_renombrar_columna('t_posiciones_inventario','source','f_fuente');
select api.fn_renombrar_columna('t_documentos','id','f_uuid');
select api.fn_renombrar_columna('t_documentos','source_scope','f_ambito_fuente');
select api.fn_renombrar_columna('t_documentos','content_hash','f_hash_contenido');
select api.fn_renombrar_columna('t_documentos','document_type','f_tipo_documento');
select api.fn_renombrar_columna('t_documentos','reference','f_referencia');
select api.fn_renombrar_columna('t_documentos','status','f_estado');
select api.fn_renombrar_columna('t_documentos','storage_path','f_ruta_almacenamiento');
select api.fn_renombrar_columna('t_documentos','patient_id','f_uuid_paciente');
select api.fn_renombrar_columna('t_documentos','branch_id','f_uuid_sucursal');
select api.fn_renombrar_columna('t_documentos','extractor_version','f_version_extractor');
select api.fn_renombrar_columna('t_documentos','created_by','f_uuid_creado_por');
select api.fn_renombrar_columna('t_documentos','created_at','f_creado_en');
select api.fn_renombrar_columna('t_dispensaciones','id','f_uuid');
select api.fn_renombrar_columna('t_dispensaciones','idempotency_key','f_clave_idempotencia');
select api.fn_renombrar_columna('t_dispensaciones','patient_id','f_uuid_paciente');
select api.fn_renombrar_columna('t_dispensaciones','branch_id','f_uuid_sucursal');
select api.fn_renombrar_columna('t_dispensaciones','status','f_estado');
select api.fn_renombrar_columna('t_dispensaciones','posted_at','f_publicado_en');
select api.fn_renombrar_columna('t_dispensaciones','reversed_from_id','f_uuid_reversion_origen');
select api.fn_renombrar_columna('t_dispensaciones','created_by','f_uuid_creado_por');
select api.fn_renombrar_columna('t_dispensaciones','created_at','f_creado_en');
select api.fn_renombrar_columna('t_items_dispensacion','id','f_uuid');
select api.fn_renombrar_columna('t_items_dispensacion','dispensation_id','f_uuid_dispensacion');
select api.fn_renombrar_columna('t_items_dispensacion','product_id','f_uuid_producto');
select api.fn_renombrar_columna('t_items_dispensacion','quantity','f_cantidad');
select api.fn_renombrar_columna('t_items_dispensacion','units_per_day','f_unidades_por_dia');
select api.fn_renombrar_columna('t_items_dispensacion','directions_verified','f_indicaciones_verificadas');
select api.fn_renombrar_columna('t_documentos_dispensacion','dispensation_id','f_uuid_dispensacion');
select api.fn_renombrar_columna('t_documentos_dispensacion','document_id','f_uuid_documento');
select api.fn_renombrar_columna('t_movimientos_inventario','id','f_uuid');
select api.fn_renombrar_columna('t_movimientos_inventario','dispensation_id','f_uuid_dispensacion');
select api.fn_renombrar_columna('t_movimientos_inventario','product_id','f_uuid_producto');
select api.fn_renombrar_columna('t_movimientos_inventario','branch_id','f_uuid_sucursal');
select api.fn_renombrar_columna('t_movimientos_inventario','movement_type','f_tipo_movimiento');
select api.fn_renombrar_columna('t_movimientos_inventario','quantity','f_cantidad');
select api.fn_renombrar_columna('t_movimientos_inventario','approved_by','f_uuid_aprobado_por');
select api.fn_renombrar_columna('t_movimientos_inventario','created_at','f_creado_en');
select api.fn_renombrar_columna('t_ciclos_continuidad','id','f_uuid');
select api.fn_renombrar_columna('t_ciclos_continuidad','patient_id','f_uuid_paciente');
select api.fn_renombrar_columna('t_ciclos_continuidad','dispensation_item_id','f_uuid_item_dispensacion');
select api.fn_renombrar_columna('t_ciclos_continuidad','status','f_estado');
select api.fn_renombrar_columna('t_ciclos_continuidad','coverage_days','f_dias_cobertura');
select api.fn_renombrar_columna('t_ciclos_continuidad','depletion_date','f_fecha_agotamiento');
select api.fn_renombrar_columna('t_ciclos_continuidad','alert_date','f_fecha_alerta');
select api.fn_renombrar_columna('t_ciclos_continuidad','rule_version','f_version_regla');
select api.fn_renombrar_columna('t_ciclos_continuidad','review_reason','f_motivo_revision');
select api.fn_renombrar_columna('t_ciclos_continuidad','created_at','f_creado_en');
select api.fn_renombrar_columna('t_alertas','id','f_uuid');
select api.fn_renombrar_columna('t_alertas','cycle_id','f_uuid_ciclo');
select api.fn_renombrar_columna('t_alertas','template_version','f_version_plantilla');
select api.fn_renombrar_columna('t_alertas','scheduled_at','f_programado_en');
select api.fn_renombrar_columna('t_alertas','status','f_estado');
select api.fn_renombrar_columna('t_alertas','provider_receipt','f_recibo_proveedor');
select api.fn_renombrar_columna('t_alertas','inventory_snapshot_at','f_inventario_capturado_en');
select api.fn_renombrar_columna('t_alertas','created_at','f_creado_en');
select api.fn_renombrar_columna('t_reservas','id','f_uuid');
select api.fn_renombrar_columna('t_reservas','reference','f_referencia');
select api.fn_renombrar_columna('t_reservas','patient_id','f_uuid_paciente');
select api.fn_renombrar_columna('t_reservas','product_id','f_uuid_producto');
select api.fn_renombrar_columna('t_reservas','branch_id','f_uuid_sucursal');
select api.fn_renombrar_columna('t_reservas','quantity','f_cantidad');
select api.fn_renombrar_columna('t_reservas','status','f_estado');
select api.fn_renombrar_columna('t_reservas','expires_at','f_expira_en');
select api.fn_renombrar_columna('t_reservas','confirmed_by','f_uuid_confirmado_por');
select api.fn_renombrar_columna('t_reservas','dispensation_id','f_uuid_dispensacion');
select api.fn_renombrar_columna('t_reservas','created_at','f_creado_en');
select api.fn_renombrar_columna('t_tareas','id','f_uuid');
select api.fn_renombrar_columna('t_tareas','task_type','f_tipo_tarea');
select api.fn_renombrar_columna('t_tareas','priority','f_prioridad');
select api.fn_renombrar_columna('t_tareas','status','f_estado');
select api.fn_renombrar_columna('t_tareas','branch_id','f_uuid_sucursal');
select api.fn_renombrar_columna('t_tareas','patient_id','f_uuid_paciente');
select api.fn_renombrar_columna('t_tareas','assigned_to','f_uuid_asignado_a');
select api.fn_renombrar_columna('t_tareas','due_at','f_vence_en');
select api.fn_renombrar_columna('t_tareas','source_type','f_tipo_fuente');
select api.fn_renombrar_columna('t_tareas','source_id','f_uuid_fuente');
select api.fn_renombrar_columna('t_tareas','created_at','f_creado_en');
select api.fn_renombrar_columna('t_eventos_auditoria','id','f_uuid');
select api.fn_renombrar_columna('t_eventos_auditoria','actor_id','f_uuid_actor');
select api.fn_renombrar_columna('t_eventos_auditoria','branch_id','f_uuid_sucursal');
select api.fn_renombrar_columna('t_eventos_auditoria','event_type','f_tipo_evento');
select api.fn_renombrar_columna('t_eventos_auditoria','entity_type','f_tipo_entidad');
select api.fn_renombrar_columna('t_eventos_auditoria','entity_id','f_uuid_entidad');
select api.fn_renombrar_columna('t_eventos_auditoria','correlation_id','f_uuid_correlacion');
select api.fn_renombrar_columna('t_eventos_auditoria','safe_metadata','f_metadatos_seguros');
select api.fn_renombrar_columna('t_eventos_auditoria','created_at','f_creado_en');
select api.fn_renombrar_columna('t_eventos_salida','id','f_uuid');
select api.fn_renombrar_columna('t_eventos_salida','event_type','f_tipo_evento');
select api.fn_renombrar_columna('t_eventos_salida','aggregate_type','f_tipo_agregado');
select api.fn_renombrar_columna('t_eventos_salida','aggregate_id','f_uuid_agregado');
select api.fn_renombrar_columna('t_eventos_salida','idempotency_key','f_clave_idempotencia');
select api.fn_renombrar_columna('t_eventos_salida','payload','f_carga');
select api.fn_renombrar_columna('t_eventos_salida','status','f_estado');
select api.fn_renombrar_columna('t_eventos_salida','attempts','f_intentos');
select api.fn_renombrar_columna('t_eventos_salida','available_at','f_disponible_en');
select api.fn_renombrar_columna('t_eventos_salida','lease_until','f_arrendamiento_hasta');
select api.fn_renombrar_columna('t_eventos_salida','provider_receipt','f_recibo_proveedor');
select api.fn_renombrar_columna('t_eventos_salida','created_at','f_creado_en');

drop function api.fn_renombrar_columna(text,text,text);


-- Mandatory fields for api.t_sucursales
alter table api.t_sucursales add column if not exists f_id bigint generated by default as identity;
alter table api.t_sucursales add column if not exists f_id_secuencia bigint;
alter table api.t_sucursales add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_sucursales add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_sucursales add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_sucursales add column if not exists f_idempresa integer not null default 4;
alter table api.t_sucursales add column if not exists f_idsucursal integer not null default 1;
alter table api.t_sucursales add column if not exists f_app integer not null default 0;
alter table api.t_sucursales alter column f_uuid set default gen_random_uuid();
alter table api.t_sucursales alter column f_uuid set not null;
update api.t_sucursales set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_sucursales alter column f_id_secuencia set not null;
create unique index if not exists ux_t_sucursales_f_id on api.t_sucursales(f_id);
create unique index if not exists ux_t_sucursales_f_uuid on api.t_sucursales(f_uuid);
create index if not exists ix_t_sucursales_tenant on api.t_sucursales(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_perfiles
alter table api.t_perfiles add column if not exists f_id bigint generated by default as identity;
alter table api.t_perfiles add column if not exists f_id_secuencia bigint;
alter table api.t_perfiles add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_perfiles add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_perfiles add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_perfiles add column if not exists f_idempresa integer not null default 4;
alter table api.t_perfiles add column if not exists f_idsucursal integer not null default 1;
alter table api.t_perfiles add column if not exists f_app integer not null default 0;
alter table api.t_perfiles alter column f_uuid set default gen_random_uuid();
alter table api.t_perfiles alter column f_uuid set not null;
update api.t_perfiles set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_perfiles alter column f_id_secuencia set not null;
create unique index if not exists ux_t_perfiles_f_id on api.t_perfiles(f_id);
create unique index if not exists ux_t_perfiles_f_uuid on api.t_perfiles(f_uuid);
create index if not exists ix_t_perfiles_tenant on api.t_perfiles(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_membresias_sucursales
alter table api.t_membresias_sucursales add column if not exists f_id bigint generated by default as identity;
alter table api.t_membresias_sucursales add column if not exists f_id_secuencia bigint;
alter table api.t_membresias_sucursales add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_membresias_sucursales add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_membresias_sucursales add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_membresias_sucursales add column if not exists f_idempresa integer not null default 4;
alter table api.t_membresias_sucursales add column if not exists f_idsucursal integer not null default 1;
alter table api.t_membresias_sucursales add column if not exists f_app integer not null default 0;
alter table api.t_membresias_sucursales alter column f_uuid set default gen_random_uuid();
alter table api.t_membresias_sucursales alter column f_uuid set not null;
update api.t_membresias_sucursales set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_membresias_sucursales alter column f_id_secuencia set not null;
create unique index if not exists ux_t_membresias_sucursales_f_id on api.t_membresias_sucursales(f_id);
create unique index if not exists ux_t_membresias_sucursales_f_uuid on api.t_membresias_sucursales(f_uuid);
create index if not exists ix_t_membresias_sucursales_tenant on api.t_membresias_sucursales(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_pacientes
alter table api.t_pacientes add column if not exists f_id bigint generated by default as identity;
alter table api.t_pacientes add column if not exists f_id_secuencia bigint;
alter table api.t_pacientes add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_pacientes add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_pacientes add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_pacientes add column if not exists f_idempresa integer not null default 4;
alter table api.t_pacientes add column if not exists f_idsucursal integer not null default 1;
alter table api.t_pacientes add column if not exists f_app integer not null default 0;
alter table api.t_pacientes alter column f_uuid set default gen_random_uuid();
alter table api.t_pacientes alter column f_uuid set not null;
update api.t_pacientes set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_pacientes alter column f_id_secuencia set not null;
create unique index if not exists ux_t_pacientes_f_id on api.t_pacientes(f_id);
create unique index if not exists ux_t_pacientes_f_uuid on api.t_pacientes(f_uuid);
create index if not exists ix_t_pacientes_tenant on api.t_pacientes(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_consentimientos
alter table api.t_consentimientos add column if not exists f_id bigint generated by default as identity;
alter table api.t_consentimientos add column if not exists f_id_secuencia bigint;
alter table api.t_consentimientos add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_consentimientos add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_consentimientos add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_consentimientos add column if not exists f_idempresa integer not null default 4;
alter table api.t_consentimientos add column if not exists f_idsucursal integer not null default 1;
alter table api.t_consentimientos add column if not exists f_app integer not null default 0;
alter table api.t_consentimientos alter column f_uuid set default gen_random_uuid();
alter table api.t_consentimientos alter column f_uuid set not null;
update api.t_consentimientos set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_consentimientos alter column f_id_secuencia set not null;
create unique index if not exists ux_t_consentimientos_f_id on api.t_consentimientos(f_id);
create unique index if not exists ux_t_consentimientos_f_uuid on api.t_consentimientos(f_uuid);
create index if not exists ix_t_consentimientos_tenant on api.t_consentimientos(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_productos
alter table api.t_productos add column if not exists f_id bigint generated by default as identity;
alter table api.t_productos add column if not exists f_id_secuencia bigint;
alter table api.t_productos add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_productos add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_productos add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_productos add column if not exists f_idempresa integer not null default 4;
alter table api.t_productos add column if not exists f_idsucursal integer not null default 1;
alter table api.t_productos add column if not exists f_app integer not null default 0;
alter table api.t_productos alter column f_uuid set default gen_random_uuid();
alter table api.t_productos alter column f_uuid set not null;
update api.t_productos set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_productos alter column f_id_secuencia set not null;
create unique index if not exists ux_t_productos_f_id on api.t_productos(f_id);
create unique index if not exists ux_t_productos_f_uuid on api.t_productos(f_uuid);
create index if not exists ix_t_productos_tenant on api.t_productos(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_posiciones_inventario
alter table api.t_posiciones_inventario add column if not exists f_id bigint generated by default as identity;
alter table api.t_posiciones_inventario add column if not exists f_id_secuencia bigint;
alter table api.t_posiciones_inventario add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_posiciones_inventario add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_posiciones_inventario add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_posiciones_inventario add column if not exists f_idempresa integer not null default 4;
alter table api.t_posiciones_inventario add column if not exists f_idsucursal integer not null default 1;
alter table api.t_posiciones_inventario add column if not exists f_app integer not null default 0;
alter table api.t_posiciones_inventario alter column f_uuid set default gen_random_uuid();
alter table api.t_posiciones_inventario alter column f_uuid set not null;
update api.t_posiciones_inventario set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_posiciones_inventario alter column f_id_secuencia set not null;
create unique index if not exists ux_t_posiciones_inventario_f_id on api.t_posiciones_inventario(f_id);
create unique index if not exists ux_t_posiciones_inventario_f_uuid on api.t_posiciones_inventario(f_uuid);
create index if not exists ix_t_posiciones_inventario_tenant on api.t_posiciones_inventario(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_documentos
alter table api.t_documentos add column if not exists f_id bigint generated by default as identity;
alter table api.t_documentos add column if not exists f_id_secuencia bigint;
alter table api.t_documentos add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_documentos add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_documentos add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_documentos add column if not exists f_idempresa integer not null default 4;
alter table api.t_documentos add column if not exists f_idsucursal integer not null default 1;
alter table api.t_documentos add column if not exists f_app integer not null default 0;
alter table api.t_documentos alter column f_uuid set default gen_random_uuid();
alter table api.t_documentos alter column f_uuid set not null;
update api.t_documentos set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_documentos alter column f_id_secuencia set not null;
create unique index if not exists ux_t_documentos_f_id on api.t_documentos(f_id);
create unique index if not exists ux_t_documentos_f_uuid on api.t_documentos(f_uuid);
create index if not exists ix_t_documentos_tenant on api.t_documentos(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_dispensaciones
alter table api.t_dispensaciones add column if not exists f_id bigint generated by default as identity;
alter table api.t_dispensaciones add column if not exists f_id_secuencia bigint;
alter table api.t_dispensaciones add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_dispensaciones add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_dispensaciones add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_dispensaciones add column if not exists f_idempresa integer not null default 4;
alter table api.t_dispensaciones add column if not exists f_idsucursal integer not null default 1;
alter table api.t_dispensaciones add column if not exists f_app integer not null default 0;
alter table api.t_dispensaciones alter column f_uuid set default gen_random_uuid();
alter table api.t_dispensaciones alter column f_uuid set not null;
update api.t_dispensaciones set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_dispensaciones alter column f_id_secuencia set not null;
create unique index if not exists ux_t_dispensaciones_f_id on api.t_dispensaciones(f_id);
create unique index if not exists ux_t_dispensaciones_f_uuid on api.t_dispensaciones(f_uuid);
create index if not exists ix_t_dispensaciones_tenant on api.t_dispensaciones(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_items_dispensacion
alter table api.t_items_dispensacion add column if not exists f_id bigint generated by default as identity;
alter table api.t_items_dispensacion add column if not exists f_id_secuencia bigint;
alter table api.t_items_dispensacion add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_items_dispensacion add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_items_dispensacion add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_items_dispensacion add column if not exists f_idempresa integer not null default 4;
alter table api.t_items_dispensacion add column if not exists f_idsucursal integer not null default 1;
alter table api.t_items_dispensacion add column if not exists f_app integer not null default 0;
alter table api.t_items_dispensacion alter column f_uuid set default gen_random_uuid();
alter table api.t_items_dispensacion alter column f_uuid set not null;
update api.t_items_dispensacion set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_items_dispensacion alter column f_id_secuencia set not null;
create unique index if not exists ux_t_items_dispensacion_f_id on api.t_items_dispensacion(f_id);
create unique index if not exists ux_t_items_dispensacion_f_uuid on api.t_items_dispensacion(f_uuid);
create index if not exists ix_t_items_dispensacion_tenant on api.t_items_dispensacion(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_documentos_dispensacion
alter table api.t_documentos_dispensacion add column if not exists f_id bigint generated by default as identity;
alter table api.t_documentos_dispensacion add column if not exists f_id_secuencia bigint;
alter table api.t_documentos_dispensacion add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_documentos_dispensacion add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_documentos_dispensacion add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_documentos_dispensacion add column if not exists f_idempresa integer not null default 4;
alter table api.t_documentos_dispensacion add column if not exists f_idsucursal integer not null default 1;
alter table api.t_documentos_dispensacion add column if not exists f_app integer not null default 0;
alter table api.t_documentos_dispensacion alter column f_uuid set default gen_random_uuid();
alter table api.t_documentos_dispensacion alter column f_uuid set not null;
update api.t_documentos_dispensacion set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_documentos_dispensacion alter column f_id_secuencia set not null;
create unique index if not exists ux_t_documentos_dispensacion_f_id on api.t_documentos_dispensacion(f_id);
create unique index if not exists ux_t_documentos_dispensacion_f_uuid on api.t_documentos_dispensacion(f_uuid);
create index if not exists ix_t_documentos_dispensacion_tenant on api.t_documentos_dispensacion(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_movimientos_inventario
alter table api.t_movimientos_inventario add column if not exists f_id bigint generated by default as identity;
alter table api.t_movimientos_inventario add column if not exists f_id_secuencia bigint;
alter table api.t_movimientos_inventario add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_movimientos_inventario add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_movimientos_inventario add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_movimientos_inventario add column if not exists f_idempresa integer not null default 4;
alter table api.t_movimientos_inventario add column if not exists f_idsucursal integer not null default 1;
alter table api.t_movimientos_inventario add column if not exists f_app integer not null default 0;
alter table api.t_movimientos_inventario alter column f_uuid set default gen_random_uuid();
alter table api.t_movimientos_inventario alter column f_uuid set not null;
update api.t_movimientos_inventario set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_movimientos_inventario alter column f_id_secuencia set not null;
create unique index if not exists ux_t_movimientos_inventario_f_id on api.t_movimientos_inventario(f_id);
create unique index if not exists ux_t_movimientos_inventario_f_uuid on api.t_movimientos_inventario(f_uuid);
create index if not exists ix_t_movimientos_inventario_tenant on api.t_movimientos_inventario(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_ciclos_continuidad
alter table api.t_ciclos_continuidad add column if not exists f_id bigint generated by default as identity;
alter table api.t_ciclos_continuidad add column if not exists f_id_secuencia bigint;
alter table api.t_ciclos_continuidad add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_ciclos_continuidad add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_ciclos_continuidad add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_ciclos_continuidad add column if not exists f_idempresa integer not null default 4;
alter table api.t_ciclos_continuidad add column if not exists f_idsucursal integer not null default 1;
alter table api.t_ciclos_continuidad add column if not exists f_app integer not null default 0;
alter table api.t_ciclos_continuidad alter column f_uuid set default gen_random_uuid();
alter table api.t_ciclos_continuidad alter column f_uuid set not null;
update api.t_ciclos_continuidad set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_ciclos_continuidad alter column f_id_secuencia set not null;
create unique index if not exists ux_t_ciclos_continuidad_f_id on api.t_ciclos_continuidad(f_id);
create unique index if not exists ux_t_ciclos_continuidad_f_uuid on api.t_ciclos_continuidad(f_uuid);
create index if not exists ix_t_ciclos_continuidad_tenant on api.t_ciclos_continuidad(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_alertas
alter table api.t_alertas add column if not exists f_id bigint generated by default as identity;
alter table api.t_alertas add column if not exists f_id_secuencia bigint;
alter table api.t_alertas add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_alertas add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_alertas add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_alertas add column if not exists f_idempresa integer not null default 4;
alter table api.t_alertas add column if not exists f_idsucursal integer not null default 1;
alter table api.t_alertas add column if not exists f_app integer not null default 0;
alter table api.t_alertas alter column f_uuid set default gen_random_uuid();
alter table api.t_alertas alter column f_uuid set not null;
update api.t_alertas set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_alertas alter column f_id_secuencia set not null;
create unique index if not exists ux_t_alertas_f_id on api.t_alertas(f_id);
create unique index if not exists ux_t_alertas_f_uuid on api.t_alertas(f_uuid);
create index if not exists ix_t_alertas_tenant on api.t_alertas(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_reservas
alter table api.t_reservas add column if not exists f_id bigint generated by default as identity;
alter table api.t_reservas add column if not exists f_id_secuencia bigint;
alter table api.t_reservas add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_reservas add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_reservas add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_reservas add column if not exists f_idempresa integer not null default 4;
alter table api.t_reservas add column if not exists f_idsucursal integer not null default 1;
alter table api.t_reservas add column if not exists f_app integer not null default 0;
alter table api.t_reservas alter column f_uuid set default gen_random_uuid();
alter table api.t_reservas alter column f_uuid set not null;
update api.t_reservas set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_reservas alter column f_id_secuencia set not null;
create unique index if not exists ux_t_reservas_f_id on api.t_reservas(f_id);
create unique index if not exists ux_t_reservas_f_uuid on api.t_reservas(f_uuid);
create index if not exists ix_t_reservas_tenant on api.t_reservas(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_tareas
alter table api.t_tareas add column if not exists f_id bigint generated by default as identity;
alter table api.t_tareas add column if not exists f_id_secuencia bigint;
alter table api.t_tareas add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_tareas add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_tareas add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_tareas add column if not exists f_idempresa integer not null default 4;
alter table api.t_tareas add column if not exists f_idsucursal integer not null default 1;
alter table api.t_tareas add column if not exists f_app integer not null default 0;
alter table api.t_tareas alter column f_uuid set default gen_random_uuid();
alter table api.t_tareas alter column f_uuid set not null;
update api.t_tareas set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_tareas alter column f_id_secuencia set not null;
create unique index if not exists ux_t_tareas_f_id on api.t_tareas(f_id);
create unique index if not exists ux_t_tareas_f_uuid on api.t_tareas(f_uuid);
create index if not exists ix_t_tareas_tenant on api.t_tareas(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_eventos_auditoria
alter table api.t_eventos_auditoria add column if not exists f_id bigint generated by default as identity;
alter table api.t_eventos_auditoria add column if not exists f_id_secuencia bigint;
alter table api.t_eventos_auditoria add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_eventos_auditoria add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_eventos_auditoria add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_eventos_auditoria add column if not exists f_idempresa integer not null default 4;
alter table api.t_eventos_auditoria add column if not exists f_idsucursal integer not null default 1;
alter table api.t_eventos_auditoria add column if not exists f_app integer not null default 0;
alter table api.t_eventos_auditoria alter column f_uuid set default gen_random_uuid();
alter table api.t_eventos_auditoria alter column f_uuid set not null;
update api.t_eventos_auditoria set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_eventos_auditoria alter column f_id_secuencia set not null;
create unique index if not exists ux_t_eventos_auditoria_f_id on api.t_eventos_auditoria(f_id);
create unique index if not exists ux_t_eventos_auditoria_f_uuid on api.t_eventos_auditoria(f_uuid);
create index if not exists ix_t_eventos_auditoria_tenant on api.t_eventos_auditoria(f_idempresa, f_idsucursal, f_app);

-- Mandatory fields for api.t_eventos_salida
alter table api.t_eventos_salida add column if not exists f_id bigint generated by default as identity;
alter table api.t_eventos_salida add column if not exists f_id_secuencia bigint;
alter table api.t_eventos_salida add column if not exists f_uuid uuid default gen_random_uuid();
alter table api.t_eventos_salida add column if not exists f_email_principal character varying(180) not null default 'pendiente@local.dev'::character varying;
alter table api.t_eventos_salida add column if not exists f_rnc_principal character varying(20) not null default 'PENDIENTE'::character varying;
alter table api.t_eventos_salida add column if not exists f_idempresa integer not null default 4;
alter table api.t_eventos_salida add column if not exists f_idsucursal integer not null default 1;
alter table api.t_eventos_salida add column if not exists f_app integer not null default 0;
alter table api.t_eventos_salida alter column f_uuid set default gen_random_uuid();
alter table api.t_eventos_salida alter column f_uuid set not null;
update api.t_eventos_salida set f_id_secuencia=f_id where f_id_secuencia is null;
alter table api.t_eventos_salida alter column f_id_secuencia set not null;
create unique index if not exists ux_t_eventos_salida_f_id on api.t_eventos_salida(f_id);
create unique index if not exists ux_t_eventos_salida_f_uuid on api.t_eventos_salida(f_uuid);
create index if not exists ix_t_eventos_salida_tenant on api.t_eventos_salida(f_idempresa, f_idsucursal, f_app);

update api.t_sucursales set f_idsucursal=case f_codigo when '70' then 1 when '01' then 2 when '81' then 3 when '48' then 4 else f_idsucursal end;
update api.t_membresias_sucursales m set f_idsucursal=s.f_idsucursal from api.t_sucursales s where s.f_uuid=m.f_uuid_sucursal;
update api.t_perfiles p set f_idsucursal=coalesce((select min(m.f_idsucursal) from api.t_membresias_sucursales m where m.f_uuid_perfil=p.f_uuid),p.f_idsucursal);
update api.t_pacientes p set f_idsucursal=s.f_idsucursal from api.t_sucursales s where s.f_uuid=p.f_uuid_sucursal_preferida;
update api.t_consentimientos c set f_idsucursal=p.f_idsucursal from api.t_pacientes p where p.f_uuid=c.f_uuid_paciente;
update api.t_posiciones_inventario i set f_idsucursal=s.f_idsucursal from api.t_sucursales s where s.f_uuid=i.f_uuid_sucursal;
update api.t_documentos d set f_idsucursal=s.f_idsucursal from api.t_sucursales s where s.f_uuid=d.f_uuid_sucursal;
update api.t_dispensaciones d set f_idsucursal=s.f_idsucursal from api.t_sucursales s where s.f_uuid=d.f_uuid_sucursal;
update api.t_items_dispensacion i set f_idsucursal=d.f_idsucursal from api.t_dispensaciones d where d.f_uuid=i.f_uuid_dispensacion;
update api.t_documentos_dispensacion x set f_idsucursal=d.f_idsucursal from api.t_dispensaciones d where d.f_uuid=x.f_uuid_dispensacion;
update api.t_movimientos_inventario m set f_idsucursal=s.f_idsucursal from api.t_sucursales s where s.f_uuid=m.f_uuid_sucursal;
update api.t_ciclos_continuidad c set f_idsucursal=p.f_idsucursal from api.t_pacientes p where p.f_uuid=c.f_uuid_paciente;
update api.t_alertas a set f_idsucursal=c.f_idsucursal from api.t_ciclos_continuidad c where c.f_uuid=a.f_uuid_ciclo;
update api.t_reservas r set f_idsucursal=s.f_idsucursal from api.t_sucursales s where s.f_uuid=r.f_uuid_sucursal;
update api.t_tareas t set f_idsucursal=s.f_idsucursal from api.t_sucursales s where s.f_uuid=t.f_uuid_sucursal;
update api.t_eventos_auditoria e set f_idsucursal=s.f_idsucursal from api.t_sucursales s where s.f_uuid=e.f_uuid_sucursal;

create or replace function api.fn_completar_campos_base() returns trigger language plpgsql set search_path=api as $$ begin if new.f_id_secuencia is null then new.f_id_secuencia:=new.f_id; end if; return new; end $$;

drop trigger if exists tr_campos_base on api.t_sucursales; create trigger tr_campos_base before insert on api.t_sucursales for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_perfiles; create trigger tr_campos_base before insert on api.t_perfiles for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_membresias_sucursales; create trigger tr_campos_base before insert on api.t_membresias_sucursales for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_pacientes; create trigger tr_campos_base before insert on api.t_pacientes for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_consentimientos; create trigger tr_campos_base before insert on api.t_consentimientos for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_productos; create trigger tr_campos_base before insert on api.t_productos for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_posiciones_inventario; create trigger tr_campos_base before insert on api.t_posiciones_inventario for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_documentos; create trigger tr_campos_base before insert on api.t_documentos for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_dispensaciones; create trigger tr_campos_base before insert on api.t_dispensaciones for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_items_dispensacion; create trigger tr_campos_base before insert on api.t_items_dispensacion for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_documentos_dispensacion; create trigger tr_campos_base before insert on api.t_documentos_dispensacion for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_movimientos_inventario; create trigger tr_campos_base before insert on api.t_movimientos_inventario for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_ciclos_continuidad; create trigger tr_campos_base before insert on api.t_ciclos_continuidad for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_alertas; create trigger tr_campos_base before insert on api.t_alertas for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_reservas; create trigger tr_campos_base before insert on api.t_reservas for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_tareas; create trigger tr_campos_base before insert on api.t_tareas for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_eventos_auditoria; create trigger tr_campos_base before insert on api.t_eventos_auditoria for each row execute function api.fn_completar_campos_base();
drop trigger if exists tr_campos_base on api.t_eventos_salida; create trigger tr_campos_base before insert on api.t_eventos_salida for each row execute function api.fn_completar_campos_base();

drop trigger if exists on_auth_user_created_create_staff_profile on auth.users;
drop function if exists public.handle_new_staff_user();
drop function if exists public.admin_create_staff_profile(uuid,uuid,text,text,uuid[]);
drop function if exists public.admin_update_staff_profile(uuid,uuid,text,text,boolean,uuid[],text[]);

create or replace function api.fn_crear_perfil_auth() returns trigger language plpgsql security definer set search_path=api,public as $$
begin
 insert into api.t_perfiles(f_uuid,f_nombre_mostrar,f_rol,f_activo,f_idempresa,f_idsucursal,f_app)
 values(new.id,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),new.email,'Usuario'),'attention',true,4,1,0)
 on conflict(f_uuid) do nothing;
 return new;
end $$;
revoke all on function api.fn_crear_perfil_auth() from public;
create trigger on_auth_user_created_create_staff_profile after insert on auth.users for each row execute function api.fn_crear_perfil_auth();

create or replace function api.fn_tenant_autorizado(p_empresa integer,p_sucursal integer,p_app integer) returns boolean language sql stable security definer set search_path=api,public as $$
 select exists(select 1 from api.t_perfiles p where p.f_uuid=auth.uid() and p.f_activo and p.f_idempresa=p_empresa and p.f_app=p_app and (p.f_rol='administrator' or p.f_idsucursal=p_sucursal or exists(select 1 from api.t_membresias_sucursales m where m.f_uuid_perfil=p.f_uuid and m.f_idempresa=p_empresa and m.f_idsucursal=p_sucursal and m.f_app=p_app)))
$$;

create or replace function api.fn_crear_perfil_empleado(p_actor_uuid uuid,p_perfil_uuid uuid,p_nombre text,p_rol text,p_sucursales_uuid uuid[]) returns void language plpgsql security definer set search_path=api,public as $$
declare v_empresa integer; v_app integer;
begin
 select f_idempresa,f_app into v_empresa,v_app from api.t_perfiles where f_uuid=p_actor_uuid and f_rol='administrator' and f_activo;
 if not found then raise exception 'Acceso administrativo requerido'; end if;
 insert into api.t_perfiles(f_uuid,f_nombre_mostrar,f_rol,f_activo,f_idempresa,f_idsucursal,f_app)
 values(p_perfil_uuid,p_nombre,p_rol,true,v_empresa,1,v_app)
 on conflict(f_uuid) do update set f_nombre_mostrar=excluded.f_nombre_mostrar,f_rol=excluded.f_rol,f_activo=true,f_idempresa=v_empresa,f_app=v_app;
 delete from api.t_membresias_sucursales where f_uuid_perfil=p_perfil_uuid;
 insert into api.t_membresias_sucursales(f_uuid_perfil,f_uuid_sucursal,f_idempresa,f_idsucursal,f_app)
 select p_perfil_uuid,s.f_uuid,v_empresa,s.f_idsucursal,v_app from api.t_sucursales s where s.f_uuid=any(coalesce(p_sucursales_uuid,array[]::uuid[])) and s.f_idempresa=v_empresa and s.f_app=v_app;
 update api.t_perfiles set f_idsucursal=coalesce((select min(f_idsucursal) from api.t_membresias_sucursales where f_uuid_perfil=p_perfil_uuid),1) where f_uuid=p_perfil_uuid;
 insert into api.t_eventos_auditoria(f_uuid_actor,f_tipo_evento,f_tipo_entidad,f_uuid_entidad,f_uuid_correlacion,f_metadatos_seguros,f_idempresa,f_idsucursal,f_app)
 values(p_actor_uuid,'staff.created','profile',p_perfil_uuid,gen_random_uuid(),jsonb_build_object('role',p_rol,'branchIds',coalesce(p_sucursales_uuid,array[]::uuid[])),v_empresa,1,v_app);
end $$;

create or replace function api.fn_actualizar_perfil_empleado(p_actor_uuid uuid,p_perfil_uuid uuid,p_nombre text,p_rol text,p_activo boolean,p_sucursales_uuid uuid[],p_campos_cambiados text[]) returns void language plpgsql security definer set search_path=api,public as $$
declare v_empresa integer; v_app integer;
begin
 select f_idempresa,f_app into v_empresa,v_app from api.t_perfiles where f_uuid=p_actor_uuid and f_rol='administrator' and f_activo;
 if not found then raise exception 'Acceso administrativo requerido'; end if;
 if p_actor_uuid=p_perfil_uuid and not p_activo then raise exception 'No puede desactivar su propia cuenta'; end if;
 update api.t_perfiles set f_nombre_mostrar=p_nombre,f_rol=p_rol,f_activo=p_activo where f_uuid=p_perfil_uuid and f_idempresa=v_empresa and f_app=v_app;
 if not found then raise exception 'Empleado no encontrado'; end if;
 delete from api.t_membresias_sucursales where f_uuid_perfil=p_perfil_uuid and f_idempresa=v_empresa and f_app=v_app;
 insert into api.t_membresias_sucursales(f_uuid_perfil,f_uuid_sucursal,f_idempresa,f_idsucursal,f_app)
 select p_perfil_uuid,s.f_uuid,v_empresa,s.f_idsucursal,v_app from api.t_sucursales s where s.f_uuid=any(coalesce(p_sucursales_uuid,array[]::uuid[])) and s.f_idempresa=v_empresa and s.f_app=v_app;
 update api.t_perfiles set f_idsucursal=coalesce((select min(f_idsucursal) from api.t_membresias_sucursales where f_uuid_perfil=p_perfil_uuid),1) where f_uuid=p_perfil_uuid;
 insert into api.t_eventos_auditoria(f_uuid_actor,f_tipo_evento,f_tipo_entidad,f_uuid_entidad,f_uuid_correlacion,f_metadatos_seguros,f_idempresa,f_idsucursal,f_app)
 values(p_actor_uuid,'staff.updated','profile',p_perfil_uuid,gen_random_uuid(),jsonb_build_object('changedFields',coalesce(p_campos_cambiados,array[]::text[])),v_empresa,1,v_app);
end $$;

alter table api.t_sucursales enable row level security;
alter table api.t_perfiles enable row level security;
alter table api.t_membresias_sucursales enable row level security;
alter table api.t_pacientes enable row level security;
alter table api.t_consentimientos enable row level security;
alter table api.t_productos enable row level security;
alter table api.t_posiciones_inventario enable row level security;
alter table api.t_documentos enable row level security;
alter table api.t_dispensaciones enable row level security;
alter table api.t_items_dispensacion enable row level security;
alter table api.t_documentos_dispensacion enable row level security;
alter table api.t_movimientos_inventario enable row level security;
alter table api.t_ciclos_continuidad enable row level security;
alter table api.t_alertas enable row level security;
alter table api.t_reservas enable row level security;
alter table api.t_tareas enable row level security;
alter table api.t_eventos_auditoria enable row level security;
alter table api.t_eventos_salida enable row level security;

drop policy if exists "profiles read own" on api.t_perfiles;
drop policy if exists "memberships read own" on api.t_membresias_sucursales;
drop policy if exists "branches authenticated read" on api.t_sucursales;
drop policy if exists "products authenticated read" on api.t_productos;
drop policy if exists "perfiles leer propio" on api.t_perfiles;
drop policy if exists "membresias leer propias" on api.t_membresias_sucursales;
drop policy if exists "sucursales leer tenant" on api.t_sucursales;
drop policy if exists "productos leer tenant" on api.t_productos;
create policy "perfiles leer propio" on api.t_perfiles for select to authenticated using(f_uuid=auth.uid());
create policy "membresias leer propias" on api.t_membresias_sucursales for select to authenticated using(f_uuid_perfil=auth.uid());
create policy "sucursales leer tenant" on api.t_sucursales for select to authenticated using(api.fn_tenant_autorizado(f_idempresa,f_idsucursal,f_app));
create policy "productos leer tenant" on api.t_productos for select to authenticated using(api.fn_tenant_autorizado(f_idempresa,f_idsucursal,f_app));

grant usage on schema api to authenticated,service_role;

revoke all on api.t_sucursales from anon,authenticated; grant all on api.t_sucursales to service_role;
revoke all on api.t_perfiles from anon,authenticated; grant all on api.t_perfiles to service_role;
revoke all on api.t_membresias_sucursales from anon,authenticated; grant all on api.t_membresias_sucursales to service_role;
revoke all on api.t_pacientes from anon,authenticated; grant all on api.t_pacientes to service_role;
revoke all on api.t_consentimientos from anon,authenticated; grant all on api.t_consentimientos to service_role;
revoke all on api.t_productos from anon,authenticated; grant all on api.t_productos to service_role;
revoke all on api.t_posiciones_inventario from anon,authenticated; grant all on api.t_posiciones_inventario to service_role;
revoke all on api.t_documentos from anon,authenticated; grant all on api.t_documentos to service_role;
revoke all on api.t_dispensaciones from anon,authenticated; grant all on api.t_dispensaciones to service_role;
revoke all on api.t_items_dispensacion from anon,authenticated; grant all on api.t_items_dispensacion to service_role;
revoke all on api.t_documentos_dispensacion from anon,authenticated; grant all on api.t_documentos_dispensacion to service_role;
revoke all on api.t_movimientos_inventario from anon,authenticated; grant all on api.t_movimientos_inventario to service_role;
revoke all on api.t_ciclos_continuidad from anon,authenticated; grant all on api.t_ciclos_continuidad to service_role;
revoke all on api.t_alertas from anon,authenticated; grant all on api.t_alertas to service_role;
revoke all on api.t_reservas from anon,authenticated; grant all on api.t_reservas to service_role;
revoke all on api.t_tareas from anon,authenticated; grant all on api.t_tareas to service_role;
revoke all on api.t_eventos_auditoria from anon,authenticated; grant all on api.t_eventos_auditoria to service_role;
revoke all on api.t_eventos_salida from anon,authenticated; grant all on api.t_eventos_salida to service_role;
grant select on api.t_perfiles,api.t_membresias_sucursales,api.t_sucursales,api.t_productos to authenticated;
grant usage,select on all sequences in schema api to service_role; grant execute on function api.fn_tenant_autorizado(integer,integer,integer) to authenticated,service_role; grant execute on function api.fn_crear_perfil_empleado(uuid,uuid,text,text,uuid[]) to service_role; grant execute on function api.fn_actualizar_perfil_empleado(uuid,uuid,text,text,boolean,uuid[],text[]) to service_role;
commit;
