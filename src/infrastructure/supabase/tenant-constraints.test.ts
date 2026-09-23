import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/0005_tenant_constraints.sql"), "utf8").toLowerCase();

const tenantUniqueIndexes = [
  "ux_t_sucursales_tenant_codigo",
  "ux_t_pacientes_tenant_codigo",
  "ux_t_productos_tenant_codigo",
  "ux_t_posiciones_inventario_tenant_posicion",
  "ux_t_documentos_tenant_hash",
  "ux_t_dispensaciones_tenant_idempotencia",
  "ux_t_movimientos_inventario_tenant_movimiento",
  "ux_t_ciclos_continuidad_tenant_item",
  "ux_t_alertas_tenant_programacion",
  "ux_t_reservas_tenant_referencia",
  "ux_t_eventos_salida_tenant_idempotencia",
];

describe("tenant database constraints", () => {
  it("replaces global business keys with tenant-scoped unique indexes", () => {
    for (const index of tenantUniqueIndexes) expect(sql).toContain(`create unique index if not exists ${index}`);
    expect(sql).toContain("f_idempresa,f_idsucursal,f_app,f_codigo");
    expect(sql).toContain("f_idempresa,f_idsucursal,f_app,f_clave_idempotencia");
  });

  it("prevents cross-tenant staff memberships", () => {
    expect(sql).toContain("fn_validar_membresia_tenant");
    expect(sql).toContain("tenant de perfil y sucursal no coincide");
  });
});
