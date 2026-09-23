export interface PatientCreateInput {
  code?: unknown;
  name?: unknown;
  governmentId?: unknown;
  insuranceCard?: unknown;
  birthDate?: unknown;
  phone?: unknown;
  phoneVerified?: unknown;
  insurer?: unknown;
  followUpStatus?: unknown;
  preferredContactChannel?: unknown;
  branchId?: unknown;
  consentGranted?: unknown;
}

export interface PreparedPatientCreate {
  code: string | null;
  name: string;
  governmentId: string | null;
  insuranceCard: string | null;
  birthDate: string | null;
  phone: string;
  phoneVerified: boolean;
  insurer: string | null;
  followUpStatus: PatientFollowUpStatus;
  preferredContactChannel: PatientContactChannel;
  branchId: string;
  consentGranted: boolean;
}

export interface PatientUpdateInput extends PatientCreateInput {
  active?: unknown;
}

export interface PreparedPatientUpdate {
  name: string;
  governmentId: string | null;
  insuranceCard: string | null;
  birthDate: string | null;
  phone: string;
  phoneVerified: boolean;
  insurer: string | null;
  followUpStatus: PatientFollowUpStatus;
  preferredContactChannel: PatientContactChannel;
  branchId: string;
  active: boolean;
}

export type PatientFollowUpStatus = "green" | "yellow" | "red" | "clinical";
export type PatientContactChannel = "whatsapp" | "call";

export const patientFollowUpStatuses: readonly PatientFollowUpStatus[] = ["green", "yellow", "red", "clinical"];
export const patientContactChannels: readonly PatientContactChannel[] = ["whatsapp", "call"];

export const acceptedPatientInsurers = [
  "ARS Abel González", "ARS APS", "ARS ASEMAP", "ARS Futuro", "ARS GMA", "ARS Meta Salud",
  "ARS Monumental", "ARS Primera", "ARS Renacer SRL", "ARS Reservas", "ARS SEMMA", "ARS SENASA",
  "ARS SENASA Pensionados y Jubilados", "ARS Universal", "ARS Yunen", "ARS-CMD", "Humano Seguros",
  "IDOPPRIL", "MAPFRE Salud ARS", "Seguros Yunen",
] as const;

const clean = (value: unknown) => typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
const digits = (value: unknown) => clean(value).replace(/\D/g, "");

export function preparePatientCreate(input: PatientCreateInput, allowedBranchIds: string[]): PreparedPatientCreate {
  const code = clean(input.code).toUpperCase();
  const name = clean(input.name);
  const governmentId = digits(input.governmentId);
  const insuranceCard = digits(input.insuranceCard);
  const birthDate = clean(input.birthDate);
  const rawPhone = clean(input.phone);
  const phoneDigits = digits(rawPhone);
  const phone = phoneDigits.length === 11 && phoneDigits.startsWith("1") ? `+${phoneDigits}` : phoneDigits;
  const insurer = clean(input.insurer);
  const followUpStatus = clean(input.followUpStatus) || "green";
  const preferredContactChannel = clean(input.preferredContactChannel) || "whatsapp";
  const branchId = clean(input.branchId);
  if (code && (code.length < 3 || code.length > 60 || !/^[A-Z0-9-]+$/.test(code))) throw new Error("Código de paciente inválido");
  if (name.length < 3 || name.length > 240) throw new Error("Nombre de paciente inválido");
  if (governmentId && !/^[0-9]{11}$/.test(governmentId)) throw new Error("Cédula de paciente inválida");
  if (insuranceCard && !/^[0-9]{8,12}$/.test(insuranceCard)) throw new Error("Carnet de paciente inválido");
  if (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || birthDate < "1900-01-01" || birthDate > new Date().toISOString().slice(0, 10))) throw new Error("Fecha de nacimiento inválida");
  if (!(phoneDigits.length === 10 || (phoneDigits.length === 11 && phoneDigits.startsWith("1")))) throw new Error("Teléfono de paciente inválido");
  if (!allowedBranchIds.includes(branchId)) throw new Error("Sucursal de paciente inválida");
  if (insurer && !acceptedPatientInsurers.includes(insurer as typeof acceptedPatientInsurers[number])) throw new Error("Aseguradora de paciente inválida");
  if (!patientFollowUpStatuses.includes(followUpStatus as PatientFollowUpStatus)) throw new Error("Estado de seguimiento inválido");
  if (!patientContactChannels.includes(preferredContactChannel as PatientContactChannel)) throw new Error("Canal de contacto inválido");
  return {
    code: code || null,
    name,
    governmentId: governmentId || null,
    insuranceCard: insuranceCard || null,
    birthDate: birthDate || null,
    phone,
    phoneVerified: input.phoneVerified === true,
    insurer: insurer || null,
    followUpStatus: followUpStatus as PatientFollowUpStatus,
    preferredContactChannel: preferredContactChannel as PatientContactChannel,
    branchId,
    consentGranted: input.consentGranted === true,
  };
}

export function preparePatientUpdate(input: PatientUpdateInput, allowedBranchIds: string[]): PreparedPatientUpdate {
  const prepared = preparePatientCreate(input, allowedBranchIds);
  return {
    name: prepared.name,
    governmentId: prepared.governmentId,
    insuranceCard: prepared.insuranceCard,
    birthDate: prepared.birthDate,
    phone: prepared.phone,
    phoneVerified: prepared.phoneVerified,
    insurer: prepared.insurer,
    followUpStatus: prepared.followUpStatus,
    preferredContactChannel: prepared.preferredContactChannel,
    branchId: prepared.branchId,
    active: input.active === true,
  };
}
