import { fireEvent, render, screen, within } from "@testing-library/react";
import { FollowUpReportWorkspace } from "./follow-up-report-workspace";
import type { FollowUpReportResult } from "@/modules/reporting/follow-up-report-repository";

const report: FollowUpReportResult = {
  items: [{
    id: "plan-1", patientName: "PRUEBA SENASA 01", phone: "809-555-1001", branch: "Esperanza", branchCode: "70",
    insurer: "ARS SENASA", medicines: "JARINU 25 MG", doctor: "Médico de prueba", firstPurchaseDate: "2026-08-15",
    nextPurchaseDate: "2026-09-15", contactDate: "2026-09-08", status: "active", lastResult: "contesto",
    contactCount: 1, lastContactAt: "2026-09-08T14:30:00Z", isTest: true,
    sourceReference: "CONTROL DE USO CONTINUO ARS SENASA2.xlsx · fila 107",
  }],
  summary: { total: 1, contactToday: 0, overdue: 1, nextSevenDays: 0, contacted: 1, noAnswer: 0, withoutPrescription: 0, completed: 0 },
  total: 1, page: 1, pageSize: 50, totalPages: 1,
};

const props = {
  report,
  filters: { query: "", branchCode: "", result: "all" as const, dataScope: "all" as const, from: "", to: "" },
  branches: [{ id: "branch-70", code: "70", name: "Esperanza" }],
};

describe("FollowUpReportWorkspace", () => {
  it("presenta indicadores, filtros y trazabilidad de registros de prueba", () => {
    render(<FollowUpReportWorkspace {...props} />);
    expect(screen.getByRole("heading", { name: "Reporte de seguimiento" })).toBeInTheDocument();
    expect(screen.getByText("Datos de prueba")).toBeInTheDocument();
    expect(screen.getByText(/CONTROL DE USO CONTINUO ARS SENASA2/)).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de datos")).toHaveValue("all");
    const table = screen.getByRole("table", { name: "Reporte de planes de seguimiento" });
    expect(within(table).getByText("PRUEBA SENASA 01")).toBeInTheDocument();
    expect(within(table).getByText("Contestó")).toBeInTheDocument();
  });

  it("permite imprimir o guardar el reporte como PDF", () => {
    const original = window.print;
    window.print = vi.fn();
    render(<FollowUpReportWorkspace {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Imprimir o guardar PDF" }));
    expect(window.print).toHaveBeenCalledOnce();
    window.print = original;
  });
});
