import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { EditPatientDialog } from "./edit-patient-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const branches = [{ id: "11111111-1111-4111-8111-111111111111", code: "70", name: "Esperanza" }];
const patient = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", code: "PAC-0001", name: "María Rodríguez",
  phone: "+1 809 555 0142", governmentIdMask: "***-*******-8", insuranceCardMask: "***6789",
  birthDate: "1985-04-12", phoneVerified: true, insurer: "ARS SENASA", followUpStatus: "yellow" as const,
  preferredContactChannel: "whatsapp" as const, branch: "Esperanza", branchCode: "70", active: true,
  consentStatus: "active", joinedAt: "2026-08-12T10:00:00Z",
};

describe("EditPatientDialog", () => {
  afterEach(() => { vi.unstubAllGlobals(); refresh.mockReset(); });

  it("updates the selected patient without replacing protected identifiers left blank", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: patient.id }) });
    vi.stubGlobal("fetch", fetchMock);
    const close = vi.fn();
    render(<EditPatientDialog branches={branches} onClose={close} patient={patient} />);
    expect(screen.getByText("Cédula actual: ***-*******-8")).toBeInTheDocument();
    expect(screen.getByText("Carnet actual: ***6789")).toBeInTheDocument();
    const insurerField = screen.getByLabelText("ARS / aseguradora");
    const cardField = screen.getByLabelText("Nuevo carnet");
    expect(insurerField.closest("label")?.nextElementSibling).toBe(cardField.closest("label"));
    expect(screen.queryByText(/NSS/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Teléfono")).toHaveValue("809-555-0142");
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "809x5550199" } });
    expect(screen.getByLabelText("Teléfono")).toHaveValue("809-555-0199");
    fireEvent.change(screen.getByLabelText("Estado del paciente"), { target: { value: "inactive" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/patients/${patient.id}`, expect.objectContaining({ method: "PATCH" })));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ phone: "809-555-0199", active: false, governmentId: "", insuranceCard: "" });
    expect(refresh).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});