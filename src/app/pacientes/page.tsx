import { redirect } from "next/navigation";
import { PatientsWorkspace } from "@/components/patients-workspace";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { listInventoryBranches } from "@/modules/inventory/inventory-repository";
import {
  getPatientSummary,
  normalizePatientFilter,
  searchPatientsFromDatabase,
} from "@/modules/patients/patient-repository";
import { can, isStaffRole } from "@/shared/auth/permissions";

const valueOf = (value: string | string[] | undefined, fallback: string) =>
  Array.isArray(value) ? value[0] ?? fallback : value ?? fallback;

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = valueOf(params.q, "").slice(0, 100);
  const filter = normalizePatientFilter(valueOf(params.status, "today"));
  const requestedBranch = valueOf(params.branch, "").slice(0, 10);
  const requestedPage = Number.parseInt(valueOf(params.page, "1"), 10);
  const session = await createSupabaseSessionClient();
  const { data } = await session.auth.getUser();
  if (!data.user) redirect("/ingresar");

  const tenant = await getTenantScopeForUser(data.user.id);
  const [branches, summary, profileResult] = await Promise.all([
    listInventoryBranches(tenant),
    getPatientSummary(tenant),
    session.schema("api").from("t_perfiles").select("f_rol").eq("f_uuid", data.user.id).maybeSingle(),
  ]);
  const branch = branches.some((item) => item.code === requestedBranch) ? requestedBranch : "";
  const result = await searchPatientsFromDatabase(query, filter, branch, requestedPage, 25, tenant);

  const role = profileResult.data?.f_rol;
  const canWrite = !profileResult.error && isStaffRole(role) && can(role, "patients:write");
  return <PatientsWorkspace branch={branch} branches={branches} canWrite={canWrite} filter={filter} query={query} result={result} summary={summary} />;
}
