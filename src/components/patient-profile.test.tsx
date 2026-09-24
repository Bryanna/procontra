import { render, screen } from "@testing-library/react";
import { PatientProfile } from "./patient-profile";
import { demoPatient } from "@/modules/patients/demo-patient";

describe("PatientProfile", () => {
  it("shows the patient identity and consent state", () => {
    render(<PatientProfile patient={demoPatient} />);

    expect(screen.getByRole("heading", { name: "María Rodríguez" })).toBeInTheDocument();
    expect(screen.getByText("Cédula 001-1234567-8")).toBeInTheDocument();
    expect(screen.getByText("809-555-0142")).toBeInTheDocument();
    expect(screen.getByText("Consentimiento vigente")).toBeInTheDocument();
  });

  it("shows the active treatment and next continuity action", () => {
    render(<PatientProfile patient={demoPatient} />);

    expect(screen.getByRole("heading", { name: "Losartán 50 mg" })).toBeInTheDocument();
    expect(screen.getAllByText("1 tableta al día")).toHaveLength(2);
    expect(screen.getAllByText("Alerta programada")).toHaveLength(2);
    expect(screen.getAllByText("Stock confirmado · Esperanza 70")).toHaveLength(2);
  });

  it("shows dispensations and communication history", () => {
    render(<PatientProfile patient={demoPatient} />);

    expect(screen.getByRole("heading", { name: "Historial de dispensaciones" })).toBeInTheDocument();
    expect(screen.getByText("Factura F-008421")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Actividad reciente" })).toBeInTheDocument();
    expect(screen.getByText("Recordatorio entregado por WhatsApp")).toBeInTheDocument();
  });
});
