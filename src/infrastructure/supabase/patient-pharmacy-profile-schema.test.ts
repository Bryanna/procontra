import { readFileSync } from "node:fs";
import { join } from "node:path";

const path = join(process.cwd(), "supabase/migrations/0012_patient_pharmacy_profile.sql");

describe("patient pharmacy profile migration", () => {
  it("stores sensitive identifiers encrypted and tenant-deduplicated", () => {
    const sql = readFileSync(path, "utf8").toLowerCase();
    for (const field of [
      "f_identificacion_cifrada", "f_identificacion_hash", "f_identificacion_mascara",
      "f_nss_cifrado", "f_nss_hash", "f_nss_mascara",
    ]) expect(sql).toContain(field);
    expect(sql).toContain("extensions.pgp_sym_encrypt");
    expect(sql).toContain("extensions.hmac");
    expect(sql).toContain("ux_t_pacientes_tenant_identificacion_hash");
    expect(sql).toContain("ux_t_pacientes_tenant_nss_hash");
  });

  it("adds only plan-supported identity and follow-up fields", () => {
    const sql = readFileSync(path, "utf8").toLowerCase();
    for (const field of [
      "f_fecha_nacimiento", "f_telefono_verificado_en", "f_estado_seguimiento", "f_canal_contacto_preferido",
    ]) expect(sql).toContain(field);
    expect(sql).toContain("check (f_estado_seguimiento in ('green','yellow','red','clinical'))");
    expect(sql).toContain("check (f_canal_contacto_preferido in ('whatsapp','call'))");
    expect(sql).toContain("create or replace function api.fn_crear_paciente");
    expect(sql).toContain("create or replace function api.fn_consultar_pacientes");
    expect(sql).toContain("grant execute on function api.fn_crear_paciente");
  });
});
