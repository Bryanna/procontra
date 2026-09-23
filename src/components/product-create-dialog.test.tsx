import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { ProductCreateDialog } from "./product-create-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const branches = [
  { id: "branch-70", code: "70", name: "Esperanza" },
  { id: "branch-01", code: "01", name: "Amina" },
];
const maintenance = {
  categories: [{ id: "10000000-0000-4000-8000-000000000001", code: "MED", name: "Medicamentos" }],
  manufacturers: [{ id: "10000000-0000-4000-8000-000000000002", code: "LAB", name: "Laboratorio ejemplo" }],
  activeIngredients: [{ id: "10000000-0000-4000-8000-000000000003", code: "ACT", name: "Ingrediente" }],
  units: [{ id: "10000000-0000-4000-8000-000000000004", code: "UNI", name: "Unidad" }],
  dosageForms: [{ id: "10000000-0000-4000-8000-000000000005", code: "TAB", name: "Tableta" }],
  routes: [{ id: "10000000-0000-4000-8000-000000000006", code: "ORAL", name: "Oral" }],
};

describe("ProductCreateDialog", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.unstubAllGlobals();
  });

  it("uses only Supabase maintenance options for relational product fields", () => {
    render(<ProductCreateDialog branches={branches} maintenance={maintenance} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar nuevo producto" }));
    expect(screen.getByRole("dialog", { name: "Agregar nuevo producto" })).toBeInTheDocument();
    expect(screen.getByText("Esperanza 70")).toBeInTheDocument();
    expect(screen.getByText("Amina 01")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Principio activo" })).toHaveValue(maintenance.activeIngredients[0].id);
    expect(screen.getByRole("combobox", { name: "Fabricante o laboratorio" })).toHaveValue(maintenance.manufacturers[0].id);
    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveValue(maintenance.categories[0].id);
    expect(screen.getByRole("combobox", { name: "Unidad de medida" })).toHaveValue(maintenance.units[0].id);
    expect(screen.getByRole("combobox", { name: "Forma farmacéutica" })).toHaveValue(maintenance.dosageForms[0].id);
    expect(screen.getByRole("combobox", { name: "Vía de administración" })).toHaveValue(maintenance.routes[0].id);
    expect(screen.queryByRole("textbox", { name: "Categoría" })).not.toBeInTheDocument();
  });

  it("sends maintenance UUID relationships with the product", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "product-1" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<ProductCreateDialog branches={branches} maintenance={maintenance} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar nuevo producto" }));
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "P-100" } });
    fireEvent.change(screen.getByLabelText("Nombre del producto"), { target: { value: "Producto prueba" } });
    fireEvent.change(screen.getByLabelText("Código de barras"), { target: { value: "7461234567890" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Requiere receta" }));
    fireEvent.submit(screen.getByRole("button", { name: "Guardar producto" }).closest("form")!);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(request.body)).toMatchObject({
      code: "P-100",
      name: "Producto prueba",
      barcode: "7461234567890",
      categoryId: maintenance.categories[0].id,
      manufacturerId: maintenance.manufacturers[0].id,
      activeIngredientId: maintenance.activeIngredients[0].id,
      unitOfMeasureId: maintenance.units[0].id,
      dosageFormId: maintenance.dosageForms[0].id,
      administrationRouteId: maintenance.routes[0].id,
      prescriptionRequired: true,
    });
  });

  it("shows branch inventory fields and recovers from a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    render(<ProductCreateDialog branches={branches} maintenance={maintenance} />);
    fireEvent.click(screen.getByRole("button", { name: "Agregar nuevo producto" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Registrar existencia en Esperanza 70/ }));
    expect(screen.getByLabelText("Existencia")).toBeRequired();
    expect(screen.getByLabelText("Lote")).toBeRequired();
    expect(screen.getByLabelText("Vencimiento")).toBeRequired();
    fireEvent.change(screen.getByLabelText("Código"), { target: { value: "P-100" } });
    fireEvent.change(screen.getByLabelText("Nombre del producto"), { target: { value: "Producto prueba" } });
    fireEvent.submit(screen.getByRole("button", { name: "Guardar producto" }).closest("form")!);
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("No fue posible conectar"));
    expect(screen.getByRole("button", { name: "Guardar producto" })).toBeEnabled();
  });
});
