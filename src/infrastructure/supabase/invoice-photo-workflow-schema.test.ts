import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("invoice photo workflow schema", () => {
  const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/0009_invoice_photo_workflow.sql"), "utf8");

  it("creates tenant-scoped reviewers, channel identities, invoice lines, reviews and notifications", () => {
    for (const table of [
      "t_revisores_documentos", "t_identidades_canales", "t_facturas_inventario",
      "t_renglones_factura", "t_revisiones_renglones", "t_notificaciones_usuarios",
    ]) expect(sql).toContain(`api.${table}`);
    for (const field of ["f_id", "f_id_secuencia", "f_uuid", "f_email_principal", "f_rnc_principal", "f_idempresa", "f_idsucursal", "f_app"])
      expect(sql).toContain(field);
  });

  it("provides receive, decide and post RPCs with idempotency and human approval", () => {
    expect(sql).toContain("fn_recibir_factura_inventario");
    expect(sql).toContain("fn_decidir_renglon_factura");
    expect(sql).toContain("fn_contabilizar_factura_inventario");
    expect(sql).toContain("f_hash_contenido");
    expect(sql).toContain("f_uuid_aprobado_por");
  });
});
