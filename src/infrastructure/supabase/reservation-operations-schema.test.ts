import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("operación de reservas", () => {
  const path = resolve(process.cwd(), "supabase/migrations/0018_reservation_operations.sql");

  it("creates auditable lot allocations with mandatory tenant fields", () => {
    expect(existsSync(path)).toBe(true);
    const sql = readFileSync(path, "utf8");
    expect(sql).toContain("api.t_asignaciones_reserva");
    for (const field of ["f_id", "f_id_secuencia", "f_uuid", "f_email_principal", "f_rnc_principal", "f_idempresa", "f_idsucursal", "f_app"]) {
      expect(sql).toContain(field);
    }
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("api.fn_validar_referencias_tenant");
  });

  it("exposes tenant-scoped reservation queries and atomic lifecycle operations", () => {
    const sql = readFileSync(path, "utf8");
    expect(sql).toContain("api.fn_consultar_reservas");
    expect(sql).toContain("api.fn_resumen_reservas");
    expect(sql).toContain("api.fn_crear_reserva");
    expect(sql).toContain("api.fn_cambiar_estado_reserva");
    expect(sql).toContain("for update");
    expect(sql).toContain("f_disponible-f_reservado");
    expect(sql).toContain("f_tipo_movimiento");
  });
});
