import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/0025_insurance_authorization_documents.sql"), "utf8");

describe("insurance authorization document schema", () => {
  it("creates tenant-scoped authorization records and immutable medicine evidence", () => {
    for (const table of ["t_autorizaciones_seguros", "t_renglones_autorizacion"])
      expect(sql).toContain(`api.${table}`);
    for (const field of ["f_id", "f_id_secuencia", "f_uuid", "f_email_principal", "f_rnc_principal", "f_idempresa", "f_idsucursal", "f_app"])
      expect(sql).toContain(field);
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("fn_bloquear_mutacion_renglon_autorizacion");
  });

  it("registers a deduplicated document, patient and continuity plan atomically", () => {
    expect(sql).toContain("fn_registrar_autorizacion_continuidad");
    expect(sql).toContain("f_hash_contenido");
    expect(sql).toContain("extensions.hmac");
    expect(sql).toContain("fn_crear_paciente");
    expect(sql).toContain("fn_crear_plan_seguimiento");
    expect(sql).toContain("insurance_authorization.registered");
    expect(sql).toContain("'insurance_authorization'");
    expect(sql).toContain("documents_document_type_check");
    expect(sql).toContain("'linked'");
    expect(sql).not.toContain("insert into api.t_movimientos_inventario");
  });
});
