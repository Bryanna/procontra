import { render, screen } from "@testing-library/react";
import { DashboardSkeleton, InventorySkeleton } from "./loading-skeletons";

describe("operational loading skeletons", () => {
  it("provides smooth dashboard placeholders without fake data", () => {
    render(<DashboardSkeleton />);
    expect(screen.getByLabelText("Cargando panel operativo")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton-metric")).toHaveLength(4);
  });

  it("mirrors the product filters and branch table while inventory loads", () => {
    render(<InventorySkeleton />);
    expect(screen.getByLabelText("Cargando inventario")).toBeInTheDocument();
    expect(screen.getAllByTestId("skeleton-product-row")).toHaveLength(8);
  });
});
