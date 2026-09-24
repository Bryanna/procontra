export interface InsuranceAuthorizationInput {
  source: "web" | "whatsapp";
  branchId: string;
  hash: string;
  storagePath: string;
  insurerCode: string;
  insurerName: string;
  patientName: string;
  governmentId?: string;
  insuranceCard?: string;
  phone: string;
  authorizationNumber: string;
  authorizationDate: string;
  prescriber?: string;
  authorized: boolean;
  continuousUse: boolean;
  consentGranted: boolean;
  reminderChannels: Array<"call" | "whatsapp">;
  medicines: Array<{ medicine: string; quantity: string | number }>;
}

export interface InsuranceAuthorizationSubmission extends Omit<InsuranceAuthorizationInput, "governmentId" | "insuranceCard" | "phone" | "patientName" | "authorizationNumber" | "insurerCode" | "insurerName" | "prescriber" | "medicines"> {
  governmentId: string;
  insuranceCard: string;
  phone: string;
  patientName: string;
  authorizationNumber: string;
  insurerCode: string;
  insurerName: string;
  prescriber: string;
  medicines: Array<{ medicine: string; quantity: number }>;
}

function compact(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export function prepareInsuranceAuthorizationSubmission(input: InsuranceAuthorizationInput, currentDate: string): InsuranceAuthorizationSubmission {
  const branchId = compact(input.branchId);
  const hash = compact(input.hash).toLowerCase();
  const storagePath = compact(input.storagePath);
  const insurerCode = compact(input.insurerCode).toLowerCase();
  const insurerName = compact(input.insurerName);
  const patientName = compact(input.patientName);
  const governmentId = digits(input.governmentId);
  const insuranceCard = digits(input.insuranceCard);
  const phone = digits(input.phone);
  const authorizationNumber = compact(input.authorizationNumber);
  const authorizationDate = compact(input.authorizationDate);
  const prescriber = compact(input.prescriber);
  const reminderChannels = [...new Set(input.reminderChannels)];
  const medicines = input.medicines.map((item) => ({ medicine: compact(item.medicine), quantity: Number(item.quantity) }));

  if (!input.authorized) throw new Error("Estado autorizado requerido");
  if (!input.continuousUse) throw new Error("Uso continuo requerido");
  if (!input.consentGranted) throw new Error("Consentimiento de seguimiento requerido");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(authorizationDate) || authorizationDate > currentDate)
    throw new Error("Fecha de autorización inválida");
  if (!medicines.length || medicines.some((item) => item.medicine.length < 2 || !Number.isFinite(item.quantity) || item.quantity <= 0 || item.quantity > 999999))
    throw new Error("Medicamentos autorizados inválidos");
  if (!/^[0-9a-f]{64}$/.test(hash) || !storagePath.startsWith("private/")) throw new Error("Documento de autorización inválido");
  if (!/^[0-9a-f-]{36}$/i.test(branchId)) throw new Error("Sucursal inválida");
  if (insurerCode.length < 2 || insurerName.length < 2) throw new Error("ARS requerida");
  if (patientName.length < 3 || patientName.length > 240) throw new Error("Nombre de paciente inválido");
  if (!/^\d{10,15}$/.test(phone)) throw new Error("Teléfono de paciente inválido");
  if (governmentId && !/^\d{11}$/.test(governmentId)) throw new Error("Cédula de paciente inválida");
  if (insuranceCard && !/^\d{8,12}$/.test(insuranceCard)) throw new Error("Carnet de paciente inválido");
  if (authorizationNumber.length < 2 || authorizationNumber.length > 120) throw new Error("Número de autorización requerido");
  if (!reminderChannels.length || reminderChannels.some((channel) => channel !== "call" && channel !== "whatsapp"))
    throw new Error("Canales de recordatorio inválidos");

  return {
    ...input,
    source: input.source,
    branchId,
    hash,
    storagePath,
    insurerCode,
    insurerName,
    patientName,
    governmentId,
    insuranceCard,
    phone,
    authorizationNumber,
    authorizationDate,
    prescriber,
    reminderChannels,
    medicines,
  };
}
