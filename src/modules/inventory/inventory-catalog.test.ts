import {

  searchCatalog,
  type CatalogProduct,
} from "./inventory-catalog";

const products: CatalogProduct[] = [
  { code: "000123", name: "LOSARTAN 50 MG", location: "" },
  { code: "000124", name: "METFORMINA 850 MG", location: "" },
  { code: "010500", name: "LOSARTAN 100 MG", location: "A1" },
];

describe("inventory catalog", () => {
  it("finds products by code or description and paginates deterministically", () => {
    expect(searchCatalog(products, "000124", 1, 20).items).toEqual([products[1]]);

    const firstPage = searchCatalog(products, "losartan", 1, 1);
    expect(firstPage.total).toBe(2);
    expect(firstPage.totalPages).toBe(2);
    expect(firstPage.items).toEqual([products[0]]);

    const secondPage = searchCatalog(products, "losartan", 2, 1);
    expect(secondPage.items).toEqual([products[2]]);
  });


});
