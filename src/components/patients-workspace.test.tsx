import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { PatientsWorkspace } from "./patients-workspace";
import type { PatientSearchResult, PatientSummary } from "@/modules/patients/patient-catalog";

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

const branches = [
  { id: "branch-01", code: "01", name: "Amina" },
  { id: "branch-70", code: "70", name: "Esperanza" },
];
const summary: PatientSummary = {
  totalPatients: 248,
  activePatients: 230,
  inactivePatients: 18,
  currentConsents: 228,
  withoutCurrentConsent: 20,
  activeContinuity: 173,
  pendingAlerts: 31,
  newThisMonth: 18,
  patientsWithBranch: 242,
};
const result: PatientSearchResult = {
  items: [{
    id: "patient-1",
    code: "PAC-0001",
    name: "María Rodríguez",
    phone: "+1 809 555 0142",
    governmentIdMask: "***-*******-8",
    insuranceCardMask: "***6789",
    birthDate: "1985-04-12",
    phoneVerified: true,
    insurer: "ARS SENASA",
    followUpStatus: "yellow",
    preferredContactChannel: "whatsapp",
    branch: "Esperanza",
    branchCode: "70",
    active: true,
    consentStatus: "active",
    joinedAt: "2026-08-12T10:00:00Z",
  }],
  total: 1,
  page: 1,
  pageSize: 25,
  totalPages: 1,
};

