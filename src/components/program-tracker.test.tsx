import { render, screen } from "@testing-library/react";
import { ProgramTracker } from "./program-tracker";

describe("ProgramTracker", () => {
  it("shows the complete PDF implementation matrix", () => {
    render(<ProgramTracker />);

    expect(screen.getByRole("heading", { name: "Programa de implementación" })).toBeInTheDocument();
    expect(screen.getByLabelText("80 capacidades trazadas")).toBeInTheDocument();
    expect(screen.getByText("Gobernanza del programa")).toBeInTheDocument();
    expect(screen.getByText("Integrar WhatsApp de pacientes")).toBeInTheDocument();
    expect(screen.getByText("Credenciales WhatsApp Business")).toBeInTheDocument();
  });
});
