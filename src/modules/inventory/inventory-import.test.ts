import { validateInventoryImport } from "./inventory-import";

const validRow = {
  CODIGO: "004378",
  PRODUCTO: "CLODIZOL PLUS/CREMA VAGINAL",
  SUCURSAL: "70",
  EXISTENCIA: "12",
  INVENTARIO_MINIMO: "4",
  LOTE: "L-2026-01",
  VENCIMIENTO: "2027-06-30",
  COSTO: "500.25",
  PRECIO: "750.10",
  ACTUALIZADO_EN: "2026-08-27T18:30:00-04:00",
};

describe("operational inventory import", () => {
  it("accepts a valid branch position and calculates available units", () => {
    const result = validateInventoryImport([validRow], new Set(["004378"]));

    expect(result.accepted).toHaveLength(1);
    expect(result.rejected).toHaveLength(0);
    expect(result.accepted[0]).toMatchObject({
      productCode: "004378",
      branchCode: "70",
      onHand: 12,
      reorderMinimum: 4,
      available: 12,
    });
  });

  it("rejects unknown products, invalid branches, negative quantities and duplicate positions", () => {
    const invalid = {
      ...validRow,
      CODIGO: "999999",
      SUCURSAL: "99",
      EXISTENCIA: "-1",
      VENCIMIENTO: "fecha-invalida",
    };
    const result = validateInventoryImport([invalid, invalid], new Set(["004378"]));

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(2);
    expect(result.rejected[0].errors).toEqual(expect.arrayContaining([
      "Producto no existe en el catálogo maestro",
      "Sucursal no válida",
      "EXISTENCIA debe ser un entero mayor o igual a cero",
      "VENCIMIENTO debe usar el formato AAAA-MM-DD",
    ]));
    expect(result.rejected[1].errors).toContain("Posición duplicada para producto, sucursal y lote");
  });

  it("rejects rows with missing required fields instead of inventing values", () => {
    const result = validateInventoryImport([
      { ...validRow, LOTE: "", ACTUALIZADO_EN: "" },
    ], new Set(["004378"]));

    expect(result.rejected[0].errors).toContain("LOTE es obligatorio");
    expect(result.rejected[0].errors).toContain("ACTUALIZADO_EN es obligatorio");
  });
});
