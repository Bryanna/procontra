import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { NewPlanWorkspace } from "./new-plan-workspace";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

const patients = [{
  id: "20000000-0000-4000-8000-000000000001",
  code: "PAC-0001",
  name: "Ana Pérez",
  phone: "809-555-0101",
  insurer: "ARS SENASA",
  insuranceCardMask: "••••5678",
  branch: "Esperanza",
  branchCode: "70",
  phoneVerified: true,
  preferredContactChannel: "whatsapp",
  consentStatus: "granted",
}];

function choosePatient() {
  fireEvent.change(screen.getByRole("searchbox", { name: "Buscar paciente" }), { target: { value: "ana" } });
  fireEvent.click(screen.getByRole("button", { name: "Seleccionar Ana Pérez" }));
}

function advance(label = "Guardar y continuar") {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

describe("NewPlanWorkspace", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.restoreAllMocks();
  });

  it("presenta un flujo real de cuatro pasos centrado en la receta", () => {
    render(<NewPlanWorkspace initialPatients={patients} cancelHref="/programa" actorLabel="Ing. Abel Medrano" branchLabel="Esperanza 70" />);

    expect(screen.queryByRole("heading", { name: "Registrar receta del paciente" })).not.toBeInTheDocument();
    expect(screen.queryByText("RECETA Y CONTINUIDAD")).not.toBeInTheDocument();
    expect(screen.queryByText("Alerta institucional")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1 Paciente" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("button", { name: "2 Receta" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "3 Alertas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "4 Revisar" })).toBeDisabled();
    expect(screen.getByText("Paso 1 de 4")).toBeInTheDocument();
  });

  it("mantiene ocultos los pacientes hasta que el operador empieza a escribir", () => {
    render(<NewPlanWorkspace initialPatients={patients} cancelHref="/programa" actorLabel="Ing. Abel Medrano" branchLabel="Esperanza 70" />);

    expect(screen.queryByRole("button", { name: "Seleccionar Ana Pérez" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar paciente" }), { target: { value: "a" } });

    expect(screen.getByRole("button", { name: "Seleccionar Ana Pérez" })).toBeInTheDocument();
  });

  it("selecciona un paciente canónico y muestra su capacidad de contacto", () => {
    render(<NewPlanWorkspace initialPatients={patients} cancelHref="/programa" actorLabel="Ing. Abel Medrano" branchLabel="Esperanza 70" />);
    choosePatient();

    expect(screen.getByText("Paciente seleccionado")).toBeInTheDocument();
    expect(screen.getByText("Teléfono verificado")).toBeInTheDocument();
    expect(screen.getByText("Consentimiento vigente")).toBeInTheDocument();
    expect(screen.getByText(/WhatsApp preferido/)).toBeInTheDocument();
    expect(screen.getByLabelText("ARS / aseguradora")).toHaveValue("senasa");
  });

  it("captura la receta con renglones de medicamentos y programación a tres días", () => {
    render(<NewPlanWorkspace initialPatients={patients} cancelHref="/programa" actorLabel="Ing. Abel Medrano" branchLabel="Esperanza 70" />);
    choosePatient();
    advance();

    expect(screen.getByRole("button", { name: "2 Receta" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByLabelText("Número de receta")).toBeInTheDocument();
    expect(screen.getByLabelText("Fecha de receta")).toBeInTheDocument();
    expect(screen.getByLabelText("Medicamento 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar medicamento" })).toBeInTheDocument();
    expect(screen.getByText(/3 días antes de cada compra/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Agregar medicamento" }));
    expect(screen.getByLabelText("Medicamento 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar medicamento 2" }));
    expect(screen.queryByLabelText("Medicamento 2")).not.toBeInTheDocument();
  });

  it("muestra una numeración secuencial de seis dígitos y evita controles incrementales", () => {
    render(<NewPlanWorkspace initialPatients={patients} cancelHref="/programa" actorLabel="Ing. Abel Medrano" branchLabel="Esperanza 70" />);
    choosePatient();
    advance();

    const prescriptionNumber = screen.getByLabelText("Número de receta");
    expect(prescriptionNumber).toHaveAttribute("readonly");
    expect((prescriptionNumber as HTMLInputElement).value).toMatch(/^RECETA-\d{4}-#{6}$/);

    const quantity = screen.getByLabelText("Cantidad 1");
    expect(quantity).toHaveAttribute("type", "text");
    expect(quantity).toHaveAttribute("inputmode", "decimal");

    fireEvent.change(screen.getByLabelText("Modo de programación"), { target: { value: "manual" } });
    expect(screen.getByLabelText("Cantidad de recetas")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Cantidad de recetas")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByLabelText("Receta actual")).toHaveAttribute("type", "text");
  });

  it("configura llamada y WhatsApp y muestra la trazabilidad antes de guardar", () => {
    render(<NewPlanWorkspace initialPatients={patients} cancelHref="/programa" actorLabel="Ing. Abel Medrano" branchLabel="Esperanza 70" />);
    choosePatient();
    advance();

    fireEvent.change(screen.getByLabelText("Fecha de receta"), { target: { value: "2026-09-20" } });
    fireEvent.change(screen.getByLabelText("Fecha de primera compra"), { target: { value: "2026-09-20" } });
    fireEvent.change(screen.getByLabelText("Medicamento 1"), { target: { value: "Losartán" } });
    fireEvent.change(screen.getByLabelText("Concentración 1"), { target: { value: "50 mg" } });
    advance();

    expect(screen.getByRole("button", { name: "3 Alertas" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("checkbox", { name: "Recordar por llamada" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Recordar por WhatsApp" })).toBeChecked();
    expect(screen.getByRole("heading", { name: "Impacto en los próximos 3 días" })).toBeInTheDocument();
    advance();

    expect(screen.getByRole("button", { name: "4 Revisar" })).toHaveAttribute("aria-current", "step");
    expect(screen.getByRole("heading", { name: "Trazabilidad que se registrará" })).toBeInTheDocument();
    expect(screen.getByText(/Ing. Abel Medrano/)).toBeInTheDocument();
    expect(screen.getAllByText(/Llamada y WhatsApp/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Registrar receta y seguimiento" })).toBeInTheDocument();
  });

  it("envía la receta estructurada y navega a la agenda confirmada", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ id: "10000000-0000-4000-8000-000000000001" }), { status: 201, headers: { "content-type": "application/json" } }));
    render(<NewPlanWorkspace initialPatients={patients} cancelHref="/programa" actorLabel="Ing. Abel Medrano" branchLabel="Esperanza 70" />);
    choosePatient();
    advance();
    fireEvent.change(screen.getByLabelText("Fecha de receta"), { target: { value: "2026-09-20" } });
    fireEvent.change(screen.getByLabelText("Fecha de primera compra"), { target: { value: "2026-09-20" } });
    fireEvent.change(screen.getByLabelText("Medicamento 1"), { target: { value: "Losartán" } });
    fireEvent.change(screen.getByLabelText("Concentración 1"), { target: { value: "50 mg" } });
    fireEvent.change(screen.getByLabelText("Presentación 1"), { target: { value: "30 tabletas" } });
    advance();
    advance();
    fireEvent.click(screen.getByRole("button", { name: "Registrar receta y seguimiento" }));

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const request = vi.mocked(fetch).mock.calls[0];
    const payload = JSON.parse(String(request[1]?.body));
    expect(payload).toMatchObject({
      patientId: patients[0].id,
      insurerCode: "senasa",
      prescriptionDate: "2026-09-20",
      reminderChannels: ["call", "whatsapp"],
      reminderLeadDays: 3,
    });
    expect(payload.prescriptionItems).toEqual([expect.objectContaining({ medicine: "Losartán", concentration: "50 mg", presentation: "30 tabletas" })]);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/programa?created=10000000-0000-4000-8000-000000000001"));
  });
});
