import { buildReservationSearchResult, normalizeReservationStatus } from "./reservation-repository";

describe("reservation repository", () => {
  it("maps tenant-scoped reservation rows without inventing data", () => {
    const result = buildReservationSearchResult([{
      f_uuid: "r-1", f_referencia: "RES-001", f_uuid_paciente: "p-1", f_nombre_paciente: "Ana Pérez",
      f_telefono: "8095550000", f_uuid_producto: "m-1", f_codigo_producto: "001", f_nombre_producto: "Losartán",
      f_presentacion: "Caja", f_uuid_sucursal: "s-1", f_codigo_sucursal: "70", f_nombre_sucursal: "Esperanza",
      f_cantidad: 2, f_estado: "confirmed", f_expira_en: "2026-09-16T12:00:00Z", f_creado_en: "2026-09-15T12:00:00Z", f_total_registros: 1,
    }], 1, 25);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ id: "r-1", patientName: "Ana Pérez", productName: "Losartán", status: "confirmed" });
  });

  it("accepts only database reservation states", () => {
    expect(normalizeReservationStatus("confirmed")).toBe("confirmed");
    expect(normalizeReservationStatus("invented")).toBe("all");
  });
});
