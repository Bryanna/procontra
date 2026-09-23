import { programCapabilities, programSections } from "./program-requirements";

describe("PROCONTRA program requirements", () => {
  it("tracks every capability with a unique identifier and PDF source", () => {
    expect(programCapabilities.length).toBeGreaterThanOrEqual(50);
    expect(new Set(programCapabilities.map((item) => item.id)).size).toBe(programCapabilities.length);

    for (const capability of programCapabilities) {
      expect(capability.title).not.toHaveLength(0);
      expect(capability.pdfSection).toMatch(/^§/);
      expect(["pending", "designed", "implemented", "blocked"]).toContain(capability.status);
    }
  });

  it("covers all institutional program areas", () => {
    expect(programSections.map((section) => section.id)).toEqual([
      "governance",
      "patients",
      "continuity",
      "documents",
      "inventory",
      "reservations",
      "messaging",
      "voice-surveys",
      "operations",
      "reporting",
      "security",
      "integrations",
    ]);
  });
});
