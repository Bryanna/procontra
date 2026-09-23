import { buildDailyReport } from "./daily-report";

describe("daily management report", () => {
  it("separates verified totals, risks and decisions", () => {
    const report = buildDailyReport({
      followUps: ["green", "yellow", "red", "clinical_escalation", "green"],
      alerts: ["sent", "responded", "responded"],
      reservations: ["confirmed", "collected", "expired"],
      inventory: ["available", "below_minimum", "out_of_stock"],
      tasks: ["open", "completed", "open"],
    });

    expect(report.patients).toEqual({ confirmed: 2, pending: 1, atRisk: 1, clinicalEscalations: 1 });
    expect(report.messaging).toEqual({ sent: 1, responded: 2 });
    expect(report.reservations).toEqual({ open: 1, collected: 1, expired: 1 });
    expect(report.inventory).toEqual({ lowStock: 1, stockouts: 1 });
    expect(report.decisionsPending).toBe(2);
  });
});
