import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { FollowUpWorkspace } from "./follow-up-workspace";
import type { FollowUpPlan, FollowUpSummary } from "@/modules/follow-up/follow-up-repository";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const summary: FollowUpSummary = { total: 1, contactToday: 1, overdue: 0, nextThreeDays: 0, completed: 0 };
const plan: FollowUpPlan = {
  id: "10000000-0000-4000-8000-000000000001",
  patientId: "20000000-0000-4000-8000-000000000001",
  patientName: "Ana Pérez",
  phone: "809-555-0101",
  insurer: "ARS SENASA",
  insurerCode: "senasa",
  prescriptionCount: 3,
  mode: "monthly",
  branch: "Esperanza",
  branchCode: "70",
  medicines: "ARACURE 32 MG",
  doctor: "Dra. Ejemplo",
  caseNumber: null,
  firstPurchaseDate: "2026-07-01",
  lastPurchaseDate: "2026-07-01",
  currentPrescription: 1,
  nextPurchaseDate: "2026-08-01",
  contactDate: "2026-07-25",
  status: "active",
  lastResult: null,
};


const props = {
  query: "",
  status: "all" as const,
  insurerCode: "",
  branchCode: "",
  branches: [{ id: "b", code: "70", name: "Esperanza" }],
  result: { items: [plan], total: 1, page: 1, pageSize: 25, totalPages: 1 },
  summary,
  canWrite: true,
  canDispense: true,
};

describe("FollowUpWorkspace", () => {
  beforeEach(() => replace.mockReset());
  it("presenta la operación de seguimiento y las reglas por ARS", () => {
    render(<FollowUpWorkspace {...props} />);
    expect(screen.getByRole("heading", { name: "Plan de seguimiento" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Contactar hoy/ })).not.toBeInTheDocument();
    const metricsToggle = screen.getByRole("button", { name: "Mostrar métricas" });
    expect(metricsToggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(metricsToggle);
    expect(screen.getByRole("button", { name: /Contactar hoy/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar métricas" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Ana Pérez").closest("td")).toHaveAttribute("data-label", "Paciente");
    expect(screen.getByText("ARACURE 32 MG").closest("td")).toHaveAttribute("data-label", "Tratamiento");
    expect(screen.getByRole("button", { name: "Registrar resultado de Ana Pérez" }).closest("td")).toHaveAttribute("data-label", "Acción");
    expect(screen.getByText("Receta 1 de 3")).toBeInTheDocument();
    expect(screen.getAllByText("IDOPPRIL").length).toBeGreaterThan(0);
    expect(screen.getByText("Por número de caso")).toBeInTheDocument();
    const newPlanLink = screen.getByRole("link", { name: "Nuevo programa" });
    expect(newPlanLink).toHaveClass("followup-btn-primary");
    expect(newPlanLink).toHaveAttribute("href", "/programa/nuevo");
    expect(screen.queryByRole("region", { name: "Crear plan de seguimiento" })).not.toBeInTheDocument();
  });


  it("muestra un estado vacío veraz cuando no hay planes", () => {
    render(<FollowUpWorkspace {...props} result={{ ...props.result, items: [], total: 0 }} />);
    expect(screen.getByText("No hay planes que coincidan con los filtros.")).toBeInTheDocument();
  });

  it("oculta la confirmación de compra sin permiso de dispensación", () => {
    render(<FollowUpWorkspace {...props} canDispense={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar resultado de Ana Pérez" }));
    expect(screen.queryByRole("option", { name: "Compró" })).not.toBeInTheDocument();
  });

  it("exige datos de dispensación al registrar una compra", () => {
    render(<FollowUpWorkspace {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar resultado de Ana Pérez" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar resultado de Ana Pérez" });
    fireEvent.change(within(dialog).getByLabelText("Resultado"), { target: { value: "compro" } });
    expect(within(dialog).getByRole("searchbox", { name: "Buscar producto dispensado" })).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Cantidad dispensada")).toBeRequired();
    expect(within(dialog).getByLabelText("Unidades por día")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Indicaciones verificadas")).toBeInTheDocument();
    expect(within(dialog).getByText(/descontará inventario/i)).toBeInTheDocument();
  });

  it("consulta y presenta la trazabilidad real del seguimiento", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      items: [
        { id: "event-1", type: "plan_created", title: "Receta registrada", channel: null, result: null, observations: null, nextActionDate: "2026-07-29", actor: "Ing. Abel Medrano", occurredAt: "2026-07-01T14:00:00Z" },
        { id: "event-2", type: "contact", title: "No contestó", channel: "whatsapp", result: "no_contesto", observations: "Reintentar mañana", nextActionDate: "2026-07-26", actor: "Rosangela Estevez", occurredAt: "2026-07-25T14:00:00Z" },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    render(<FollowUpWorkspace {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Ver trazabilidad de Ana Pérez" }));
    expect(await screen.findByRole("dialog", { name: "Trazabilidad de Ana Pérez" })).toBeInTheDocument();
    expect(screen.getByText("Receta registrada")).toBeInTheDocument();
    expect(screen.getByText("No contestó")).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp/)).toBeInTheDocument();
    expect(screen.getByText(/Rosangela Estevez/)).toBeInTheDocument();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith(`/api/follow-up/plans/${plan.id}/timeline`));
  });

  it("consulta la agenda con filtros inmediatos, skeleton y paginación definida", () => {
    const { rerender } = render(<FollowUpWorkspace {...props} result={{ ...props.result, total: 125, page: 3, totalPages: 5 }} />);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar métricas" }));
    fireEvent.click(screen.getByRole("button", { name: /Próximos 3 días/ }));
    expect(replace).toHaveBeenCalledWith("/programa?status=next_3_days", { scroll: false });
    expect(screen.getAllByTestId("followup-skeleton-row")).toHaveLength(8);
    expect(screen.getByTestId("followup-pagination-skeleton")).toBeInTheDocument();

    rerender(<FollowUpWorkspace {...props} result={{ ...props.result, total: 125, page: 3, totalPages: 5 }} />);
    expect(screen.getByText("Página 3 de 5")).toBeInTheDocument();
    expect(screen.getByText("25 por página")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Primera página" })).toHaveAttribute("href", "/programa");
    expect(screen.getByRole("link", { name: "Última página" })).toHaveAttribute("href", "/programa?page=5");
    expect(screen.getByRole("link", { name: "Página 3" })).toHaveAttribute("aria-current", "page");

    fireEvent.change(screen.getByLabelText("Filtrar por estado"), { target: { value: "overdue" } });
    expect(replace).toHaveBeenCalledWith("/programa?status=overdue", { scroll: false });
  });
});
