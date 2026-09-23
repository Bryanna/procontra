import {
  buildFollowUpSearchResult,
  normalizeFollowUpStatus,
  sanitizeFollowUpQuery,
  type FollowUpPlanRow,
} from "./follow-up-repository";

const row: FollowUpPlanRow = {
  f_uuid: "10000000-0000-4000-8000-000000000001",
  f_uuid_paciente: "20000000-0000-4000-8000-000000000001",
  f_nombre_completo: "Ana Pérez",
  f_telefono: "809-555-0101",
  f_ars: "ARS SENASA",
  f_codigo_ars: "senasa",
  f_cantidad_recetas: 3,
  f_modo: "monthly",
  f_sucursal: "Esperanza",
  f_codigo_sucursal: "70",
  f_medicamentos: "ARACURE 32 MG",
  f_medico: "Dra. Ejemplo",
  f_numero_caso: null,
  f_fecha_primera_compra: "2026-07-01",
  f_fecha_ultima_compra: "2026-07-01",
  f_numero_receta_actual: 1,
  f_proxima_compra: "2026-08-01",
  f_fecha_contacto: "2026-07-25",
  f_estado: "active",
  f_ultimo_resultado: "no_contesto",
  f_total_registros: 1,
};

describe("repositorio de seguimiento", () => {
  it("mapea filas tenant-scoped a la vista operativa", () => {
    const result = buildFollowUpSearchResult([row], 1, 25);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      patientName: "Ana Pérez",
      insurer: "ARS SENASA",
      currentPrescription: 1,
      prescriptionCount: 3,
      nextPurchaseDate: "2026-08-01",
      contactDate: "2026-07-25",
    });
  });

  it("normaliza filtros y limpia búsquedas para PostgREST", () => {
    expect(normalizeFollowUpStatus("unknown")).toBe("all");
    expect(normalizeFollowUpStatus("active")).toBe("active");
    expect(normalizeFollowUpStatus("contact_today")).toBe("contact_today");
    expect(normalizeFollowUpStatus("overdue")).toBe("overdue");
    expect(normalizeFollowUpStatus("next_3_days")).toBe("next_3_days");
    expect(normalizeFollowUpStatus("next_7_days")).toBe("all");
    expect(sanitizeFollowUpQuery(" Ana%_*  Pérez ")).toBe("Ana Pérez");
  });

});
