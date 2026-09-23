import { readFileSync } from "node:fs";
import { join } from "node:path";

const sql = readFileSync(join(process.cwd(), "supabase/migrations/0023_prescription_centered_follow_up.sql"), "utf8").toLowerCase();

describe("registro de seguimiento centrado en receta", () => {
  it("agrega cabecera de receta, canales y renglones tenant-scoped", () => {
    expect(sql).toContain("create table if not exists api.t_items_receta_seguimiento");
    for (const field of [
      "f_id", "f_id_secuencia", "f_uuid", "f_email_principal", "f_rnc_principal",
      "f_idempresa", "f_idsucursal", "f_app", "f_numero_receta", "f_fecha_receta",
      "f_canales_recordatorio", "f_dias_anticipacion_recordatorio",
    ]) expect(sql).toContain(field);
    expect(sql).toContain("check (f_dias_anticipacion_recordatorio = 3)");
    expect(sql).toContain("call");
    expect(sql).toContain("whatsapp");
  });

  it("crea el plan, sus items y el evento de trazabilidad en una sola RPC", () => {
    expect(sql).toContain("function api.fn_crear_plan_seguimiento");
    expect(sql).toContain("p_items jsonb");
    expect(sql).toContain("jsonb_array_elements");
    expect(sql).toContain("insert into api.t_items_receta_seguimiento");
    expect(sql).toContain("follow_up.plan_registered");
    expect(sql).toContain("t_eventos_auditoria");
  });

  it("fija tres días en servidor y vuelve contactos append-only", () => {
    expect(sql).toContain("interval '3 days'");
    expect(sql).not.toContain("interval '7 days'");
    expect(sql).toContain("fn_bloquear_mutacion_contacto_seguimiento");
    expect(sql).toContain("before update or delete on api.t_contactos_seguimiento");
    expect(sql).toContain("contactos de seguimiento son inmutables");
  });

  it("conserva el resumen de medicamentos para planes existentes", () => {
    expect(sql).toContain("f_medicamentos");
    expect(sql).toContain("string_agg");
  });

});
