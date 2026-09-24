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
    expect(screen.getByRole("checkbox", { name: "Documento indica AUTORIZADO" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Documento indica uso continuo" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Paciente autorizó el seguimiento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar paciente y programa/ })).toBeInTheDocument();
  });
});
