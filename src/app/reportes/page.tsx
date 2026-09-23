import { redirect } from "next/navigation";
import { FollowUpReportWorkspace } from "@/components/follow-up-report-workspace";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { listInventoryBranches } from "@/modules/inventory/inventory-repository";
import { getFollowUpReport, normalizeReportDataScope, normalizeReportResult, type FollowUpReportFilters } from "@/modules/reporting/follow-up-report-repository";
import { can, isStaffRole } from "@/shared/auth/permissions";

const valueOf = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
const dateValue = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string,string|string[]|undefined>> }) {
  const params = await searchParams;
  const session = await createSupabaseSessionClient();
  const { data } = await session.auth.getUser();
  if (!data.user) redirect("/ingresar");
  const profileResult = await session.schema("api").from("t_perfiles").select("f_rol").eq("f_uuid",data.user.id).maybeSingle();
  const role = profileResult.data?.f_rol;
  if (profileResult.error || !isStaffRole(role) || !can(role,"reports:read")) redirect("/sin-acceso");

  const tenant = await getTenantScopeForUser(data.user.id);
  const branches = await listInventoryBranches(tenant);
  const requestedBranch = valueOf(params.branch).slice(0,10);
  const filters: FollowUpReportFilters = {
    query: valueOf(params.q).slice(0,100),
    branchCode: branches.some((branch) => branch.code === requestedBranch) ? requestedBranch : "",
    result: normalizeReportResult(valueOf(params.result)),
    dataScope: normalizeReportDataScope(valueOf(params.data)),
    from: dateValue(valueOf(params.from)),
    to: dateValue(valueOf(params.to)),
  };
  const page = Number.parseInt(valueOf(params.page) || "1",10);
  const report = await getFollowUpReport(filters,page,50,tenant);
  return <FollowUpReportWorkspace branches={branches} filters={filters} report={report}/>;
}
