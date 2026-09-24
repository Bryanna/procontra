import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { InvoiceWorkspace } from "./invoice-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("Documents workspace", () => {
  it("supports phone camera uploads and a reviewed insurance authorization workflow", () => {
    render(<InvoiceWorkspace branches={[{ id: "branch-70", code: "70", name: "Esperanza" }]} invoices={[]} profiles={[]} isAdmin={false}/>);

    expect(screen.getByRole("heading", { name: "Gestión de documentos" })).toBeInTheDocument();
    const file = screen.getByLabelText("Fotografía o PDF");
    expect(file).toHaveAttribute("capture", "environment");
    expect(file).toHaveAttribute("accept", "image/jpeg,image/png,image/webp,application/pdf");

    fireEvent.change(screen.getByLabelText("Tipo de documento"), { target: { value: "insurance_authorization" } });

    for (const label of ["Nombre del paciente", "Cédula", "Carnet", "Teléfono", "Número de autorización", "Fecha de autorización", "Prescriptor"])
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Cédula"), { target: { value: "001A1234567-8" } });
    fireEvent.change(screen.getByLabelText("Teléfono"), { target: { value: "809a5550101" } });
    expect(screen.getByLabelText("Cédula")).toHaveValue("00112345678");
    expect(screen.getByLabelText("Cédula")).toHaveAttribute("maxlength", "11");
    expect(screen.getByLabelText("Teléfono")).toHaveValue("809-555-0101");
    expect(screen.getByLabelText("Teléfono")).toHaveAttribute("inputmode", "numeric");
    expect(screen.getByRole("checkbox", { name: "Documento indica AUTORIZADO" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Documento indica uso continuo" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Paciente autorizó el seguimiento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar paciente y programa/ })).toBeInTheDocument();
  });
});
