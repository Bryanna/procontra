import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("patient update migration", () => {
  it("adds an atomic tenant-scoped patient update function", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/0019_patient_update.sql"), "utf8").toLowerCase();
    expect(sql).toContain("create or replace function api.fn_actualizar_paciente");
    expect(sql).toContain("update api.t_pacientes");
    expect(sql).toContain("f_identificacion_cifrada=case");
    expect(sql).toContain("f_nss_cifrado=case");
    expect(sql).toContain("grant execute on function api.fn_actualizar_paciente");
  });
});