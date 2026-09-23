import type {
  BranchStock,
  CatalogSearchResult,
  InventoryBranch,
  InventoryMaintenanceCatalogs,
  InventoryMaintenanceOption,
  InventorySearchResult,
  InventoryStockFilter,
  InventoryStockStatus,
} from "./inventory-catalog";
import type { TenantScope } from "@/infrastructure/supabase/tenant-context";

interface ProductRow {
  f_codigo: string;
  f_nombre: string;
}

interface InventoryRow extends ProductRow {
  f_uuid: string;
  f_presentacion: string | null;
  f_existencias: Record<string, BranchStock> | null;
  f_estado: InventoryStockStatus;
  f_total_registros: number;
}

interface MaintenanceRow { f_uuid: string; f_codigo: string; f_nombre: string }

export function buildMaintenanceOptions(rows: MaintenanceRow[]): InventoryMaintenanceOption[] {
  return rows.map((row) => ({ id: row.f_uuid, code: row.f_codigo, name: row.f_nombre }));
}

export function buildInventorySearchResult(
  rows: InventoryRow[],
  page: number,
  pageSize: number,
): InventorySearchResult {
  const total = Number(rows[0]?.f_total_registros ?? 0);
  return {
    items: rows.map((row) => ({
      id: row.f_uuid,
      code: row.f_codigo,
      name: row.f_nombre,
      presentation: row.f_presentacion,
      stockByBranch: row.f_existencias ?? {},
      status: row.f_estado,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function sanitizeCatalogQuery(query: string): string {
  return query
    .slice(0, 100)
    .replace(/[%_*,()."\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildCatalogSearchResult(
  rows: ProductRow[],
  total: number,
  page: number,
  pageSize: number,
): CatalogSearchResult {
  return {
    items: rows.map((row) => ({ code: row.f_codigo, name: row.f_nombre, location: "" })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function searchCatalogFromDatabase(
  query: string,
  requestedPage = 1,
  requestedPageSize = 25,
  tenant: TenantScope,
): Promise<CatalogSearchResult> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const client = getSupabaseAdmin();
  const pageSize = Math.max(1, Math.min(100, Math.trunc(requestedPageSize) || 25));
  const initialPage = Math.max(1, Math.trunc(requestedPage) || 1);
  const term = sanitizeCatalogQuery(query);

  const execute = async (page: number) => {
    let builder = client
      .schema("api")
      .from("t_productos")
      .select("f_codigo,f_nombre", { count: "exact" })
      .eq("f_idempresa", tenant.companyId)
      .eq("f_app", tenant.appId)
      .order("f_codigo", { ascending: true });
    if (term) {
      builder = builder.or(`f_codigo.ilike.%${term}%,f_nombre.ilike.%${term}%`);
    }
    return builder.range((page - 1) * pageSize, page * pageSize - 1);
  };

  let page = initialPage;
  let response = await execute(page);
  if (response.error) throw new Error("No se pudo consultar el catálogo persistido");

  const total = response.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (page > totalPages) {
    page = totalPages;
    response = await execute(page);
    if (response.error) throw new Error("No se pudo consultar el catálogo persistido");
  }

  return buildCatalogSearchResult(
    (response.data ?? []) as ProductRow[],
    total,
    page,
    pageSize,
  );
}

const inventoryFilters: readonly InventoryStockFilter[] = [
  "all", "with_stock", "low_stock", "out_of_stock", "without_data",
];

export function normalizeInventoryFilter(value: string): InventoryStockFilter {
  return inventoryFilters.includes(value as InventoryStockFilter)
    ? value as InventoryStockFilter
    : "all";
}

export async function listInventoryBranches(tenant: TenantScope): Promise<InventoryBranch[]> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const { data, error } = await getSupabaseAdmin()
    .schema("api")
    .from("t_sucursales")
    .select("f_uuid,f_codigo,f_nombre")
    .eq("f_idempresa", tenant.companyId)
    .eq("f_app", tenant.appId)
    .eq("f_activo", true)
    .order("f_codigo");
  if (error) throw new Error("No se pudieron consultar las sucursales del inventario");
  return (data ?? []).map((branch) => ({
    id: branch.f_uuid,
    code: branch.f_codigo,
    name: branch.f_nombre,
  }));
}

export async function listInventoryMaintenanceCatalogs(tenant: TenantScope): Promise<InventoryMaintenanceCatalogs> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const client = getSupabaseAdmin();
  const load = async (table: string) => {
    const { data, error } = await client.schema("api").from(table).select("f_uuid,f_codigo,f_nombre")
      .eq("f_idempresa", tenant.companyId).eq("f_idsucursal", tenant.branchId).eq("f_app", tenant.appId)
      .eq("f_activo", true).order("f_nombre");
    if (error) throw new Error("No se pudieron consultar los mantenimientos del inventario");
    return buildMaintenanceOptions((data ?? []) as MaintenanceRow[]);
  };
  const [categories, manufacturers, activeIngredients, units, dosageForms, routes] = await Promise.all([
    load("t_categorias_productos"), load("t_fabricantes_productos"), load("t_principios_activos"),
    load("t_unidades_medida"), load("t_formas_farmaceuticas"), load("t_vias_administracion"),
  ]);
  return { categories, manufacturers, activeIngredients, units, dosageForms, routes };
}

export async function getInventoryCatalogCounts(tenant: TenantScope): Promise<{ catalogEntries: number; uniqueCodes: number }> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const { count, error } = await getSupabaseAdmin().schema("api").from("t_productos")
    .select("f_id", { count: "exact", head: true }).eq("f_idempresa", tenant.companyId)
    .eq("f_idsucursal", tenant.branchId).eq("f_app", tenant.appId).eq("f_activo", true);
  if (error) throw new Error("No se pudo consultar el resumen del catálogo");
  const catalogEntries = count ?? 0;
  return { catalogEntries, uniqueCodes: catalogEntries };
}

export async function searchInventoryFromDatabase(
  query: string,
  filter: InventoryStockFilter,
  branchCode: string,
  requestedPage: number,
  requestedPageSize: number,
  tenant: TenantScope,
): Promise<InventorySearchResult> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const client = getSupabaseAdmin();
  const pageSize = Math.max(1, Math.min(100, Math.trunc(requestedPageSize) || 25));
  let page = Math.max(1, Math.trunc(requestedPage) || 1);
  const execute = (targetPage: number) => client.schema("api").rpc("fn_consultar_inventario", {
    p_empresa: tenant.companyId,
    p_sucursal: tenant.branchId,
    p_app: tenant.appId,
    p_busqueda: sanitizeCatalogQuery(query),
    p_filtro: normalizeInventoryFilter(filter),
    p_codigo_sucursal: branchCode.trim().slice(0, 10),
    p_limite: pageSize,
    p_desplazamiento: (targetPage - 1) * pageSize,
  });

  let response = await execute(page);
  if (response.error) throw new Error("No se pudo consultar el inventario por sucursal");
  if ((response.data ?? []).length === 0 && page > 1) {
    page = 1;
    response = await execute(page);
    if (response.error) throw new Error("No se pudo consultar el inventario por sucursal");
  }
  return buildInventorySearchResult((response.data ?? []) as InventoryRow[], page, pageSize);
}
