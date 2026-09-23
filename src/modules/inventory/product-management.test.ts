import { prepareProductCreate } from "./product-management";

const relations = {
  categoryId: "10000000-0000-4000-8000-000000000001",
  manufacturerId: "10000000-0000-4000-8000-000000000002",
  activeIngredientId: "10000000-0000-4000-8000-000000000003",
  unitOfMeasureId: "10000000-0000-4000-8000-000000000004",
  dosageFormId: "10000000-0000-4000-8000-000000000005",
  administrationRouteId: "10000000-0000-4000-8000-000000000006",
};

describe("product inventory management", () => {
  it("normalizes a relational product and validates initial stock by branch", () => {
    expect(prepareProductCreate({
      code: " 004378 ", name: " clodizol plus ", presentation: " crema vaginal ",
      barcode: " 7461234567890 ", ...relations, sanitaryRegistration: " reg-123 ", prescriptionRequired: true,
      positions: [{ branchId: "branch-70", onHand: "12", reorderMinimum: "4", lot: " L-001 ", expiryDate: "2027-08-31", cost: "100.50", price: "145" }],
    }, ["branch-70"], new Date("2026-08-28T00:00:00Z"))).toEqual({
      code: "004378", name: "CLODIZOL PLUS", presentation: "CREMA VAGINAL", barcode: "7461234567890",
      ...relations, sanitaryRegistration: "REG-123", prescriptionRequired: true,
      positions: [{ branchId: "branch-70", onHand: 12, reorderMinimum: 4, lot: "L-001", expiryDate: "2027-08-31", cost: 100.5, price: 145 }],
    });
  });

  it("requires valid Supabase maintenance UUID relationships", () => {
    expect(() => prepareProductCreate({ code: "001", name: "Producto", barcode: "ABC-INVALIDO", ...relations }, [], new Date("2026-08-28T00:00:00Z"))).toThrow("Código de barras inválido");
    expect(() => prepareProductCreate({ code: "001", name: "Producto", ...relations, categoryId: "texto-duro" }, [], new Date("2026-08-28T00:00:00Z"))).toThrow("Categoría inválida");
  });

  it("rejects incomplete or unauthorized branch stock", () => {
    expect(() => prepareProductCreate({ code: "", name: "Producto" }, [], new Date())).toThrow("Código de producto inválido");
    expect(() => prepareProductCreate({ code: "001", name: "Producto", ...relations, positions: [{ branchId: "other", onHand: 1, reorderMinimum: 0, lot: "L", expiryDate: "2027-01-01" }] }, ["branch-70"], new Date("2026-08-28T00:00:00Z"))).toThrow("Sucursal de inventario inválida");
  });
});
