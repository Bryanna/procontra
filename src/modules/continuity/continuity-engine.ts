export interface ContinuityInput {
  dispensedAt: string;
  usableUnits: number;
  unitsPerDay: number;
  leadDays: number;
  directionsVerified: boolean;
}

export type ContinuityResult =
  | { status: "calculated"; coverageDays: number; depletionDate: string; alertDate: string }
  | { status: "review_required"; reason: "directions_unverified" | "invalid_daily_use" | "invalid_quantity" | "invalid_lead_time" };

function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function calculateContinuityCycle(input: ContinuityInput): ContinuityResult {
  if (!input.directionsVerified) {
    return { status: "review_required", reason: "directions_unverified" };
  }
  if (!Number.isFinite(input.unitsPerDay) || input.unitsPerDay <= 0) {
    return { status: "review_required", reason: "invalid_daily_use" };
  }
  if (!Number.isFinite(input.usableUnits) || input.usableUnits <= 0) {
    return { status: "review_required", reason: "invalid_quantity" };
  }
  if (!Number.isInteger(input.leadDays) || input.leadDays < 0) {
    return { status: "review_required", reason: "invalid_lead_time" };
  }

  const coverageDays = Math.floor(input.usableUnits / input.unitsPerDay);
  const depletionDate = addDays(input.dispensedAt, coverageDays);
  return {
    status: "calculated",
    coverageDays,
    depletionDate,
    alertDate: addDays(depletionDate, -input.leadDays),
  };
}
