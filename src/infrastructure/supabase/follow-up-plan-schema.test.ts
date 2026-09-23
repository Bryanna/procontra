import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationPath = join(process.cwd(), "supabase/migrations/0013_follow_up_plans.sql");

describe("migración de planes de seguimiento", () => {
  it("crea reglas, planes y contactos con alcance tenant obligatorio", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    for (const table of ["t_reglas_ars", "t_planes_seguimiento", "t_contactos_seguimiento"]) {
      expect(sql).toContain(`create table if not exists api.${table}`);
    }
    for (const field of ["f_id", "f_id_secuencia", "f_uuid", "f_email_principal", "f_rnc_principal", "f_idempresa", "f_idsucursal", "f_app"]) {
      expect(sql).toContain(field);
    }
    expect(sql).toContain("ux_t_planes_seguimiento_tenant_paciente");
  });

  it("incluye las 19 reglas y trata IDOPPRIL por número de caso", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    expect(sql).toContain("mapfre salud ars");
    expect(sql).toContain("ars abel gonzález");
    expect(sql).toContain("semma 70/30");
    expect(sql).toContain("'idoppril',null,'case_number'");
  });

  it("expone operaciones tenant-scoped para consultar, crear y registrar resultados", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    expect(sql).toContain("function api.fn_consultar_planes_seguimiento");
    expect(sql).toContain("function api.fn_resumen_planes_seguimiento");
    expect(sql).toContain("function api.fn_crear_plan_seguimiento");
    expect(sql).toContain("function api.fn_registrar_resultado_seguimiento");
    expect(sql).toContain("p_empresa");
    expect(sql).toContain("p_app");
  });
});
