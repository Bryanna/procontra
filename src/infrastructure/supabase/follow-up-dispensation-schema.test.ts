import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(process.cwd(), "supabase/migrations/0015_follow_up_dispensation.sql");

describe("compra de seguimiento respaldada por dispensación", () => {
  it("vincula plan, dispensación e inventario con controles idempotentes", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    for (const requirement of [
      "f_uuid_plan_seguimiento",
      "f_numero_receta_plan",
      "fn_registrar_compra_seguimiento",
      "fn_buscar_productos_dispensables",
      "for update",
      "existencia insuficiente",
      "f_tipo_movimiento",
      "'dispensation'",
      "t_items_dispensacion",
      "t_ciclos_continuidad",
      "t_alertas",
      "t_eventos_auditoria",
    ]) expect(sql).toContain(requirement);
  });

  it("impide que la misma receta del plan produzca dos dispensaciones", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    expect(sql).toContain("ux_t_dispensaciones_plan_receta");
    expect(sql).toContain("f_clave_idempotencia");
    expect(sql).toContain("on conflict");
  });
});
