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

  it("shows current cédula and policy, allows changes and keeps their protected masks visible", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, options?: RequestInit) => Promise.resolve({
      ok: true,
      json: async () => options?.method === "PATCH"
        ? { id: patient.id }
        : { governmentId: "00112345678", insurancePolicy: "1063071401" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    const close = vi.fn();
    render(<EditPatientDialog branches={branches} onClose={close} patient={patient} />);

    expect(screen.getByText("Cédula actual: ***-*******-8")).toBeInTheDocument();
    expect(screen.getByText("Póliza actual: ***6789")).toBeInTheDocument();
    expect(await screen.findByLabelText("Cédula")).toHaveValue("00112345678");
    expect(screen.getByLabelText("Póliza")).toHaveValue("1063071401");
    expect(screen.getByLabelText("Cédula")).toHaveAttribute("maxlength", "11");
    expect(screen.getByLabelText("Póliza")).toHaveAttribute("inputmode", "numeric");

    const branch = screen.getByLabelText("Sucursal");
    const active = screen.getByLabelText("Activo");
    expect(active).toHaveAttribute("type", "checkbox");
    expect(branch.closest(".patient-scope-grid")).toBe(active.closest(".patient-scope-grid"));
    expect(branch.closest("label")?.nextElementSibling).toBe(active.closest("label"));

    const identityRow = screen.getByLabelText("Cédula").closest(".patient-form-grid-three");
    expect(identityRow).toContainElement(screen.getByLabelText("Póliza"));
    expect(identityRow).toContainElement(screen.getByLabelText("Fecha de nacimiento"));
    expect(Array.from(identityRow?.querySelectorAll("input") ?? []).map((input) => input.getAttribute("aria-label"))).toEqual([
      "Nombre completo", "Cédula", "Póliza", "Fecha de nacimiento",
    ]);

    const contactRow = screen.getByLabelText("ARS / aseguradora").closest(".patient-form-grid-three");
    expect(contactRow).toContainElement(screen.getByLabelText("Teléfono"));
    expect(contactRow).toContainElement(screen.getByLabelText("Canal preferido"));
    expect(Array.from(contactRow?.querySelectorAll("input, select") ?? []).map((control) => control.getAttribute("aria-label"))).toEqual([
      "ARS / aseguradora", "Teléfono", "Canal preferido", "Estado de seguimiento",
    ]);

    fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: "402A1234567-8" } });
    fireEvent.change(screen.getByLabelText("Póliza"), { target: { value: "POL-987654321" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "809x5550199" } });
    fireEvent.click(active);
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(`/api/patients/${patient.id}`, expect.objectContaining({ method: "PATCH" })));
    const patchCall = fetchMock.mock.calls.find(([, options]) => options?.method === "PATCH");
    const body = JSON.parse(patchCall?.[1]?.body as string);
    expect(body).toMatchObject({
      phone: "809-555-0199",
      active: false,
      governmentId: "40212345678",
      insuranceCard: "987654321",
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(close).toHaveBeenCalledOnce();
  });
});