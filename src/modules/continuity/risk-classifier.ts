export interface FollowUpSignals {
  daysToDepletion: number;
  stockAvailable: boolean;
  responded: boolean;
  continuityConfirmed: boolean;
  clinicalSignal: boolean;
  emergencySignal: boolean;
}

export type FollowUpRisk = "green" | "yellow" | "red" | "clinical_escalation" | "emergency";

export function classifyFollowUp(signals: FollowUpSignals): FollowUpRisk {
  if (signals.emergencySignal) return "emergency";
  if (signals.clinicalSignal) return "clinical_escalation";
  if (!signals.stockAvailable || signals.daysToDepletion <= 1) return "red";
  if (!signals.responded || !signals.continuityConfirmed || signals.daysToDepletion <= 7) return "yellow";
  return "green";
}