describe("PatientsWorkspace", () => {
  beforeEach(() => {
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("keeps expanded server statistics hidden until requested and shows the real patient listing", () => {
    render(<PatientsWorkspace branch="" branches={branches} filter="today" query="maría" result={result} summary={summary} />);

    expect(screen.getByRole("heading", { name: "Consulta de pacientes" })).toBeInTheDocument();
    expect(screen.queryByText("Servidor operativo")).not.toBeInTheDocument();
    expect(screen.queryByText("DIRECTORIO MULTISUCURSAL")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Pacientes registrados" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Supabase/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Resumen de pacientes" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostrar métricas" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar métricas" }));
    expect(screen.getByRole("button", { name: /Todos los pacientes/ })).toHaveTextContent("248");
    expect(screen.getByRole("button", { name: /Pacientes activos/ })).toHaveTextContent("230");
    expect(screen.getByRole("button", { name: /Pacientes inactivos/ })).toHaveTextContent("18");
    expect(screen.getByRole("button", { name: /Consentimientos vigentes/ })).toHaveTextContent("228");
    expect(screen.getByRole("button", { name: /Sin consentimiento vigente/ })).toHaveTextContent("20");
    expect(screen.getByRole("button", { name: "Ocultar métricas" })).toHaveAttribute("aria-expanded", "true");
    const table = screen.getByRole("table", { name: "Pacientes registrados" });
    expect(within(table).getByRole("link", { name: /María Rodríguez/ })).toHaveAttribute("href", "/pacientes/patient-1");
    expect(within(table).getByText("ARS SENASA")).toBeInTheDocument();
    expect(within(table).getByText("Esperanza 70")).toBeInTheDocument();
    expect(within(table).getByText("Cédula ***-*******-8 · Carnet ***6789")).toBeInTheDocument();
    expect(within(table).getByText("Activo")).toBeInTheDocument();
    expect(within(table).queryByText("Seguimiento amarillo")).not.toBeInTheDocument();
    expect(within(table).queryByText("Consentimiento vigente")).not.toBeInTheDocument();
    expect(screen.getByText("1 paciente registrado hoy")).toBeInTheDocument();
    expect(screen.queryByText("1 resultado")).not.toBeInTheDocument();
    expect(screen.queryByText(/demostración/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Pacientes activos/ }));
    expect(replaceMock).toHaveBeenLastCalledWith("/pacientes?q=mar%C3%ADa&status=active", { scroll: false });
  });

  it("renders numbered pagination below the patient records", () => {
    render(<PatientsWorkspace branch="" branches={branches} filter="today" query="" result={{ ...result, total: 125, page: 3, totalPages: 5 }} summary={summary} />);

    const pagination = screen.getByRole("navigation", { name: "Paginación de pacientes" });
    expect(within(pagination).getByRole("link", { name: "Primera página" })).toHaveAttribute("href", "/pacientes");
    expect(within(pagination).getByRole("link", { name: "Anterior" })).toHaveAttribute("href", "/pacientes?page=2");
    expect(within(pagination).getByRole("link", { name: "Página 2" })).toHaveAttribute("href", "/pacientes?page=2");
    expect(within(pagination).getByText("3")).toHaveAttribute("aria-current", "page");
    expect(within(pagination).getByRole("link", { name: "Página 4" })).toHaveAttribute("href", "/pacientes?page=4");
    expect(within(pagination).getByRole("link", { name: "Siguiente" })).toHaveAttribute("href", "/pacientes?page=4");
    expect(within(pagination).getByRole("link", { name: "Última página" })).toHaveAttribute("href", "/pacientes?page=5");
    expect(screen.getByText("Página 3 de 5")).toBeInTheDocument();
    expect(screen.getByText("25 por página")).toBeInTheDocument();
    expect(screen.getByText("125 pacientes registrados hoy")).toBeInTheDocument();
    fireEvent.click(within(pagination).getByRole("link", { name: "Siguiente" }));
    expect(screen.getByRole("status", { name: "Cargando pacientes" })).toBeInTheDocument();
    expect(screen.getByTestId("patient-pagination-skeleton")).toBeInTheDocument();
  });

  it("searches while typing and applies status and branch filters without browser-history entries", async () => {
    vi.useFakeTimers();
    render(<PatientsWorkspace branch="" branches={branches} filter="today" query="" result={result} summary={summary} />);

    const search = screen.getByRole("searchbox", { name: "Buscar paciente" });
    expect(search).toHaveAttribute("autocomplete", "off");
    fireEvent.change(search, { target: { value: "ana castillo" } });
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });
    expect(replaceMock).toHaveBeenLastCalledWith("/pacientes?q=ana+castillo", { scroll: false });
    expect(pushMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Filtrar pacientes por estado"), { target: { value: "with_consent" } });
    expect(replaceMock).toHaveBeenLastCalledWith("/pacientes?q=ana+castillo&status=with_consent", { scroll: false });
    fireEvent.change(screen.getByLabelText("Filtrar pacientes por sucursal"), { target: { value: "70" } });
    expect(replaceMock).toHaveBeenLastCalledWith("/pacientes?q=ana+castillo&status=with_consent&branch=70", { scroll: false });
    expect(screen.getByRole("status", { name: "Cargando pacientes" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("removes row skeletons when refreshed patient results arrive", () => {
    const { rerender } = render(<PatientsWorkspace branch="" branches={branches} filter="today" query="" result={result} summary={summary} />);
    fireEvent.change(screen.getByLabelText("Filtrar pacientes por estado"), { target: { value: "inactive" } });
    expect(screen.getAllByTestId("patient-skeleton-row")).toHaveLength(8);

    rerender(<PatientsWorkspace branch="" branches={branches} filter="today" query="" result={{ ...result, items: [...result.items] }} summary={summary} />);
    expect(screen.queryByRole("status", { name: "Cargando pacientes" })).not.toBeInTheDocument();
    expect(screen.getByText("María Rodríguez")).toBeInTheDocument();
  });

  it("opens the selected patient in an edit modal on row double click", () => {
    render(<PatientsWorkspace branch="" branches={branches} canWrite filter="all" query="" result={result} summary={summary} />);
    fireEvent.doubleClick(screen.getByRole("row", { name: /María Rodríguez/ }));
    const dialog = screen.getByRole("dialog", { name: "Editar paciente María Rodríguez" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Nombre completo")).toHaveValue("María Rodríguez");
    expect(within(dialog).getByLabelText("Teléfono")).toHaveValue("+1 809 555 0142");
    expect(within(dialog).getByText("PAC-0001")).toBeInTheDocument();
  });
});
