import { preparePatientCreate, preparePatientUpdate } from "./patient-registration";

describe("patient registration", () => {
  const branchIds = ["11111111-1111-4111-8111-111111111111"];

  it("normalizes a valid patient and keeps consent explicit", () => {
    expect(preparePatientCreate({
      code: " pac-001 ",
      name: "  Ana   Castillo ",
      governmentId: "001-1234567-8",
      insuranceCard: "123-45678-9",
      birthDate: "1985-04-12",
      phone: "809-555-0101",
      phoneVerified: true,
      insurer: "ARS SENASA",
      followUpStatus: "yellow",
      preferredContactChannel: "whatsapp",
      branchId: branchIds[0],
      consentGranted: true,
    }, branchIds)).toEqual({
      code: "PAC-001",
      name: "Ana Castillo",
      governmentId: "00112345678",
      insuranceCard: "123456789",
      birthDate: "1985-04-12",
      phone: "8095550101",
      phoneVerified: true,
      insurer: "ARS SENASA",
      followUpStatus: "yellow",
      preferredContactChannel: "whatsapp",
      branchId: branchIds[0],
      consentGranted: true,
    });
  });

  it("rejects invalid identity, phone and tenant branch values", () => {
    expect(() => preparePatientCreate({ name: "A", phone: "123", branchId: branchIds[0] }, branchIds)).toThrow("Nombre de paciente inválido");
    expect(() => preparePatientCreate({ name: "Ana Castillo", governmentId: "001-123", phone: "8095550101", branchId: branchIds[0] }, branchIds)).toThrow("Cédula de paciente inválida");
    expect(() => preparePatientCreate({ name: "Ana Castillo", insuranceCard: "123", phone: "8095550101", branchId: branchIds[0] }, branchIds)).toThrow("Carnet de paciente inválido");
    expect(() => preparePatientCreate({ name: "Ana Castillo", birthDate: "2030-01-01", phone: "8095550101", branchId: branchIds[0] }, branchIds)).toThrow("Fecha de nacimiento inválida");
    expect(() => preparePatientCreate({ name: "Ana Castillo", phone: "123", branchId: branchIds[0] }, branchIds)).toThrow("Teléfono de paciente inválido");
    expect(() => preparePatientCreate({ name: "Ana Castillo", phone: "28095550101", branchId: branchIds[0] }, branchIds)).toThrow("Teléfono de paciente inválido");
    expect(() => preparePatientCreate({ name: "Ana Castillo", phone: "180955501011", branchId: branchIds[0] }, branchIds)).toThrow("Teléfono de paciente inválido");
    expect(() => preparePatientCreate({ name: "Ana Castillo", phone: "8095550101", followUpStatus: "unknown", branchId: branchIds[0] }, branchIds)).toThrow("Estado de seguimiento inválido");
    expect(() => preparePatientCreate({ name: "Ana Castillo", phone: "8095550101", preferredContactChannel: "email", branchId: branchIds[0] }, branchIds)).toThrow("Canal de contacto inválido");
    expect(() => preparePatientCreate({ name: "Ana Castillo", phone: "8095550101", branchId: "22222222-2222-4222-8222-222222222222" }, branchIds)).toThrow("Sucursal de paciente inválida");
  });

  it("accepts only a 10-digit Dominican phone", () => {
    expect(preparePatientCreate({ name: "Ana Castillo", phone: "(809) 555-0101", branchId: branchIds[0] }, branchIds).phone).toBe("8095550101");
    expect(() => preparePatientCreate({ name: "Ana Castillo", phone: "+1 809 555 0101", branchId: branchIds[0] }, branchIds)).toThrow("Teléfono de paciente inválido");
  });

  it("prepares an editable patient record while preserving omitted protected identifiers", () => {
    expect(preparePatientUpdate({
      name: "  Ana   Castillo ", phone: "(809) 555-0101", insurer: "ARS SENASA",
      birthDate: "1985-04-12", phoneVerified: true, followUpStatus: "yellow",
      preferredContactChannel: "call", branchId: branchIds[0], active: false,
      governmentId: "", insuranceCard: "",
    }, branchIds)).toEqual({
      name: "Ana Castillo", phone: "8095550101", insurer: "ARS SENASA",
      birthDate: "1985-04-12", phoneVerified: true, followUpStatus: "yellow",
      preferredContactChannel: "call", branchId: branchIds[0], active: false,
      governmentId: null, insuranceCard: null,
    });
  });
});
