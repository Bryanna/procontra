import { InventoryWorkspace } from "@/components/inventory-workspace";
import {
  getInventoryCatalogCounts,
  listInventoryBranches,
  listInventoryMaintenanceCatalogs,
  normalizeInventoryFilter,
  searchInventoryFromDatabase,
} from "@/modules/inventory/inventory-repository";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { redirect } from "next/navigation";
import { can, isStaffRole } from "@/shared/auth/permissions";

const valueOf = (value: string | string[] | undefined, fallback: string) =>
  Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = valueOf(params.q, "").slice(0, 100);
  const view = valueOf(params.view, "catalog");
  const filter = normalizeInventoryFilter(valueOf(params.status, "all"));
  const requestedBranch = valueOf(params.branch, "").slice(0, 10);
  const requestedPage = Number.parseInt(valueOf(params.page, "1"), 10);
  const session = await createSupabaseSessionClient();
  const { data } = await session.auth.getUser();
  if (!data.user) redirect("/ingresar");
  const tenant = await getTenantScopeForUser(data.user.id);
  const [branches, maintenance, metadata, profileResult] = await Promise.all([
    listInventoryBranches(tenant),
    listInventoryMaintenanceCatalogs(tenant),
    getInventoryCatalogCounts(tenant),
    session.schema("api").from("t_perfiles").select("f_rol").eq("f_uuid", data.user.id).maybeSingle(),
  ]);
  const branch = branches.some((item) => item.code === requestedBranch) ? requestedBranch : "";
  const result = await searchInventoryFromDatabase(query, filter, branch, requestedPage, 25, tenant);
  const role = profileResult.data?.f_rol;
  const canWrite = !profileResult.error && isStaffRole(role) && can(role, "inventory:write");

  return (
    <InventoryWorkspace
      metadata={metadata}
      maintenance={maintenance}
      branches={branches}
      branch={branch}
      canWrite={canWrite}
      filter={filter}
      query={query}
      result={result}
      view={view}
    />
  );
}
