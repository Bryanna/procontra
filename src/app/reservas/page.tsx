import { redirect } from "next/navigation";
import { ReservationsWorkspace } from "@/components/reservations-workspace";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { listInventoryBranches, searchInventoryFromDatabase } from "@/modules/inventory/inventory-repository";
import { searchPatientsFromDatabase } from "@/modules/patients/patient-repository";
import { getReservationSummary, normalizeReservationStatus, searchReservations } from "@/modules/reservations/reservation-repository";
import { can, isStaffRole } from "@/shared/auth/permissions";

const valueOf=(value:string|string[]|undefined,fallback="")=>Array.isArray(value)?value[0]??fallback:value??fallback;
export default async function ReservationsPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const params=await searchParams;const query=valueOf(params.q).slice(0,100);const status=normalizeReservationStatus(valueOf(params.status,"all"));const requestedBranch=valueOf(params.branch).slice(0,10);const page=Number.parseInt(valueOf(params.page,"1"),10);
  const session=await createSupabaseSessionClient();const {data}=await session.auth.getUser();if(!data.user)redirect("/ingresar");
  const tenant=await getTenantScopeForUser(data.user.id);
  const [branches,summary,patients,products,profile]=await Promise.all([
    listInventoryBranches(tenant),getReservationSummary(tenant),searchPatientsFromDatabase("","active","",1,100,tenant),
    searchInventoryFromDatabase("","with_stock","",1,100,tenant),session.schema("api").from("t_perfiles").select("f_rol").eq("f_uuid",data.user.id).maybeSingle(),
  ]);
  const role=profile.data?.f_rol;if(profile.error||!isStaffRole(role)||!can(role,"reservations:read"))redirect("/sin-acceso");
  const branchCode=branches.some(item=>item.code===requestedBranch)?requestedBranch:"";
  const result=await searchReservations(query,status,branchCode,page,25,tenant);
  return <ReservationsWorkspace branchCode={branchCode} branches={branches.map(item=>({id:item.id,code:item.code,name:item.name}))} canWrite={can(role,"reservations:write")} patients={patients.items.map(item=>({id:item.id,name:item.name}))} products={products.items.map(item=>({id:item.id,code:item.code,name:item.name}))} query={query} result={result} status={status} summary={summary}/>;
}
