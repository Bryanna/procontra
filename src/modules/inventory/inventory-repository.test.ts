import {
  buildCatalogSearchResult,
  buildInventorySearchResult,
  buildMaintenanceOptions,
  sanitizeCatalogQuery,
} from "./inventory-repository";

describe("Supabase inventory repository", () => {
  it("sanitizes PostgREST control characters from catalog searches", () => {
    expect(sanitizeCatalogQuery('clodi%,zol_(test)"')).toBe("clodi zol test");
  });

  it("maps database rows to catalog-only search results", () => {
    expect(buildCatalogSearchResult(
      [{ f_codigo: "004378", f_nombre: "CLODIZOL PLUS" }],
      16458,
      2,
      25,
    )).toEqual({
      items: [{ code: "004378", name: "CLODIZOL PLUS", location: "" }],
      total: 16458,
      page: 2,
      pageSize: 25,
      totalPages: 659,
    });
  });

  it("maps branch stock without inventing unavailable quantities", () => {
    expect(buildInventorySearchResult([
      {
        f_uuid: "product-1",
        f_codigo: "004378",
        f_nombre: "CLODIZOL PLUS",
        f_presentacion: "CREMA VAGINAL",
        f_existencias: {
          "70": { onHand: 12, reserved: 2, available: 10, updatedAt: "2026-08-28T12:00:00Z" },
        },
        f_estado: "available",
        f_total_registros: 1,
      },
    ], 1, 25)).toEqual({
      items: [{
        id: "product-1",
        code: "004378",
        name: "CLODIZOL PLUS",
        presentation: "CREMA VAGINAL",
        stockByBranch: {
          "70": { onHand: 12, reserved: 2, available: 10, updatedAt: "2026-08-28T12:00:00Z" },
        },
        status: "available",
      }],
      total: 1,
      page: 1,
      pageSize: 25,
      totalPages: 1,
    });

    expect(buildInventorySearchResult([{
      f_uuid: "product-2",
      f_codigo: "000002",
      f_nombre: "PRODUCTO SIN INVENTARIO",
      f_presentacion: null,
      f_existencias: {},
      f_estado: "no_data",
      f_total_registros: 1,
    }], 1, 25).items[0].stockByBranch).toEqual({});
  });

  it("maps Supabase maintenance rows to selectable options", () => {
    expect(buildMaintenanceOptions([{ f_uuid: "catalog-1", f_codigo: "MED", f_nombre: "MEDICAMENTOS" }]))
      .toEqual([{ id: "catalog-1", code: "MED", name: "MEDICAMENTOS" }]);
  });
});
