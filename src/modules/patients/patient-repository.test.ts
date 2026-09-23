import {
  buildPatientSearchResult,
  normalizePatientFilter,
  sanitizePatientQuery,
} from "./patient-repository";

describe("Supabase patient repository", () => {
  it("sanitizes PostgREST control characters and normalizes filters", () => {
    expect(sanitizePatientQuery('maría%,_(test)"')).toBe("maría test");
    expect(normalizePatientFilter("today")).toBe("today");
    expect(normalizePatientFilter("with_consent")).toBe("with_consent");
    expect(normalizePatientFilter("invalid")).toBe("all");
  });

  it("maps tenant-scoped database rows without inventing patient data", () => {
    expect(buildPatientSearchResult([
      {
        f_uuid: "patient-1",
        f_codigo_interno: "PAC-0001",
        f_nombre_completo: "María Rodríguez",
        f_telefono: "+1 809 555 0142",
        f_identificacion_mascara: "***-*******-8",
        f_nss_mascara: "***6789",
        f_fecha_nacimiento: "1985-04-12",
        f_telefono_verificado: true,
        f_aseguradora: "ARS SENASA",
        f_estado_seguimiento: "yellow",
        f_canal_contacto_preferido: "whatsapp",
        f_sucursal: "Esperanza",
        f_codigo_sucursal: "70",
        f_activo: true,
        f_estado_consentimiento: "active",
        f_creado_en: "2026-08-12T10:00:00Z",
        f_total_registros: 1,
      },
    ], 1, 25)).toEqual({
      items: [{
        id: "patient-1",
        code: "PAC-0001",
        name: "María Rodríguez",
        phone: "+1 809 555 0142",
        governmentIdMask: "***-*******-8",
        insuranceCardMask: "***6789",
        birthDate: "1985-04-12",
        phoneVerified: true,
        insurer: "ARS SENASA",
        followUpStatus: "yellow",
        preferredContactChannel: "whatsapp",
        branch: "Esperanza",
        branchCode: "70",
        active: true,
        consentStatus: "active",
        joinedAt: "2026-08-12T10:00:00Z",
      }],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });
  });
});
