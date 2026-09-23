import { render, screen } from "@testing-library/react";
import { ModuleOverview } from "./module-overview";
import { getModuleConfig } from "@/modules/platform/module-config";

describe("ModuleOverview", () => {
  it("renders the inventory workspace from its module configuration", () => {
    const config = getModuleConfig("inventario");
    expect(config).not.toBeNull();

    render(<ModuleOverview config={config!} />);

    expect(screen.getByRole("heading", { name: "Inventario" })).toBeInTheDocument();
    expect(screen.getByText("Productos con riesgo")).toBeInTheDocument();
    expect(screen.getByText("Actualizar inventario")).toBeInTheDocument();
    expect(screen.getByText("Losartán 50 mg")).toBeInTheDocument();
    expect(screen.getByText("Acciones sugeridas")).toBeInTheDocument();
  });

  it("links the demonstration patient to her continuity profile", () => {
    const config = getModuleConfig("pacientes");
    expect(config).not.toBeNull();

    render(<ModuleOverview config={config!} />);

    expect(screen.getByRole("link", { name: /María Rodríguez/ })).toHaveAttribute(
      "href",
      "/pacientes/maria-rodriguez",
    );
  });
});
