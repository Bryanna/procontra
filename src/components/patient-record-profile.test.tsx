import { render, screen } from "@testing-library/react";
import { PatientRecordProfile } from "./patient-record-profile";

const patient = {
  id: "patient-1",
  code: "PAC-0001",
  name: "María Rodríguez",
  phone: "+1 809 555 0142",
  governmentIdMask: "***-*******-8",
  insuranceCardMask: "***6789",
  birthDate: "1985-04-12",
  phoneVerified: true,
  insurer: "ARS SENASA",
  followUpStatus: "yellow" as const,
  preferredContactChannel: "whatsapp" as const,
  branch: "Esperanza",
  branchCode: "70",
  active: true,
  consentStatus: "active",
  joinedAt: "2026-08-12T10:00:00Z",
};

describe("PatientRecordProfile", () => {
  it("shows only persisted patient identity and operational status", () => {
    render(<PatientRecordProfile patient={patient} />);
    expect(screen.getByRole("heading", { name: "María Rodríguez" })).toBeInTheDocument();
    expect(screen.getByText("PAC-0001")).toBeInTheDocument();
    expect(screen.getByText("Consentimiento vigente")).toBeInTheDocument();
    expect(screen.getByText("ARS SENASA")).toBeInTheDocument();
    expect(screen.getByText("Cédula ***-*******-8")).toBeInTheDocument();
    expect(screen.getByText("Carnet ***6789")).toBeInTheDocument();
    expect(screen.getByText("Teléfono verificado")).toBeInTheDocument();
    expect(screen.getByText("Seguimiento amarillo")).toBeInTheDocument();
    expect(screen.getByText("Canal preferido: WhatsApp")).toBeInTheDocument();
    expect(screen.queryByText("001-1234567-8")).not.toBeInTheDocument();
    expect(screen.queryByText(/demostrativo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Losartán/i)).not.toBeInTheDocument();
  });
});
