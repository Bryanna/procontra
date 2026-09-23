export interface DailyReportInput {
  followUps: Array<"green" | "yellow" | "red" | "clinical_escalation">;
  alerts: Array<"scheduled" | "sent" | "responded">;
  reservations: Array<"confirmed" | "collected" | "delivered" | "expired" | "cancelled">;
  inventory: Array<"available" | "below_minimum" | "out_of_stock">;
  tasks: Array<"open" | "in_progress" | "completed" | "cancelled">;
}

const count = <T,>(values: T[], target: T) => values.filter((value) => value === target).length;

export function buildDailyReport(input: DailyReportInput) {
  return {
    patients: {
      confirmed: count(input.followUps, "green"),
      pending: count(input.followUps, "yellow"),
      atRisk: count(input.followUps, "red"),
      clinicalEscalations: count(input.followUps, "clinical_escalation"),
    },
    messaging: {
      sent: count(input.alerts, "sent"),
      responded: count(input.alerts, "responded"),
    },
    reservations: {
      open: count(input.reservations, "confirmed"),
      collected: count(input.reservations, "collected") + count(input.reservations, "delivered"),
      expired: count(input.reservations, "expired"),
    },
    inventory: {
      lowStock: count(input.inventory, "below_minimum"),
      stockouts: count(input.inventory, "out_of_stock"),
    },
    decisionsPending: count(input.tasks, "open") + count(input.tasks, "in_progress"),
  };
}
