import { prepareInsuranceAuthorizationSubmission, type InsuranceAuthorizationInput } from "./authorization-workflow";

const base: InsuranceAuthorizationInput = {
  source: "web",
  branchId: "11111111-1111-4111-8111-111111111111",
  hash: "a".repeat(64),
  storagePath: "private/1/1/authorization.jpeg",
  insurerCode: "primera",
  insurerName: "ARS Primera",
  patientName: "  LOREZA   BERNARDA GOMEZ CLASE ",
  governmentId: "001-1083731-7",
  insuranceCard: "1063071401",
  phone: "(829) 706-2116",
  authorizationNumber: " P26333348279614 ",
  authorizationDate: "2026-09-22",
  prescriber: "YESENIA HIRALDO GONZALEZ",
  authorized: true,
  continuousUse: true,
  consentGranted: true,
  reminderChannels: ["call", "whatsapp"],
  medicines: [
    { medicine: "ATORVASTATINA LAM 40 MG X 100 TAB", quantity: "1" },
    { medicine: "GLUCONIL 25 MG X 30 TAB", quantity: "1" },
  ],
};

describe("insurance authorization workflow", () => {
  it("normalizes a reviewed authorization without inventing clinical data", () => {
    expect(prepareInsuranceAuthorizationSubmission(base, "2026-09-23")).toMatchObject({
      patientName: "LOREZA BERNARDA GOMEZ CLASE",
      governmentId: "00110837317",
      phone: "8297062116",
      authorizationNumber: "P26333348279614",
      authorizationDate: "2026-09-22",
      reminderChannels: ["call", "whatsapp"],
      medicines: [
        { medicine: "ATORVASTATINA LAM 40 MG X 100 TAB", quantity: 1 },
        { medicine: "GLUCONIL 25 MG X 30 TAB", quantity: 1 },
      ],
    });
  });

  it("rejects an authorization that has not been visibly authorized for continuous follow-up", () => {
    expect(() => prepareInsuranceAuthorizationSubmission({ ...base, authorized: false }, "2026-09-23"))
      .toThrow("Estado autorizado requerido");
    expect(() => prepareInsuranceAuthorizationSubmission({ ...base, continuousUse: false }, "2026-09-23"))
      .toThrow("Uso continuo requerido");
    expect(() => prepareInsuranceAuthorizationSubmission({ ...base, consentGranted: false }, "2026-09-23"))
      .toThrow("Consentimiento de seguimiento requerido");
  });

  it("rejects future dates and incomplete medicine quantities", () => {
    expect(() => prepareInsuranceAuthorizationSubmission({ ...base, authorizationDate: "2026-09-24" }, "2026-09-23"))
      .toThrow("Fecha de autorización inválida");
    expect(() => prepareInsuranceAuthorizationSubmission({ ...base, medicines: [{ medicine: "GLUCONIL 25 MG", quantity: "" }] }, "2026-09-23"))
      .toThrow("Medicamentos autorizados inválidos");
  });
});
