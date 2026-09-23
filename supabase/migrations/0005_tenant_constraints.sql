begin;

-- Las claves de negocio pueden repetirse entre tenants, nunca dentro del mismo alcance.
alter table api.t_sucursales drop constraint if exists branches_code_key;
alter table api.t_pacientes drop constraint if exists patients_internal_code_key;
alter table api.t_productos drop constraint if exists products_code_key;
alter table api.t_posiciones_inventario drop constraint if exists inventory_positions_product_id_branch_id_lot_key;
alter table api.t_documentos drop constraint if exists documents_source_scope_content_hash_key;
alter table api.t_dispensaciones drop constraint if exists dispensations_idempotency_key_key;
alter table api.t_movimientos_inventario drop constraint if exists inventory_movements_dispensation_id_movement_type_key;
alter table api.t_ciclos_continuidad drop constraint if exists continuity_cycles_dispensation_item_id_key;
alter table api.t_alertas drop constraint if exists alerts_cycle_id_template_version_scheduled_at_key;
alter table api.t_reservas drop constraint if exists reservations_reference_key;
alter table api.t_eventos_salida drop constraint if exists outbox_events_idempotency_key_key;
drop index if exists api.documents_reference_by_scope;

create unique index if not exists ux_t_sucursales_tenant_codigo on api.t_sucursales(f_idempresa,f_idsucursal,f_app,f_codigo);
create unique index if not exists ux_t_sucursales_tenant_id on api.t_sucursales(f_idempresa,f_app,f_idsucursal);
create unique index if not exists ux_t_pacientes_tenant_codigo on api.t_pacientes(f_idempresa,f_idsucursal,f_app,f_codigo_interno);
create unique index if not exists ux_t_productos_tenant_codigo on api.t_productos(f_idempresa,f_idsucursal,f_app,f_codigo);
create unique index if not exists ux_t_posiciones_inventario_tenant_posicion on api.t_posiciones_inventario(f_idempresa,f_idsucursal,f_app,f_uuid_producto,f_uuid_sucursal,f_lote);
create unique index if not exists ux_t_documentos_tenant_hash on api.t_documentos(f_idempresa,f_idsucursal,f_app,f_ambito_fuente,f_hash_contenido);
create unique index if not exists ux_t_documentos_tenant_referencia on api.t_documentos(f_idempresa,f_idsucursal,f_app,f_ambito_fuente,f_referencia) where f_referencia is not null;
create unique index if not exists ux_t_dispensaciones_tenant_idempotencia on api.t_dispensaciones(f_idempresa,f_idsucursal,f_app,f_clave_idempotencia);
create unique index if not exists ux_t_movimientos_inventario_tenant_movimiento on api.t_movimientos_inventario(f_idempresa,f_idsucursal,f_app,f_uuid_dispensacion,f_tipo_movimiento);
create unique index if not exists ux_t_ciclos_continuidad_tenant_item on api.t_ciclos_continuidad(f_idempresa,f_idsucursal,f_app,f_uuid_item_dispensacion);
create unique index if not exists ux_t_alertas_tenant_programacion on api.t_alertas(f_idempresa,f_idsucursal,f_app,f_uuid_ciclo,f_version_plantilla,f_programado_en);
create unique index if not exists ux_t_reservas_tenant_referencia on api.t_reservas(f_idempresa,f_idsucursal,f_app,f_referencia);
create unique index if not exists ux_t_eventos_salida_tenant_idempotencia on api.t_eventos_salida(f_idempresa,f_idsucursal,f_app,f_clave_idempotencia);

create or replace function api.fn_validar_referencias_tenant()
returns trigger
language plpgsql
set search_path=api,public
as $$
declare
  i integer := 0;
  v_uuid uuid;
  v_valida boolean;
  v_requiere_sucursal boolean;
begin
  while i < tg_nargs loop
    v_uuid := nullif(to_jsonb(new)->>tg_argv[i], '')::uuid;
    v_requiere_sucursal := tg_argv[i+2]::boolean;
    if v_uuid is not null then
      execute format(
        'select exists(select 1 from %s where f_uuid=$1 and f_idempresa=$2 and f_app=$3%s)',
        tg_argv[i+1],
        case when v_requiere_sucursal then ' and f_idsucursal=$4' else '' end
      ) into v_valida using v_uuid,new.f_idempresa,new.f_app,new.f_idsucursal;
      if not v_valida then
        raise exception 'Referencia fuera del tenant: %', tg_argv[i];
      end if;
    end if;
    i := i + 3;
  end loop;
  return new;
end
$$;

create or replace function api.fn_validar_membresia_tenant()
returns trigger
language plpgsql
set search_path=api,public
as $$
declare
  v_perfil_valido boolean;
  v_sucursal_valida boolean;
