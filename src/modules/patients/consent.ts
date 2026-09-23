export type ConsentPurpose = "reminder" | "service" | "survey" | "education" | "promotion";

export interface ConsentRecord {
  patientId: string;
  channel: "whatsapp" | "sms" | "email";
  purposes: ConsentPurpose[];
  status: "active" | "opted_out" | "expired" | "revoked";
  grantedAt: string;
  policyVersion: string;
  optedOutAt?: string;
  optOutInstruction?: string;
}

export type MessageEligibility =
  | { allowed: true }
  | { allowed: false; reason: "consent_inactive" | "purpose_not_consented" };

export function canSendMessage(consent: ConsentRecord, purpose: ConsentPurpose): MessageEligibility {
  if (consent.status !== "active") {
    return { allowed: false, reason: "consent_inactive" };
  }
  if (!consent.purposes.includes(purpose)) {
    return { allowed: false, reason: "purpose_not_consented" };
  }
  return { allowed: true };
}

export function applyOptOut(consent: ConsentRecord, optedOutAt: string, instruction: string): ConsentRecord {
  return {
    ...consent,
    status: "opted_out",
    optedOutAt,
    optOutInstruction: instruction,
  };
}
