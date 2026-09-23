import { classifyFollowUp } from "./risk-classifier";

describe("follow-up risk classifier", () => {
  it("classifies operational continuity states", () => {
    expect(classifyFollowUp({ daysToDepletion: 12, stockAvailable: true, responded: true, continuityConfirmed: true, clinicalSignal: false, emergencySignal: false })).toBe("green");
    expect(classifyFollowUp({ daysToDepletion: 4, stockAvailable: true, responded: false, continuityConfirmed: false, clinicalSignal: false, emergencySignal: false })).toBe("yellow");
    expect(classifyFollowUp({ daysToDepletion: 1, stockAvailable: false, responded: true, continuityConfirmed: false, clinicalSignal: false, emergencySignal: false })).toBe("red");
  });

  it("prioritizes emergency and clinical escalation over operational status", () => {
    expect(classifyFollowUp({ daysToDepletion: 10, stockAvailable: true, responded: true, continuityConfirmed: true, clinicalSignal: true, emergencySignal: false })).toBe("clinical_escalation");
    expect(classifyFollowUp({ daysToDepletion: 10, stockAvailable: true, responded: true, continuityConfirmed: true, clinicalSignal: false, emergencySignal: true })).toBe("emergency");
  });
});
