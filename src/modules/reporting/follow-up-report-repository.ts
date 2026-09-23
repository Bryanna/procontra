import type { TenantScope } from "@/infrastructure/supabase/tenant-context";

export const reportResults = ["all", "sin_contacto", "contesto", "no_contesto", "ya_tiene_receta", "no_tiene_receta", "tiene_cita_medica", "esperando_autorizacion", "comprara_efectivo", "volver_a_llamar", "enviar_a_casa", "compro"] as const;
export type ReportResult = typeof reportResults[number];
export type ReportDataScope = "all" | "test" | "operational";

export interface FollowUpReportFilters {
  query: string;
  branchCode: string;
  result: ReportResult;
  dataScope: ReportDataScope;
  from: string;
  to: string;
}

export interface FollowUpReportRow {
  f_uuid: string;
  f_nombre_completo: string;
  f_telefono: string;
  f_sucursal: string | null;
  f_codigo_sucursal: string | null;
  f_ars: string;
  f_medicamentos: string;
  f_medico: string | null;
  f_fecha_primera_compra: string;
  f_proxima_compra: string | null;
  f_fecha_contacto: string | null;
  f_estado: string;
  f_ultimo_resultado: string | null;
  f_total_contactos: number;
  f_ultimo_contacto_en: string | null;
  f_es_prueba: boolean;
  f_fuente_referencia: string | null;
  f_total_registros: number;
}

export interface FollowUpReportItem {
  id: string;
  patientName: string;
  phone: string;
  branch: string | null;
  branchCode: string | null;
  insurer: string;
  medicines: string;
  doctor: string | null;
  firstPurchaseDate: string;
  nextPurchaseDate: string | null;
  contactDate: string | null;
  status: string;
  lastResult: string | null;
  contactCount: number;
  lastContactAt: string | null;
  isTest: boolean;
  sourceReference: string | null;
}

export interface FollowUpReportSummaryRow {
  f_total: number;
  f_contactar_hoy: number;
  f_atrasados: number;
  f_proximos_7_dias: number;
  f_contactados: number;
  f_no_contestaron: number;
  f_sin_receta: number;
  f_completados: number;
}

export interface FollowUpReportSummary {
  total: number;
  contactToday: number;
  overdue: number;
  nextSevenDays: number;
  contacted: number;
  noAnswer: number;
  withoutPrescription: number;
  completed: number;
}

export interface FollowUpReportResult {
  items: FollowUpReportItem[];
  summary: FollowUpReportSummary;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const dataScopes: readonly ReportDataScope[] = ["all", "test", "operational"];

export function normalizeReportDataScope(value: string): ReportDataScope {
  return dataScopes.includes(value as ReportDataScope) ? value as ReportDataScope : "all";
}

export function normalizeReportResult(value: string): ReportResult {
  return reportResults.includes(value as ReportResult) ? value as ReportResult : "all";
}

export function sanitizeReportQuery(value: string): string {
  return value.slice(0, 100).replace(/[%_*,()."\\]/g, " ").replace(/\s+/g, " ").trim();
}

const asNumber = (value: number | undefined) => Number(value ?? 0);

export function buildFollowUpReport(rows: FollowUpReportRow[], page: number, pageSize: number, summaryRow: FollowUpReportSummaryRow): FollowUpReportResult {
  const total = Number(rows[0]?.f_total_registros ?? summaryRow.f_total ?? 0);
  return {
    items: rows.map((row) => ({
      id: row.f_uuid,
      patientName: row.f_nombre_completo,
      phone: row.f_telefono,
      branch: row.f_sucursal,
      branchCode: row.f_codigo_sucursal,
      insurer: row.f_ars,
      medicines: row.f_medicamentos,
      doctor: row.f_medico,
      firstPurchaseDate: row.f_fecha_primera_compra,
      nextPurchaseDate: row.f_proxima_compra,
      contactDate: row.f_fecha_contacto,
      status: row.f_estado,
      lastResult: row.f_ultimo_resultado,
      contactCount: Number(row.f_total_contactos),
      lastContactAt: row.f_ultimo_contacto_en,
      isTest: row.f_es_prueba,
      sourceReference: row.f_fuente_referencia,
    })),
    summary: {
      total: asNumber(summaryRow.f_total),
      contactToday: asNumber(summaryRow.f_contactar_hoy),
      overdue: asNumber(summaryRow.f_atrasados),
      nextSevenDays: asNumber(summaryRow.f_proximos_7_dias),
      contacted: asNumber(summaryRow.f_contactados),
      noAnswer: asNumber(summaryRow.f_no_contestaron),
      withoutPrescription: asNumber(summaryRow.f_sin_receta),
      completed: asNumber(summaryRow.f_completados),
    },
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getFollowUpReport(filters: FollowUpReportFilters, requestedPage: number, requestedPageSize: number, tenant: TenantScope): Promise<FollowUpReportResult> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const pageSize = Math.max(1, Math.min(200, Math.trunc(requestedPageSize) || 50));
  let page = Math.max(1, Math.trunc(requestedPage) || 1);
  const params = {
    p_empresa: tenant.companyId,
    p_app: tenant.appId,
    p_busqueda: sanitizeReportQuery(filters.query),
    p_codigo_sucursal: filters.branchCode.slice(0, 10),
    p_resultado: normalizeReportResult(filters.result),
    p_datos: normalizeReportDataScope(filters.dataScope),
    p_desde: /^\d{4}-\d{2}-\d{2}$/.test(filters.from) ? filters.from : null,
    p_hasta: /^\d{4}-\d{2}-\d{2}$/.test(filters.to) ? filters.to : null,
  };
  const executeRows = (targetPage: number) => getSupabaseAdmin().schema("api").rpc("fn_reporte_seguimiento", {
    ...params,
    p_limite: pageSize,
    p_desplazamiento: (targetPage - 1) * pageSize,
  });
  const [initialRowsResponse, summaryResponse] = await Promise.all([
    executeRows(page),
    getSupabaseAdmin().schema("api").rpc("fn_resumen_reporte_seguimiento", params).single(),
  ]);
  let rowsResponse = initialRowsResponse;
  if (rowsResponse.error || summaryResponse.error) throw new Error("No se pudo generar el reporte de seguimiento");
  if ((rowsResponse.data ?? []).length === 0 && page > 1) {
    page = 1;
    rowsResponse = await executeRows(page);
    if (rowsResponse.error) throw new Error("No se pudo generar el reporte de seguimiento");
  }
  return buildFollowUpReport(
    (rowsResponse.data ?? []) as FollowUpReportRow[],
    page,
    pageSize,
    (summaryResponse.data ?? {}) as FollowUpReportSummaryRow,
  );
}
