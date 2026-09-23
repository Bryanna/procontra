import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { InventoryWorkspace } from "./inventory-workspace";
import type {
  CatalogMetadata,
  InventorySearchResult,
} from "@/modules/inventory/inventory-catalog";

const refreshMock = vi.fn();
const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: refreshMock, push: pushMock, replace: replaceMock }),
}));

const metadata: CatalogMetadata = {
  catalogEntries: 16458,
  uniqueCodes: 16458,
};

const maintenance = {
  categories: [{ id: "1", code: "CAT", name: "Categoría" }], manufacturers: [{ id: "2", code: "FAB", name: "Fabricante" }],
  activeIngredients: [{ id: "3", code: "ACT", name: "Principio" }], units: [{ id: "4", code: "UNI", name: "Unidad" }],
  dosageForms: [{ id: "5", code: "FOR", name: "Forma" }], routes: [{ id: "6", code: "VIA", name: "Vía" }],
};

const branches = [
  { id: "branch-01", code: "01", name: "Amina" },
  { id: "branch-48", code: "48", name: "Maizal" },
  { id: "branch-70", code: "70", name: "Esperanza" },
  { id: "branch-81", code: "81", name: "Jaibón" },
];

const result: InventorySearchResult = {
  items: [
    {
      id: "product-1",
      code: "004378",
      name: "CLODIZOL PLUS/CREMA VAGINAL",
      presentation: "CREMA VAGINAL",
      stockByBranch: {
        "70": { onHand: 12, reserved: 2, available: 10, updatedAt: "2026-08-28T12:00:00Z" },
      },
      status: "available",
    },
  ],
  total: 1,
  page: 1,
  pageSize: 25,
  totalPages: 1,
};

describe("InventoryWorkspace", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("shows the imported catalog without claiming branch availability", () => {
    render(
      <InventoryWorkspace maintenance={maintenance} branches={branches} branch="" canWrite filter="all" metadata={metadata} query="clodizol" result={result} view="catalog" />,
    );

    expect(screen.getByRole("heading", { name: "Consulta de productos" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Descargar plantilla/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Productos cargados")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gestionar catálogos" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar resumen y herramientas" }));
    expect(screen.getByRole("button", { name: "Gestionar catálogos" })).toBeInTheDocument();
    const productsCard = screen.getByText("Productos cargados").closest("article");
    expect(productsCard).not.toBeNull();
    expect(within(productsCard!).getByText("16,458")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar resumen y herramientas" })).toBeInTheDocument();
    expect(screen.queryByText("Catálogo maestro con inventario verificable por sucursal")).not.toBeInTheDocument();
    expect(screen.getByText("CLODIZOL PLUS/CREMA VAGINAL")).toBeInTheDocument();
    expect(screen.getAllByText("Sin dato")).toHaveLength(3);
    expect(screen.getByText("10 disponibles")).toBeInTheDocument();
    expect(screen.getByText("Deslice horizontalmente para comparar las cuatro sucursales")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar producto" })).toHaveValue("clodizol");

  });

  it("adds the inventory controls required by the PDF and labels their data dependency", () => {
    render(
      <InventoryWorkspace maintenance={maintenance} branches={branches} branch="" canWrite filter="all" metadata={metadata} query="" result={result} view="catalog" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Mostrar resumen y herramientas" }));
    expect(screen.getByRole("link", { name: /Existencias por sucursal/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lotes y vencimientos/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Traslados sugeridos/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Cobertura PROCONTRA/ })).toBeInTheDocument();
    expect(screen.getAllByText("Requiere inventario operativo").length).toBeGreaterThan(0);
    expect(screen.getByText(/SUCURSAL, EXISTENCIA/)).toBeInTheDocument();
  });

  it("provides filters, one live-stock column per branch and product creation", () => {
    render(
      <InventoryWorkspace maintenance={maintenance} branches={branches} branch="70" canWrite filter="with_stock" metadata={metadata} query="" result={result} view="catalog" />,
    );

    expect(screen.getByRole("button", { name: "Agregar nuevo producto" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Buscar ahora" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refrescar productos" })).not.toBeInTheDocument();
    const searchGroup = screen.getByRole("searchbox", { name: "Buscar producto" }).closest(".inventory-search-group");
    expect(searchGroup).toBeNull();
    const productsHeading = screen.getByRole("heading", { name: "Listado de productos" }).closest(".inventory-products-heading");
    expect(productsHeading).not.toBeNull();
    expect(within(productsHeading as HTMLElement).getByText("1 resultado")).toBeInTheDocument();
    expect(screen.getByLabelText("Filtrar por estado")).toHaveValue("with_stock");
    expect(screen.getByLabelText("Filtrar por sucursal")).toHaveValue("70");
    expect(screen.getByRole("columnheader", { name: "Amina 01" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Maizal 48" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Esperanza 70" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Jaibón 81" })).toBeInTheDocument();
  });

  it("shows product-row skeletons while applying a filter", () => {
    const { rerender } = render(
      <InventoryWorkspace maintenance={maintenance} branches={branches} branch="" canWrite filter="all" metadata={metadata} query="" result={result} view="catalog" />,
    );

    fireEvent.change(screen.getByLabelText("Filtrar por estado"), { target: { value: "without_data" } });

    expect(replaceMock).toHaveBeenCalledWith("/inventario?status=without_data", { scroll: false });
    expect(screen.getByRole("status", { name: "Cargando productos" })).toBeInTheDocument();
    expect(screen.getAllByTestId("inventory-skeleton-row")).toHaveLength(8);

    rerender(
      <InventoryWorkspace maintenance={maintenance} branches={branches} branch="" canWrite filter="all" metadata={metadata} query="" result={{ ...result, items: [...result.items] }} view="catalog" />,
    );

    expect(screen.queryByRole("status", { name: "Cargando productos" })).not.toBeInTheDocument();
    expect(screen.getByText("CLODIZOL PLUS/CREMA VAGINAL")).toBeInTheDocument();
  });

  it("searches while typing without saving each query in browser history", async () => {
    vi.useFakeTimers();
    render(
      <InventoryWorkspace maintenance={maintenance} branches={branches} branch="" canWrite filter="all" metadata={metadata} query="" result={result} view="catalog" />,
    );

    const search = screen.getByRole("searchbox", { name: "Buscar producto" });
    expect(search).toHaveAttribute("autocomplete", "off");
    fireEvent.change(search, { target: { value: "losartán 50" } });
    expect(replaceMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(350); });

    expect(replaceMock).toHaveBeenCalledWith("/inventario?q=losart%C3%A1n+50", { scroll: false });
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole("status", { name: "Cargando productos" })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("applies stock and branch filters as soon as they change", () => {
    render(
      <InventoryWorkspace maintenance={maintenance} branches={branches} branch="" canWrite filter="all" metadata={metadata} query="" result={result} view="catalog" />,
    );

    fireEvent.change(screen.getByLabelText("Filtrar por estado"), { target: { value: "with_stock" } });
    expect(replaceMock).toHaveBeenLastCalledWith("/inventario?status=with_stock", { scroll: false });
    fireEvent.change(screen.getByLabelText("Filtrar por sucursal"), { target: { value: "70" } });
    expect(replaceMock).toHaveBeenLastCalledWith("/inventario?status=with_stock&branch=70", { scroll: false });
    expect(screen.getByRole("status", { name: "Cargando productos" })).toBeInTheDocument();
  });
});
