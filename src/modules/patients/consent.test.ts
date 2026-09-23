import { applyOptOut, canSendMessage, type ConsentRecord } from "./consent";

const consent: ConsentRecord = {
  patientId: "PAT-0001",
  channel: "whatsapp",
  purposes: ["reminder", "service"],
  status: "active",
  grantedAt: "2026-08-01T10:00:00Z",
  policyVersion: "consent-v1",
};

describe("patient consent", () => {
  it("allows only an explicitly consented purpose", () => {
    expect(canSendMessage(consent, "reminder")).toEqual({ allowed: true });
    expect(canSendMessage(consent, "promotion")).toEqual({ allowed: false, reason: "purpose_not_consented" });
  });

  it("applies SALIR immediately and blocks subsequent messaging", () => {
    const optedOut = applyOptOut(consent, "2026-08-27T15:00:00Z", "SALIR");

    expect(optedOut.status).toBe("opted_out");
    expect(optedOut.optedOutAt).toBe("2026-08-27T15:00:00Z");
    expect(canSendMessage(optedOut, "reminder")).toEqual({ allowed: false, reason: "consent_inactive" });
  });
});
