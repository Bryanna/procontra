import { insurerRules, REMINDER_LEAD_DAYS } from "./follow-up-rules";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const contactResults = ["contesto","no_contesto","ya_tiene_receta","no_tiene_receta","tiene_cita_medica","esperando_autorizacion","comprara_efectivo","volver_a_llamar","enviar_a_casa","compro"] as const;
const channels = ["call", "whatsapp", "in_person"] as const;
const reminderChannelValues = ["call", "whatsapp"] as const;

const text = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

function businessDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santo_Domingo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isIsoDate(value: string) {
  if (!datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function subtractIsoDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function parsePrescriptionItems(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) throw new Error("Renglones de receta requeridos");
  return value.map((raw, index) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const medicine = text(item.medicine, 300);
    const dosage = text(item.dosage, 300);
    const quantityText = text(item.quantity, 20);
    const quantity = quantityText ? Number(quantityText) : null;
    if (medicine.length < 2) throw new Error("Renglones de receta inválidos");
    if (quantity !== null && (!Number.isFinite(quantity) || quantity <= 0 || quantity > 999999)) {
      throw new Error("Renglones de receta inválidos");
    }
    return { position: index + 1, medicine, dosage: dosage || null, quantity };
  });
}

export function parseNewPlanPayload(value: unknown) {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const patientId = text(input.patientId, 36);
  const insurerCode = text(input.insurerCode, 40);
  const firstPurchaseDate = text(input.firstPurchaseDate, 10);
  const prescriptionDate = text(input.prescriptionDate, 10);
  const prescriptionItems = parsePrescriptionItems(input.prescriptionItems);
  const medicines = prescriptionItems.map((item) => item.medicine).join(", ").slice(0, 2000);
  const requestedReminderChannels = Array.isArray(input.reminderChannels) ? input.reminderChannels : [];
  const normalizedReminderChannels = [...new Set(requestedReminderChannels.map((channel) => text(channel, 20)))];
  const caseNumber = text(input.caseNumber, 100);
  const requestedMode = text(input.scheduleMode, 20);
  const rule = insurerRules.find((item) => item.code === insurerCode);
  if (!uuidPattern.test(patientId)) throw new Error("Paciente inválido");
  if (!rule) throw new Error("ARS inválida");
  const today = businessDate();
  if (!isIsoDate(firstPurchaseDate) || firstPurchaseDate > today) throw new Error("Fecha de primera compra inválida");
  if (!isIsoDate(prescriptionDate) || prescriptionDate > today) throw new Error("Fecha de receta inválida");
  if (normalizedReminderChannels.length < 1 || normalizedReminderChannels.some((channel) => !reminderChannelValues.includes(channel as typeof reminderChannelValues[number]))) {
    throw new Error("Canales de recordatorio inválidos");
  }
  if (rule.mode === "case_number" && caseNumber.length < 2) throw new Error("Número de caso requerido para IDOPPRIL");
  const scheduleMode = rule.mode === "monthly" && requestedMode === "manual" ? "manual" : "ars_rule";
  const prescriptionCount = Number.parseInt(text(input.prescriptionCount, 2), 10);
  const currentPrescription = Number.parseInt(text(input.currentPrescription, 2), 10);
  const lastPurchaseDate = text(input.lastPurchaseDate, 10);
  const nextPurchaseDate = text(input.nextPurchaseDate, 10);
  if (scheduleMode === "manual" && (
    !Number.isInteger(prescriptionCount) || prescriptionCount < 1 || prescriptionCount > 24 ||
    !Number.isInteger(currentPrescription) || currentPrescription < 1 || currentPrescription > prescriptionCount ||
    !isIsoDate(lastPurchaseDate) || !isIsoDate(nextPurchaseDate) ||
    lastPurchaseDate < firstPurchaseDate || nextPurchaseDate < lastPurchaseDate
  )) throw new Error("Programación manual inválida");
  return {
    patientId, insurerCode, firstPurchaseDate, prescriptionDate,
    prescriptionItems, medicines,
    reminderChannels: normalizedReminderChannels as (typeof reminderChannelValues[number])[],
    reminderLeadDays: REMINDER_LEAD_DAYS,
    scheduleMode,
    prescriptionCount: scheduleMode === "manual" ? prescriptionCount : null,
    currentPrescription: scheduleMode === "manual" ? currentPrescription : 1,
    lastPurchaseDate: scheduleMode === "manual" ? lastPurchaseDate : firstPurchaseDate,
    nextPurchaseDate: scheduleMode === "manual" ? nextPurchaseDate : null,
    contactDate: scheduleMode === "manual" ? subtractIsoDays(nextPurchaseDate, REMINDER_LEAD_DAYS) : null,
    doctor: text(input.doctor, 180) || null,
    caseNumber: caseNumber || null,
    observations: text(input.observations, 1000) || null,
  };
}

export function parseContactPayload(value: unknown) {
  const input = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const result = text(input.result, 40);
  const channel = text(input.channel, 20);
  const nextActionDate = text(input.nextActionDate, 10);
  if (!contactResults.includes(result as typeof contactResults[number])) throw new Error("Resultado inválido");
  if (!channels.includes(channel as typeof channels[number])) throw new Error("Canal inválido");
  if (nextActionDate && !isIsoDate(nextActionDate)) throw new Error("Próxima acción inválida");
  const productId = text(input.productId, 36);
  const quantity = Number(text(input.quantity, 20));
  const unitsPerDayText = text(input.unitsPerDay, 20);
  const unitsPerDay = unitsPerDayText ? Number(unitsPerDayText) : null;
  const directionsVerified = input.directionsVerified === true || input.directionsVerified === "on" || input.directionsVerified === "true";
  const idempotencyKey = text(input.idempotencyKey, 120);
  const currentPrescription = Number.parseInt(text(input.currentPrescription, 2), 10);
  if (result === "compro") {
    if (!uuidPattern.test(productId)) throw new Error("Producto dispensado requerido");
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 999999) throw new Error("Cantidad dispensada inválida");
    if (unitsPerDay !== null && (!Number.isFinite(unitsPerDay) || unitsPerDay <= 0 || unitsPerDay > 9999)) throw new Error("Unidades por día inválidas");
    if (!/^[A-Za-z0-9:_-]{8,120}$/.test(idempotencyKey)) throw new Error("Clave idempotente inválida");
    if (!Number.isInteger(currentPrescription) || currentPrescription < 1 || currentPrescription > 24) throw new Error("Receta actual inválida");
  }
  return {
    result: result as typeof contactResults[number],
    channel: channel as typeof channels[number],
    nextActionDate: nextActionDate || null,
    observations: text(input.observations, 1000) || null,
    productId: result === "compro" ? productId : null,
    quantity: result === "compro" ? quantity : null,
    unitsPerDay: result === "compro" ? unitsPerDay : null,
    directionsVerified: result === "compro" ? directionsVerified : false,
    idempotencyKey: result === "compro" ? idempotencyKey : null,
    currentPrescription: result === "compro" ? currentPrescription : null,
  };
}

export function isUuid(value: string) { return uuidPattern.test(value); }
