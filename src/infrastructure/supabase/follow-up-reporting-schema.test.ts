import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("esquema del reporte de seguimiento", () => {
  const migration = readFileSync(join(process.cwd(), "supabase/migrations/0017_follow_up_reporting.sql"), "utf8");

  it("marca los planes demostrativos y conserva la referencia de origen", () => {
    expect(migration).toContain("f_es_prueba boolean");
    expect(migration).toContain("f_fuente_referencia");
  });

  it("expone consultas tenant-scoped para detalle y resumen", () => {
    expect(migration).toContain("api.fn_reporte_seguimiento");
    expect(migration).toContain("api.fn_resumen_reporte_seguimiento");
    expect(migration).toContain("pl.f_idempresa=p_empresa");
    expect(migration).toContain("pl.f_app=p_app");
  });
});