begin
  select exists(select 1 from api.t_perfiles where f_uuid=new.f_uuid_perfil and f_idempresa=new.f_idempresa and f_app=new.f_app)
    into v_perfil_valido;
  select exists(select 1 from api.t_sucursales where f_uuid=new.f_uuid_sucursal and f_idempresa=new.f_idempresa and f_idsucursal=new.f_idsucursal and f_app=new.f_app)
    into v_sucursal_valida;
  if not v_perfil_valido or not v_sucursal_valida then
    raise exception 'Tenant de perfil y sucursal no coincide';
  end if;
  return new;
end
$$;

-- Membresías y relaciones operativas se validan incluso cuando escribe service_role.
drop trigger if exists validar_membresia_tenant on api.t_membresias_sucursales;
create trigger validar_membresia_tenant before insert or update on api.t_membresias_sucursales for each row execute function api.fn_validar_membresia_tenant();

drop trigger if exists validar_consentimiento_tenant on api.t_consentimientos;
create trigger validar_consentimiento_tenant before insert or update on api.t_consentimientos for each row execute function api.fn_validar_referencias_tenant('f_uuid_paciente','api.t_pacientes','true');
drop trigger if exists validar_posicion_tenant on api.t_posiciones_inventario;
create trigger validar_posicion_tenant before insert or update on api.t_posiciones_inventario for each row execute function api.fn_validar_referencias_tenant('f_uuid_producto','api.t_productos','false','f_uuid_sucursal','api.t_sucursales','true');
drop trigger if exists validar_documento_tenant on api.t_documentos;
create trigger validar_documento_tenant before insert or update on api.t_documentos for each row execute function api.fn_validar_referencias_tenant('f_uuid_paciente','api.t_pacientes','false','f_uuid_sucursal','api.t_sucursales','true');
drop trigger if exists validar_dispensacion_tenant on api.t_dispensaciones;
create trigger validar_dispensacion_tenant before insert or update on api.t_dispensaciones for each row execute function api.fn_validar_referencias_tenant('f_uuid_paciente','api.t_pacientes','false','f_uuid_sucursal','api.t_sucursales','true','f_uuid_reversion_origen','api.t_dispensaciones','true');
drop trigger if exists validar_item_dispensacion_tenant on api.t_items_dispensacion;
create trigger validar_item_dispensacion_tenant before insert or update on api.t_items_dispensacion for each row execute function api.fn_validar_referencias_tenant('f_uuid_dispensacion','api.t_dispensaciones','true','f_uuid_producto','api.t_productos','false');
drop trigger if exists validar_documento_dispensacion_tenant on api.t_documentos_dispensacion;
create trigger validar_documento_dispensacion_tenant before insert or update on api.t_documentos_dispensacion for each row execute function api.fn_validar_referencias_tenant('f_uuid_dispensacion','api.t_dispensaciones','true','f_uuid_documento','api.t_documentos','true');
drop trigger if exists validar_movimiento_tenant on api.t_movimientos_inventario;
create trigger validar_movimiento_tenant before insert or update on api.t_movimientos_inventario for each row execute function api.fn_validar_referencias_tenant('f_uuid_dispensacion','api.t_dispensaciones','true','f_uuid_producto','api.t_productos','false','f_uuid_sucursal','api.t_sucursales','true');
drop trigger if exists validar_ciclo_tenant on api.t_ciclos_continuidad;
create trigger validar_ciclo_tenant before insert or update on api.t_ciclos_continuidad for each row execute function api.fn_validar_referencias_tenant('f_uuid_paciente','api.t_pacientes','true','f_uuid_item_dispensacion','api.t_items_dispensacion','true');
drop trigger if exists validar_alerta_tenant on api.t_alertas;
create trigger validar_alerta_tenant before insert or update on api.t_alertas for each row execute function api.fn_validar_referencias_tenant('f_uuid_ciclo','api.t_ciclos_continuidad','true');
drop trigger if exists validar_reserva_tenant on api.t_reservas;
create trigger validar_reserva_tenant before insert or update on api.t_reservas for each row execute function api.fn_validar_referencias_tenant('f_uuid_paciente','api.t_pacientes','false','f_uuid_producto','api.t_productos','false','f_uuid_sucursal','api.t_sucursales','true','f_uuid_dispensacion','api.t_dispensaciones','true');
drop trigger if exists validar_tarea_tenant on api.t_tareas;
create trigger validar_tarea_tenant before insert or update on api.t_tareas for each row execute function api.fn_validar_referencias_tenant('f_uuid_sucursal','api.t_sucursales','true','f_uuid_paciente','api.t_pacientes','false');
drop trigger if exists validar_auditoria_tenant on api.t_eventos_auditoria;
create trigger validar_auditoria_tenant before insert or update on api.t_eventos_auditoria for each row execute function api.fn_validar_referencias_tenant('f_uuid_actor','api.t_perfiles','false','f_uuid_sucursal','api.t_sucursales','true');

revoke all on function api.fn_validar_referencias_tenant() from public,anon,authenticated;
revoke all on function api.fn_validar_membresia_tenant() from public,anon,authenticated;

commit;
