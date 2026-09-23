import { calculateContinuityCycle } from "./continuity-engine";

describe("continuity engine", () => {
  it("calculates coverage, depletion and alert dates from verified data", () => {
    const result = calculateContinuityCycle({
      dispensedAt: "2026-08-02",
      usableUnits: 30,
      unitsPerDay: 1,
      leadDays: 4,
      directionsVerified: true,
    });

    expect(result).toEqual({
      status: "calculated",
      coverageDays: 30,
      depletionDate: "2026-09-01",
      alertDate: "2026-08-28",
    });
  });

  it("stops automation when directions are unverified or non-daily", () => {
    expect(calculateContinuityCycle({
      dispensedAt: "2026-08-02",
      usableUnits: 30,
      unitsPerDay: 1,
      leadDays: 4,
      directionsVerified: false,
    })).toEqual({ status: "review_required", reason: "directions_unverified" });

    expect(calculateContinuityCycle({
      dispensedAt: "2026-08-02",
      usableUnits: 30,
      unitsPerDay: 0,
      leadDays: 4,
      directionsVerified: true,
    })).toEqual({ status: "review_required", reason: "invalid_daily_use" });
  });
});
