import { readFileSync } from "node:fs";
import { join } from "node:path";

const path = join(process.cwd(), "supabase/migrations/0010_patient_directory.sql");

describe("patient directory migration", () => {
  it("creates tenant-scoped patient search and statistics functions", () => {
    const sql = readFileSync(path, "utf8").toLowerCase();
    expect(sql).toContain("create or replace function api.fn_consultar_pacientes");
    expect(sql).toContain("create or replace function api.fn_resumen_pacientes");
    expect(sql).toContain("p.f_idempresa=p_empresa");
    expect(sql).toContain("p.f_app=p_app");
    expect(sql).toContain("f_estado_consentimiento");
    expect(sql).toContain("count(*) over()");
    expect(sql).toContain("grant execute on function api.fn_consultar_pacientes");
    expect(sql).toContain("grant execute on function api.fn_resumen_pacientes");
  });
});
