import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/0004_tenant_api_convention.sql"), "utf8");
const tables = [
  "t_sucursales", "t_perfiles", "t_membresias_sucursales", "t_pacientes",
  "t_consentimientos", "t_productos", "t_posiciones_inventario", "t_documentos",
  "t_dispensaciones", "t_items_dispensacion", "t_documentos_dispensacion",
  "t_movimientos_inventario", "t_ciclos_continuidad", "t_alertas", "t_reservas",
  "t_tareas", "t_eventos_auditoria", "t_eventos_salida",
];
const tenantFields = [
  "f_id", "f_id_secuencia", "f_uuid", "f_email_principal", "f_rnc_principal",
  "f_idempresa", "f_idsucursal", "f_app",
];

describe("tenant API convention migration", () => {
  it("moves every operational table to api.t_*", () => {
    expect(sql).toContain("create schema if not exists api");
    for (const table of tables) expect(sql).toContain(`api.${table}`);
  });

  it("enforces every mandatory tenant field on every table", () => {
    for (const table of tables) {
      for (const field of tenantFields) {
        expect(sql).toContain(`alter table api.${table} add column if not exists ${field}`);
      }
    }
  });

  it("prefixes legacy columns and provides tenant indexes and RLS", () => {
    expect(sql).toContain("('t_sucursales','code','f_codigo')");
    expect(sql).toContain("('t_perfiles','display_name','f_nombre_mostrar')");
    expect(sql).toContain("('t_consentimientos','patient_id','f_uuid_paciente')");
    expect(sql).toContain("f_idempresa, f_idsucursal, f_app");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("api.fn_tenant_autorizado");
  });

  it("rebuilds staff functions and auth trigger against api tables", () => {
    expect(sql).toContain("api.fn_crear_perfil_empleado");
    expect(sql).toContain("api.fn_actualizar_perfil_empleado");
    expect(sql).toContain("api.fn_crear_perfil_auth");
    expect(sql).toContain("on_auth_user_created_create_staff_profile");
  });
});
