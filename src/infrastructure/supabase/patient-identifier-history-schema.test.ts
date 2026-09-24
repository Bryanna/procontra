import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migrationPath = resolve(process.cwd(), "supabase/migrations/0027_patient_identifier_history.sql");

describe("patient identifier history schema", () => {
  it("stores prior cédula and policy values encrypted within the tenant", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    expect(sql).toContain("create table if not exists api.t_historial_identificadores_paciente");
    for (const field of ["f_id", "f_id_secuencia", "f_uuid", "f_email_principal", "f_rnc_principal", "f_idempresa", "f_idsucursal", "f_app"])
      expect(sql).toContain(field);
    expect(sql).toContain("f_valor_cifrado");
    expect(sql).toContain("f_valor_hash");
    expect(sql).toContain("f_valor_mascara");
    expect(sql).toContain("f_uuid_actor");
    expect(sql).toContain("insert into api.t_historial_identificadores_paciente");
    expect(sql).toContain("v_identificacion_hash is distinct from v_identificacion_hash_actual");
    expect(sql).toContain("v_nss_hash is distinct from v_nss_hash_actual");
  });

  it("decrypts current identifiers only through a tenant and role checked function", () => {
    const sql = readFileSync(migrationPath, "utf8").toLowerCase();
    expect(sql).toContain("api.fn_consultar_identificadores_paciente");
    expect(sql).toContain("extensions.pgp_sym_decrypt");
    expect(sql).toContain("p.f_idempresa=v_empresa");
    expect(sql).toContain("p.f_app=v_app");
    expect(sql).toContain("v_rol not in ('administrator','coordinator','attention')");
    expect(sql).toContain("grant execute on function api.fn_consultar_identificadores_paciente");
    expect(sql).toContain("enable row level security");
  });
});
