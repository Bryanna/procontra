import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import { NewPatientDialog } from "./new-patient-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const branches = [{ id: "11111111-1111-4111-8111-111111111111", code: "70", name: "Esperanza" }];

describe("NewPatientDialog", () => {
  afterEach(() => { vi.unstubAllGlobals(); refresh.mockReset(); });

  it("registers a patient through the protected server endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "patient-1" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<NewPatientDialog branches={branches} />);

    fireEvent.click(screen.getByRole("button", { name: "Registrar nuevo paciente" }));
    const dialog = screen.getByRole("dialog", { name: "Registrar nuevo paciente" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/ID interno/i)).toHaveTextContent(/automáticamente/i);
    expect(within(dialog).queryByRole("textbox", { name: /código interno/i })).not.toBeInTheDocument();
    expect(within(dialog).getAllByRole("combobox")[0]).toHaveAccessibleName("Sucursal");
    const insurerField = within(dialog).getByLabelText("ARS / aseguradora");
    const cardField = within(dialog).getByLabelText("Carnet");
    expect(insurerField.closest("label")?.nextElementSibling).toBe(cardField.closest("label"));
    expect(within(dialog).queryByText(/NSS/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Sucursal"), { target: { value: branches[0].id } });
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Castillo" } });
    const governmentId = screen.getByLabelText("Cédula del paciente");
    const phone = screen.getByLabelText("Teléfono");
    expect(governmentId).toHaveAttribute("inputmode", "numeric");
    expect(governmentId).toHaveAttribute("maxlength", "11");
    expect(phone).toHaveAttribute("inputmode", "numeric");
    expect(phone).toHaveAttribute("placeholder", "809-555-0000");
    fireEvent.change(governmentId, { target: { value: "001A1234567-8" } });
    fireEvent.change(screen.getByLabelText("Carnet"), { target: { value: "123-45678-9" } });
    fireEvent.change(screen.getByLabelText("Fecha de nacimiento"), { target: { value: "1985-04-12" } });
    fireEvent.change(phone, { target: { value: "809a555b0101" } });
    expect(governmentId).toHaveValue("00112345678");
    expect(phone).toHaveValue("809-555-0101");
    fireEvent.click(screen.getByRole("checkbox", { name: "Teléfono verificado" }));
    fireEvent.change(screen.getByLabelText("ARS / aseguradora"), { target: { value: "ARS SENASA" } });
    fireEvent.change(screen.getByLabelText("Estado de seguimiento"), { target: { value: "yellow" } });
    fireEvent.change(screen.getByLabelText("Canal preferido"), { target: { value: "call" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Consentimiento vigente" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar paciente" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/patients", expect.objectContaining({ method: "POST" })));
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("code");
    expect(body).toMatchObject({
      name: "Ana Castillo",
      governmentId: "00112345678",
      insuranceCard: "123-45678-9",
      birthDate: "1985-04-12",
      phone: "809-555-0101",
      phoneVerified: true,
      branchId: branches[0].id,
      insurer: "ARS SENASA",
      followUpStatus: "yellow",
      preferredContactChannel: "call",
      consentGranted: true,
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog", { name: "Registrar nuevo paciente" })).not.toBeInTheDocument();
  });

  it("blocks incorrect cédula and phone digit counts before sending", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<NewPatientDialog branches={branches} />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar nuevo paciente" }));
    fireEvent.change(screen.getByLabelText("Sucursal"), { target: { value: branches[0].id } });
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana Castillo" } });
    fireEvent.change(screen.getByLabelText("Cédula del paciente"), { target: { value: "001-123456-8" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "8095550101" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar paciente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("La cédula debe contener 11 dígitos");
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Cédula del paciente"), { target: { value: "001-1234567-8" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "809555010" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar paciente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El teléfono debe contener 10 dígitos");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
