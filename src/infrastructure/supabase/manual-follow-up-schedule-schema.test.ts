import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/0014_manual_follow_up_schedule.sql"), "utf8").toLowerCase();

describe("programación manual del plan de seguimiento", () => {
  it("persiste el modo y la cantidad digitada por el usuario", () => {
    expect(sql).toContain("f_programacion_modo");
    expect(sql).toContain("f_cantidad_recetas_plan");
    expect(sql).toContain("'ars_rule','manual'");
  });

  it("amplía la creación con fechas y receta actual digitadas", () => {
    for (const parameter of [
      "p_programacion_modo", "p_cantidad_recetas", "p_numero_receta_actual",
      "p_fecha_ultima_compra", "p_proxima_compra", "p_fecha_contacto",
    ]) expect(sql).toContain(parameter);
    expect(sql).toContain("programación manual inválida");
    expect(sql).toContain("coalesce(pl.f_cantidad_recetas_plan,r.f_cantidad_recetas)");
  });
});
