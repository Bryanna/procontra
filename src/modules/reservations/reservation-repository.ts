import type { TenantScope } from "@/infrastructure/supabase/tenant-context";

export type ReservationStatus = "all" | "created" | "confirmed" | "collected" | "delivered" | "expired" | "cancelled";
export type StoredReservationStatus = Exclude<ReservationStatus, "all">;

export interface ReservationRow {
  f_uuid: string; f_referencia: string; f_uuid_paciente: string; f_nombre_paciente: string; f_telefono: string;
  f_uuid_producto: string; f_codigo_producto: string; f_nombre_producto: string; f_presentacion: string | null;
  f_uuid_sucursal: string; f_codigo_sucursal: string; f_nombre_sucursal: string; f_cantidad: number;
  f_estado: StoredReservationStatus; f_expira_en: string; f_creado_en: string; f_total_registros: number;
}

export interface Reservation {
  id: string; reference: string; patientId: string; patientName: string; phone: string; productId: string;
  productCode: string; productName: string; presentation: string | null; branchId: string; branchCode: string;
  branchName: string; quantity: number; status: StoredReservationStatus; expiresAt: string; createdAt: string;
}

export interface ReservationSearchResult { items: Reservation[]; total: number; page: number; pageSize: number; totalPages: number }
export interface ReservationSummary { total: number; active: number; ready: number; expiringToday: number; expired: number }

const statuses: readonly ReservationStatus[] = ["all","created","confirmed","collected","delivered","expired","cancelled"];
export function normalizeReservationStatus(value: string): ReservationStatus {
  return statuses.includes(value as ReservationStatus) ? value as ReservationStatus : "all";
}
export function sanitizeReservationQuery(value: string): string {
  return value.slice(0,100).replace(/[%_*,()."\\]/g," ").replace(/\s+/g," ").trim();
}
export function buildReservationSearchResult(rows: ReservationRow[], page: number, pageSize: number): ReservationSearchResult {
  const total = Number(rows[0]?.f_total_registros ?? 0);
  return { items: rows.map((row) => ({
    id: row.f_uuid, reference: row.f_referencia, patientId: row.f_uuid_paciente, patientName: row.f_nombre_paciente,
    phone: row.f_telefono, productId: row.f_uuid_producto, productCode: row.f_codigo_producto, productName: row.f_nombre_producto,
    presentation: row.f_presentacion, branchId: row.f_uuid_sucursal, branchCode: row.f_codigo_sucursal,
    branchName: row.f_nombre_sucursal, quantity: Number(row.f_cantidad), status: row.f_estado,
    expiresAt: row.f_expira_en, createdAt: row.f_creado_en,
  })), total, page, pageSize, totalPages: Math.max(1,Math.ceil(total/pageSize)) };
}

export async function searchReservations(query: string,status: ReservationStatus,branchCode: string,requestedPage: number,pageSize: number,tenant: TenantScope): Promise<ReservationSearchResult> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const size=Math.max(1,Math.min(100,Math.trunc(pageSize)||25)); let page=Math.max(1,Math.trunc(requestedPage)||1);
  const execute=(target: number)=>getSupabaseAdmin().schema("api").rpc("fn_consultar_reservas",{
    p_empresa:tenant.companyId,p_app:tenant.appId,p_busqueda:sanitizeReservationQuery(query),p_estado:normalizeReservationStatus(status),
    p_codigo_sucursal:branchCode.trim().slice(0,10),p_limite:size,p_desplazamiento:(target-1)*size,
  });
  let response=await execute(page); if(response.error) throw new Error("No se pudieron consultar las reservas");
  if((response.data??[]).length===0&&page>1){page=1;response=await execute(page);if(response.error) throw new Error("No se pudieron consultar las reservas");}
  return buildReservationSearchResult((response.data??[]) as ReservationRow[],page,size);
}

export async function getReservationSummary(tenant: TenantScope): Promise<ReservationSummary> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const {data,error}=await getSupabaseAdmin().schema("api").rpc("fn_resumen_reservas",{p_empresa:tenant.companyId,p_app:tenant.appId}).single();
  if(error) throw new Error("No se pudo consultar el resumen de reservas");
  const row=(data??{}) as Record<string,number|undefined>;
  return {total:Number(row.f_total??0),active:Number(row.f_activas??0),ready:Number(row.f_listas??0),expiringToday:Number(row.f_vencen_hoy??0),expired:Number(row.f_vencidas??0)};
}
