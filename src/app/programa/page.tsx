import { redirect } from "next/navigation";
import { FollowUpWorkspace } from "@/components/follow-up-workspace";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { listInventoryBranches } from "@/modules/inventory/inventory-repository";
import { getFollowUpSummary, normalizeFollowUpStatus, searchFollowUpPlans } from "@/modules/follow-up/follow-up-repository";
import { can, isStaffRole } from "@/shared/auth/permissions";

const valueOf = (value: string | string[] | undefined, fallback = "") => Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;

export default async function ProgramPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = valueOf(params.q).slice(0, 100);
  const status = normalizeFollowUpStatus(valueOf(params.status, "all"));
  const insurerCode = valueOf(params.ars).slice(0, 40);
  const requestedBranch = valueOf(params.branch).slice(0, 10);
  const requestedPage = Number.parseInt(valueOf(params.page, "1"), 10);
  const session = await createSupabaseSessionClient();
  const { data } = await session.auth.getUser();
  if (!data.user) redirect("/ingresar");

  const tenant = await getTenantScopeForUser(data.user.id);
  const [branches, summary, profileResult] = await Promise.all([
    listInventoryBranches(tenant),
    getFollowUpSummary(tenant),
    session.schema("api").from("t_perfiles").select("f_rol").eq("f_uuid", data.user.id).maybeSingle(),
  ]);
  const role = profileResult.data?.f_rol;
  if (profileResult.error || !isStaffRole(role) || !can(role, "continuity:read")) redirect("/sin-acceso");
  const branchCode = branches.some((branch) => branch.code === requestedBranch) ? requestedBranch : "";
  const result = await searchFollowUpPlans(query, status, insurerCode, branchCode, requestedPage, 25, tenant);

  return <FollowUpWorkspace
    branchCode={branchCode}
    branches={branches}
    canWrite={can(role, "continuity:write")}
    canDispense={can(role, "continuity:write") && can(role, "dispensations:write")}
    insurerCode={insurerCode}
    query={query}
    result={result}
    status={status}
    summary={summary}
  />;
}
