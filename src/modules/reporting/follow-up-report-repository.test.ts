import {
  buildFollowUpReport,
  normalizeReportDataScope,
  normalizeReportResult,
  sanitizeReportQuery,
  type FollowUpReportRow,
} from "./follow-up-report-repository";

const row: FollowUpReportRow = {
  f_uuid: "10000000-0000-4000-8000-000000000001",
  f_nombre_completo: "PRUEBA SENASA 01",
  f_telefono: "809-555-1001",
  f_sucursal: "Esperanza",
  f_codigo_sucursal: "70",
  f_ars: "ARS SENASA",
  f_medicamentos: "JARINU 25 MG",
  f_medico: "Médico de prueba",
  f_fecha_primera_compra: "2026-08-15",
  f_proxima_compra: "2026-09-15",
  f_fecha_contacto: "2026-09-08",
  f_estado: "active",
  f_ultimo_resultado: "contesto",
  f_total_contactos: 1,
  f_ultimo_contacto_en: "2026-09-08T14:30:00Z",
  f_es_prueba: true,
  f_fuente_referencia: "CONTROL DE USO CONTINUO ARS SENASA2.xlsx · fila 107",
  f_total_registros: 1,
};

describe("repositorio del reporte de seguimiento", () => {
  it("mapea el reporte y conserva la etiqueta de datos de prueba", () => {
    const report = buildFollowUpReport([row], 1, 50, {
      f_total: 1,
      f_contactar_hoy: 0,
      f_atrasados: 1,
      f_proximos_7_dias: 0,
      f_contactados: 1,
      f_no_contestaron: 0,
      f_sin_receta: 0,
      f_completados: 0,
    });
    expect(report.items[0]).toMatchObject({ patientName: "PRUEBA SENASA 01", isTest: true, lastResult: "contesto" });
    expect(report.summary).toMatchObject({ total: 1, overdue: 1, contacted: 1 });
  });

  it("normaliza filtros y limpia búsquedas", () => {
    expect(normalizeReportDataScope("unknown")).toBe("all");
    expect(normalizeReportDataScope("test")).toBe("test");
    expect(normalizeReportResult("no_contesto")).toBe("no_contesto");
    expect(normalizeReportResult("inventado")).toBe("all");
    expect(sanitizeReportQuery(" PRUEBA%_*  SENASA ")).toBe("PRUEBA SENASA");
  });
});
