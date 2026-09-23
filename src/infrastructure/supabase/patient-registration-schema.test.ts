import { readFileSync } from "node:fs";
import { join } from "node:path";

const path = join(process.cwd(), "supabase/migrations/0011_patient_registration.sql");

describe("patient registration migration", () => {
  it("creates an atomic tenant-scoped patient and consent function and expands statistics", () => {
    const sql = readFileSync(path, "utf8").toLowerCase();
    expect(sql).toContain("create or replace function api.fn_crear_paciente");
    expect(sql).toContain("insert into api.t_pacientes");
    expect(sql).toContain("insert into api.t_consentimientos");
    for (const field of ["f_email_principal", "f_rnc_principal", "f_idempresa", "f_idsucursal", "f_app"]) expect(sql).toContain(field);
    for (const metric of ["f_pacientes_inactivos", "f_sin_consentimiento_vigente", "f_nuevos_mes", "f_con_sucursal_preferida"]) expect(sql).toContain(metric);
    expect(sql).toContain("grant execute on function api.fn_crear_paciente");
  });
});
