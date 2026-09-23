import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("PROCONTRA dashboard", () => {
  it("shows the operational summary and priority work", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Panel operativo" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pacientes en seguimiento")).toBeInTheDocument();
    expect(screen.getByText("Alertas para hoy")).toBeInTheDocument();
    expect(screen.getByText("Reservas activas")).toBeInTheDocument();
    expect(screen.getByText("Riesgos de inventario")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Prioridades de hoy" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Losartán 50 mg")).toHaveLength(2);
  });
});
