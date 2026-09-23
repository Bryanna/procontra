import type { TenantScope } from "@/infrastructure/supabase/tenant-context";

export type StoredFollowUpStatus = "active" | "paused" | "completed" | "retired";
export type FollowUpStatus = "all" | StoredFollowUpStatus | "contact_today" | "overdue" | "next_3_days";
export type FollowUpMode = "monthly" | "case_number";

export interface FollowUpPlanRow {
  f_uuid: string;
  f_uuid_paciente: string;
  f_nombre_completo: string;
  f_telefono: string;
  f_ars: string;
  f_codigo_ars: string;
  f_cantidad_recetas: number | null;
  f_modo: FollowUpMode;
  f_sucursal: string | null;
  f_codigo_sucursal: string | null;
  f_medicamentos: string;
  f_medico: string | null;
  f_numero_caso: string | null;
  f_fecha_primera_compra: string;
  f_fecha_ultima_compra: string;
  f_numero_receta_actual: number;
  f_proxima_compra: string | null;
  f_fecha_contacto: string | null;
  f_estado: StoredFollowUpStatus;
  f_ultimo_resultado: string | null;
  f_total_registros: number;
}

export interface FollowUpPlan {
  id: string;
  patientId: string;
  patientName: string;
  phone: string;
  insurer: string;
  insurerCode: string;
  prescriptionCount: number | null;
  mode: FollowUpMode;
  branch: string | null;
  branchCode: string | null;
  medicines: string;
  doctor: string | null;
  caseNumber: string | null;
  firstPurchaseDate: string;
  lastPurchaseDate: string;
  currentPrescription: number;
  nextPurchaseDate: string | null;
  contactDate: string | null;
  status: StoredFollowUpStatus;
  lastResult: string | null;
}

export interface FollowUpSearchResult {
  items: FollowUpPlan[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FollowUpSummary {
  total: number;
  contactToday: number;
  overdue: number;
  nextThreeDays: number;
  completed: number;
}

export interface FollowUpTimelineRow {
  f_uuid: string;
  f_tipo: string;
  f_ocurrido_en: string;
  f_canal: string | null;
  f_resultado: string | null;
  f_observaciones: string | null;
  f_uuid_actor: string | null;
  f_metadatos: Record<string, unknown>;
}

export interface FollowUpTimelineItem {
  id: string;
  type: string;
  occurredAt: string;
  channel: string | null;
  result: string | null;
  observations: string | null;
  actorId: string | null;
  metadata: Record<string, unknown>;
}


const statuses: readonly FollowUpStatus[] = ["all", "active", "paused", "completed", "retired", "contact_today", "overdue", "next_3_days"];

export function normalizeFollowUpStatus(value: string): FollowUpStatus {
  return statuses.includes(value as FollowUpStatus) ? value as FollowUpStatus : "all";
}

export function sanitizeFollowUpQuery(query: string): string {
  return query.slice(0, 100).replace(/[%_*,()."\\]/g, " ").replace(/\s+/g, " ").trim();
}

export function buildFollowUpSearchResult(rows: FollowUpPlanRow[], page: number, pageSize: number): FollowUpSearchResult {
  const total = Number(rows[0]?.f_total_registros ?? 0);
  return {
    items: rows.map((row) => ({
      id: row.f_uuid,
      patientId: row.f_uuid_paciente,
      patientName: row.f_nombre_completo,
      phone: row.f_telefono,
      insurer: row.f_ars,
      insurerCode: row.f_codigo_ars,
      prescriptionCount: row.f_cantidad_recetas,
      mode: row.f_modo,
      branch: row.f_sucursal,
      branchCode: row.f_codigo_sucursal,
      medicines: row.f_medicamentos,
      doctor: row.f_medico,
      caseNumber: row.f_numero_caso,
      firstPurchaseDate: row.f_fecha_primera_compra,
      lastPurchaseDate: row.f_fecha_ultima_compra,
      currentPrescription: row.f_numero_receta_actual,
      nextPurchaseDate: row.f_proxima_compra,
      contactDate: row.f_fecha_contacto,
      status: row.f_estado,
      lastResult: row.f_ultimo_resultado,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function buildFollowUpTimeline(rows: FollowUpTimelineRow[]): FollowUpTimelineItem[] {
  return rows.map((row) => ({
    id: row.f_uuid,
    type: row.f_tipo,
    occurredAt: row.f_ocurrido_en,
    channel: row.f_canal,
    result: row.f_resultado,
    observations: row.f_observaciones,
    actorId: row.f_uuid_actor,
    metadata: row.f_metadatos ?? {},
  }));
}

export async function getFollowUpTimeline(planId: string, tenant: TenantScope): Promise<FollowUpTimelineItem[]> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const { data, error } = await getSupabaseAdmin().schema("api").rpc("fn_historial_plan_seguimiento", {
    p_empresa: tenant.companyId,
    p_app: tenant.appId,
    p_uuid_plan: planId,
  });
  if (error) throw new Error(error.message);
  return buildFollowUpTimeline((data ?? []) as FollowUpTimelineRow[]);
}


export async function searchFollowUpPlans(
  query: string,
  status: FollowUpStatus,
  insurerCode: string,
  branchCode: string,
  requestedPage: number,
  requestedPageSize: number,
  tenant: TenantScope,
): Promise<FollowUpSearchResult> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const pageSize = Math.max(1, Math.min(100, Math.trunc(requestedPageSize) || 25));
  let page = Math.max(1, Math.trunc(requestedPage) || 1);
  const execute = (targetPage: number) => getSupabaseAdmin().schema("api").rpc("fn_consultar_planes_seguimiento", {
    p_empresa: tenant.companyId,
    p_app: tenant.appId,
    p_busqueda: sanitizeFollowUpQuery(query),
    p_estado: normalizeFollowUpStatus(status),
    p_codigo_ars: insurerCode.trim().slice(0, 40),
    p_codigo_sucursal: branchCode.trim().slice(0, 10),
    p_limite: pageSize,
    p_desplazamiento: (targetPage - 1) * pageSize,
  });
  let response = await execute(page);
  if (response.error) throw new Error("No se pudieron consultar los planes de seguimiento");
  if ((response.data ?? []).length === 0 && page > 1) {
    page = 1;
    response = await execute(page);
    if (response.error) throw new Error("No se pudieron consultar los planes de seguimiento");
  }
  return buildFollowUpSearchResult((response.data ?? []) as FollowUpPlanRow[], page, pageSize);
}

export async function getFollowUpSummary(tenant: TenantScope): Promise<FollowUpSummary> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const { data, error } = await getSupabaseAdmin().schema("api").rpc("fn_resumen_planes_seguimiento", {
    p_empresa: tenant.companyId,
    p_app: tenant.appId,
  }).single();
  if (error) throw new Error("No se pudo consultar el resumen de seguimiento");
  const row = (data ?? {}) as Record<string, number | undefined>;
  return {
    total: Number(row.f_total ?? 0),
    contactToday: Number(row.f_contactar_hoy ?? 0),
    overdue: Number(row.f_atrasados ?? 0),
    nextThreeDays: Number(row.f_proximos_3_dias ?? 0),
    completed: Number(row.f_completados ?? 0),
  };
}
