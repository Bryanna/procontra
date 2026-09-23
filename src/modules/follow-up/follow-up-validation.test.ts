import { parseContactPayload, parseNewPlanPayload } from "./follow-up-validation";

describe("validación de operaciones de seguimiento", () => {
  it("acepta un plan mensual con receta estructurada y canales", () => {
    expect(parseNewPlanPayload({
      patientId: "20000000-0000-4000-8000-000000000001",
      insurerCode: "senasa",
      firstPurchaseDate: "2026-07-01",
      prescriptionNumber: "RX-2026-001",
      prescriptionDate: "2026-06-30",
      prescriptionItems: [
        { medicine: "ARACURE 32 MG", dosage: "1 tableta diaria", quantity: "30" },
        { medicine: "LOSARTÁN 50 MG" },
      ],
      reminderChannels: ["call", "whatsapp", "call"],
      reminderLeadDays: 7,
      doctor: "Dra. Ejemplo",
    })).toMatchObject({
      insurerCode: "senasa",
      prescriptionNumber: "RX-2026-001",
      prescriptionDate: "2026-06-30",
      medicines: "ARACURE 32 MG, LOSARTÁN 50 MG",
      prescriptionItems: [
        { position: 1, medicine: "ARACURE 32 MG", dosage: "1 tableta diaria", quantity: 30 },
        { position: 2, medicine: "LOSARTÁN 50 MG", dosage: null, quantity: null },
      ],
      reminderChannels: ["call", "whatsapp"],
      reminderLeadDays: 3,
    });
  });

  it("rechaza fechas de compra o receta posteriores al día de ejecución", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-23T16:00:00Z"));
    const base = {
      patientId: "20000000-0000-4000-8000-000000000001",
      insurerCode: "senasa",
      firstPurchaseDate: "2026-09-23",
      prescriptionNumber: "RX-1",
      prescriptionDate: "2026-09-23",
      prescriptionItems: [{ medicine: "MEDICAMENTO" }],
      reminderChannels: ["call"],
    };
    expect(() => parseNewPlanPayload({ ...base, firstPurchaseDate: "2026-09-24" })).toThrow("Fecha de primera compra inválida");
    expect(() => parseNewPlanPayload({ ...base, prescriptionDate: "2026-09-24" })).toThrow("Fecha de receta inválida");
    expect(parseNewPlanPayload(base)).toMatchObject({ firstPurchaseDate: "2026-09-23", prescriptionDate: "2026-09-23" });
    vi.useRealTimers();
  });

  it("exige receta estructurada y canales de recordatorio válidos", () => {
    const base = {
      patientId: "20000000-0000-4000-8000-000000000001",
      insurerCode: "senasa",
      firstPurchaseDate: "2026-07-01",
      prescriptionNumber: "RX-1",
      prescriptionDate: "2026-07-01",
      prescriptionItems: [{ medicine: "MEDICAMENTO" }],
      reminderChannels: ["call"],
    };
    expect(() => parseNewPlanPayload({ ...base, prescriptionItems: [] })).toThrow("Renglones de receta requeridos");
    expect(() => parseNewPlanPayload({ ...base, reminderChannels: ["in_person"] })).toThrow("Canales de recordatorio inválidos");
  });

  it("acepta una programación digitada por el usuario", () => {
    expect(parseNewPlanPayload({
      patientId: "20000000-0000-4000-8000-000000000001",
      insurerCode: "senasa",
      firstPurchaseDate: "2026-07-01",
      prescriptionNumber: "RX-2",
      prescriptionDate: "2026-07-01",
      prescriptionItems: [{ medicine: "ARACURE 32 MG" }],
      reminderChannels: ["whatsapp"],
      scheduleMode: "manual",
      prescriptionCount: "5",
      currentPrescription: "2",
      lastPurchaseDate: "2026-08-01",
      nextPurchaseDate: "2026-09-05",
      contactDate: "2026-08-29",
    })).toMatchObject({
      scheduleMode: "manual",
      prescriptionCount: 5,
      currentPrescription: 2,
      nextPurchaseDate: "2026-09-05",
      contactDate: "2026-09-02",
    });
  });

  it("rechaza una programación manual incompleta", () => {
    expect(() => parseNewPlanPayload({
      patientId: "20000000-0000-4000-8000-000000000001",
      insurerCode: "senasa",
      firstPurchaseDate: "2026-07-01",
      prescriptionNumber: "RX-3",
      prescriptionDate: "2026-07-01",
      prescriptionItems: [{ medicine: "ARACURE 32 MG" }],
      reminderChannels: ["call"],
      scheduleMode: "manual",
      prescriptionCount: "2",
      currentPrescription: "3",
    })).toThrow("Programación manual inválida");
  });

  it("exige número de caso para IDOPPRIL", () => {
    expect(() => parseNewPlanPayload({
      patientId: "20000000-0000-4000-8000-000000000001",
      insurerCode: "idoppril",
      firstPurchaseDate: "2026-07-01",
      prescriptionNumber: "RX-4",
      prescriptionDate: "2026-07-01",
      prescriptionItems: [{ medicine: "MEDICAMENTO" }],
      reminderChannels: ["call", "whatsapp"],
    })).toThrow("Número de caso");
  });

  it("rechaza resultados fuera del flujo aprobado", () => {
    expect(() => parseContactPayload({ result: "inventado", channel: "call" })).toThrow("Resultado");
    expect(parseContactPayload({ result: "no_contesto", channel: "call", nextActionDate: "2026-07-02" })).toMatchObject({ result: "no_contesto" });
  });

  it("exige una dispensación verificable cuando el resultado es compró", () => {
    expect(() => parseContactPayload({ result: "compro", channel: "in_person" })).toThrow("Producto dispensado requerido");
    expect(parseContactPayload({
      result: "compro",
      channel: "in_person",
      productId: "30000000-0000-4000-8000-000000000001",
      quantity: "30",
      unitsPerDay: "1",
      directionsVerified: "on",
      idempotencyKey: "followup-10000000-0000-4000-8000-000000000001",
      currentPrescription: "1",
    })).toMatchObject({
      result: "compro",
      productId: "30000000-0000-4000-8000-000000000001",
      quantity: 30,
      unitsPerDay: 1,
      directionsVerified: true,
    });
  });

  it("no permite cantidades inválidas en una compra", () => {
    expect(() => parseContactPayload({
      result: "compro",
      channel: "call",
      productId: "30000000-0000-4000-8000-000000000001",
      quantity: "0",
      idempotencyKey: "followup-10000000-0000-4000-8000-000000000001",
    })).toThrow("Cantidad dispensada inválida");
  });
});
