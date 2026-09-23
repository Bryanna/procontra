export type InsurerRuleMode = "monthly" | "case_number";

export interface InsurerRule {
  code: string;
  name: string;
  prescriptionMonths: number | null;
  mode: InsurerRuleMode;
  aliases: readonly string[];
}

export interface PrescriptionScheduleItem {
  number: number;
  prescriptionDate: string;
  contactDate: string;
}

export const REMINDER_LEAD_DAYS = 3;

export const insurerRules: readonly InsurerRule[] = [
  { code: "mapfre", name: "MAPFRE Salud ARS", prescriptionMonths: 6, mode: "monthly", aliases: ["Mapfre", "MAPFRE"] },
  { code: "monumental", name: "ARS Monumental", prescriptionMonths: 4, mode: "monthly", aliases: ["Monumental"] },
  { code: "aps", name: "ARS APS", prescriptionMonths: 3, mode: "monthly", aliases: ["APS"] },
  { code: "humano", name: "Humano Seguros", prescriptionMonths: 6, mode: "monthly", aliases: ["Humano", "Humano Seguro"] },
  { code: "renacer", name: "ARS Renacer SRL", prescriptionMonths: 3, mode: "monthly", aliases: ["ARS Renacer", "Renacer"] },
  { code: "futuro", name: "ARS Futuro", prescriptionMonths: 3, mode: "monthly", aliases: ["Futuro"] },
  { code: "universal", name: "ARS Universal", prescriptionMonths: 6, mode: "monthly", aliases: ["Universal"] },
  { code: "asemap", name: "ARS ASEMAP", prescriptionMonths: 3, mode: "monthly", aliases: ["ASEMAP"] },
  { code: "metasalud", name: "ARS Meta Salud", prescriptionMonths: 3, mode: "monthly", aliases: ["MetaSalud", "Meta Salud"] },
  { code: "idoppril", name: "IDOPPRIL", prescriptionMonths: null, mode: "case_number", aliases: [] },
  { code: "semma-pyp", name: "ARS SEMMA PyP", prescriptionMonths: 6, mode: "monthly", aliases: ["Semma PyP", "SEMMA PYP"] },
  { code: "reservas", name: "ARS Reservas", prescriptionMonths: 3, mode: "monthly", aliases: ["ASR Reservas", "Reservas"] },
  { code: "gma", name: "ARS GMA", prescriptionMonths: 3, mode: "monthly", aliases: ["GMA"] },
  { code: "yunen", name: "ARS Yunen / Seguros Yunen", prescriptionMonths: 3, mode: "monthly", aliases: ["ARS Yunen", "Seguro Yunen", "Seguros Yunen", "ARS Yunen y Seguro Yunen"] },
  { code: "cmd", name: "ARS-CMD", prescriptionMonths: 3, mode: "monthly", aliases: ["Ars CMD", "Colegio Medico Dominicano", "Colegio Médico Dominicano"] },
  { code: "semma-70-30", name: "ARS SEMMA 70/30", prescriptionMonths: 3, mode: "monthly", aliases: ["Semma 70/30", "SEMMA 70-30"] },
  { code: "senasa", name: "ARS SENASA", prescriptionMonths: 3, mode: "monthly", aliases: ["Senasa"] },
  { code: "primera", name: "ARS Primera", prescriptionMonths: 6, mode: "monthly", aliases: ["Primera Humano", "Ars Primera", "Primera"] },
  { code: "abel-gonzalez", name: "ARS Abel González", prescriptionMonths: 3, mode: "monthly", aliases: ["Ars Abel Gonzalez", "Abel González", "Abel Gonzalez"] },
] as const;

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export function findInsurerRule(value: string): InsurerRule | undefined {
  const target = normalize(value);
  return insurerRules.find((rule) => [rule.name, ...rule.aliases].some((candidate) => normalize(candidate) === target));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addAnchoredMonths(firstPurchase: Date, months: number) {
  const year = firstPurchase.getUTCFullYear();
  const month = firstPurchase.getUTCMonth() + months;
  const day = firstPurchase.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

const toIsoDate = (date: Date) => date.toISOString().slice(0, 10);

export function calculatePrescriptionSchedule(
  firstPurchaseDate: string,
  prescriptionMonths: number | null,
  throughDate?: string,
): PrescriptionScheduleItem[] {
  if (!prescriptionMonths || prescriptionMonths < 1) return [];
  const firstPurchase = new Date(`${firstPurchaseDate}T00:00:00Z`);
  if (Number.isNaN(firstPurchase.getTime())) return [];
  const schedule = Array.from({ length: prescriptionMonths }, (_, index) => {
    const prescriptionDate = addAnchoredMonths(firstPurchase, index);
    return {
      number: index + 1,
      prescriptionDate: toIsoDate(prescriptionDate),
      contactDate: toIsoDate(addUtcDays(prescriptionDate, -REMINDER_LEAD_DAYS)),
    };
  });
  return throughDate ? schedule.filter((item) => item.prescriptionDate <= throughDate) : schedule;
}
