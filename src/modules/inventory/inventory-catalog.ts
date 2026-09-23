
export interface CatalogProduct {
  code: string;
  name: string;
  location: string;
}

export interface CatalogMetadata {
  catalogEntries: number;
  uniqueCodes: number;
}

export interface CatalogSearchResult {
  items: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type InventoryStockStatus = "available" | "low_stock" | "out_of_stock" | "no_data";
export type InventoryStockFilter = "all" | "with_stock" | "low_stock" | "out_of_stock" | "without_data";

export interface InventoryBranch {
  id: string;
  code: string;
  name: string;
}

export interface InventoryMaintenanceOption {
  id: string;
  code: string;
  name: string;
}

export interface InventoryMaintenanceCatalogs {
  categories: InventoryMaintenanceOption[];
  manufacturers: InventoryMaintenanceOption[];
  activeIngredients: InventoryMaintenanceOption[];
  units: InventoryMaintenanceOption[];
  dosageForms: InventoryMaintenanceOption[];
  routes: InventoryMaintenanceOption[];
}

export interface BranchStock {
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string | null;
}

export interface InventoryProduct {
  id: string;
  code: string;
  name: string;
  presentation: string | null;
  stockByBranch: Record<string, BranchStock>;
  status: InventoryStockStatus;
}

export interface InventorySearchResult {
  items: InventoryProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();


export function searchCatalog(
  products: CatalogProduct[],
  query: string,
  requestedPage = 1,
  pageSize = 25,
): CatalogSearchResult {
  const term = normalize(query);
  const filtered = term
    ? products.filter((product) =>
        normalize(`${product.code} ${product.name}`).includes(term),
      )
    : products;
  const safePageSize = Math.max(1, Math.min(100, Math.trunc(pageSize) || 25));
  const totalPages = Math.max(1, Math.ceil(filtered.length / safePageSize));
  const page = Math.max(1, Math.min(totalPages, Math.trunc(requestedPage) || 1));
  const start = (page - 1) * safePageSize;

  return {
    items: filtered.slice(start, start + safePageSize),
    total: filtered.length,
    page,
    pageSize: safePageSize,
    totalPages,
  };
}
