import {
  calculatePrescriptionSchedule,
  findInsurerRule,
  insurerRules,
  REMINDER_LEAD_DAYS,
} from "./follow-up-rules";

describe("reglas de seguimiento por ARS", () => {
  it("mantiene las reglas institucionales y sus alias", () => {
    expect(insurerRules).toHaveLength(19);
    expect(findInsurerRule("MAPFRE Salud ARS")?.prescriptionMonths).toBe(6);
    expect(findInsurerRule("Humano Seguro")?.prescriptionMonths).toBe(6);
    expect(findInsurerRule("Seguro Yunen")?.prescriptionMonths).toBe(3);
    expect(findInsurerRule("ARS-CMD")?.prescriptionMonths).toBe(3);
    expect(findInsurerRule("IDOPPRIL")?.mode).toBe("case_number");
  });

  it("calcula cada receta desde la primera compra y fija el contacto tres días antes", () => {
    const schedule = calculatePrescriptionSchedule("2026-01-31", 3, "2026-05-01");

    expect(REMINDER_LEAD_DAYS).toBe(3);
    expect(schedule).toEqual([
      { number: 1, prescriptionDate: "2026-01-31", contactDate: "2026-01-28" },
      { number: 2, prescriptionDate: "2026-02-28", contactDate: "2026-02-25" },
      { number: 3, prescriptionDate: "2026-03-31", contactDate: "2026-03-28" },
    ]);
  });

  it("limita el calendario a la fecha de corte solicitada", () => {
    expect(calculatePrescriptionSchedule("2026-01-31", 6, "2026-03-01")).toHaveLength(2);
  });

  it("no genera calendario automático para IDOPPRIL", () => {
    expect(calculatePrescriptionSchedule("2026-01-10", null, "2026-12-31")).toEqual([]);
  });
});
