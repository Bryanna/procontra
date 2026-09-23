import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { InventoryMaintenanceDialog } from "./inventory-maintenance-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("InventoryMaintenanceDialog", () => {
  it("creates a Supabase-backed maintenance record", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "catalog-1" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<InventoryMaintenanceDialog />);
    fireEvent.click(screen.getByRole("button", { name: "Gestionar catálogos" }));
    expect(screen.getByRole("option", { name: "Categorías" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Fabricantes o laboratorios" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Principios activos" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Unidades de medida" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Formas farmacéuticas" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Vías de administración" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Analgésicos" } });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar registro" }).closest("form")!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ type: "category", code: "", name: "Analgésicos", description: "" });
    expect(refresh).toHaveBeenCalledOnce();
  });
});
