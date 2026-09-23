import type { TenantScope } from "@/infrastructure/supabase/tenant-context";
import type { PatientFilter, PatientListItem, PatientSearchResult, PatientSummary } from "./patient-catalog";

export interface PatientRow {
  f_uuid: string;
  f_codigo_interno: string;
  f_nombre_completo: string;
  f_telefono: string;
  f_identificacion_mascara: string | null;
  f_nss_mascara: string | null;
  f_fecha_nacimiento: string | null;
  f_telefono_verificado: boolean;
  f_aseguradora: string | null;
  f_estado_seguimiento: PatientListItem["followUpStatus"];
  f_canal_contacto_preferido: PatientListItem["preferredContactChannel"];
  f_sucursal: string | null;
  f_codigo_sucursal: string | null;
  f_activo: boolean;
  f_estado_consentimiento: string | null;
  f_creado_en: string;
  f_total_registros: number;
}

const patientFilters: readonly PatientFilter[] = ["today", "all", "active", "inactive", "with_consent", "without_consent"];

export function normalizePatientFilter(value: string): PatientFilter {
  return patientFilters.includes(value as PatientFilter) ? value as PatientFilter : "all";
}

export function sanitizePatientQuery(query: string): string {
  return query.slice(0, 100).replace(/[%_*,()."\\]/g, " ").replace(/\s+/g, " ").trim();
}

export function buildPatientSearchResult(rows: PatientRow[], page: number, pageSize: number): PatientSearchResult {
  const total = Number(rows[0]?.f_total_registros ?? 0);
  return {
    items: rows.map((row) => ({
      id: row.f_uuid,
      code: row.f_codigo_interno,
      name: row.f_nombre_completo,
      phone: row.f_telefono,
      governmentIdMask: row.f_identificacion_mascara,
      insuranceCardMask: row.f_nss_mascara,
      birthDate: row.f_fecha_nacimiento,
      phoneVerified: row.f_telefono_verificado,
      insurer: row.f_aseguradora,
      followUpStatus: row.f_estado_seguimiento,
      preferredContactChannel: row.f_canal_contacto_preferido,
      branch: row.f_sucursal,
      branchCode: row.f_codigo_sucursal,
      active: row.f_activo,
      consentStatus: row.f_estado_consentimiento,
      joinedAt: row.f_creado_en,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function searchPatientsFromDatabase(
  query: string,
  filter: PatientFilter,
  branchCode: string,
  requestedPage: number,
  requestedPageSize: number,
  tenant: TenantScope,
): Promise<PatientSearchResult> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const client = getSupabaseAdmin();
  const dataKey = process.env.PROCONTRA_PATIENT_DATA_KEY ?? "";
  if (dataKey.length < 32) throw new Error("Configuración de seguridad de pacientes no disponible");
  const pageSize = Math.max(1, Math.min(100, Math.trunc(requestedPageSize) || 25));
  let page = Math.max(1, Math.trunc(requestedPage) || 1);
  const execute = (targetPage: number) => client.schema("api").rpc("fn_consultar_pacientes", {
    p_empresa: tenant.companyId,
    p_app: tenant.appId,
    p_clave_datos: dataKey,
    p_busqueda: sanitizePatientQuery(query),
    p_filtro: normalizePatientFilter(filter),
    p_codigo_sucursal: branchCode.trim().slice(0, 10),
    p_limite: pageSize,
    p_desplazamiento: (targetPage - 1) * pageSize,
  });

  let response = await execute(page);
  if (response.error) throw new Error("No se pudieron consultar los pacientes");
  if ((response.data ?? []).length === 0 && page > 1) {
    page = 1;
    response = await execute(page);
    if (response.error) throw new Error("No se pudieron consultar los pacientes");
  }
  return buildPatientSearchResult((response.data ?? []) as PatientRow[], page, pageSize);
}

export async function getPatientById(id: string, tenant: TenantScope): Promise<PatientListItem | null> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return null;
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const client = getSupabaseAdmin();
  const { data: patient, error } = await client.schema("api").from("t_pacientes")
    .select("f_uuid,f_codigo_interno,f_nombre_completo,f_telefono,f_identificacion_mascara,f_nss_mascara,f_fecha_nacimiento,f_telefono_verificado_en,f_aseguradora,f_estado_seguimiento,f_canal_contacto_preferido,f_uuid_sucursal_preferida,f_activo,f_creado_en")
    .eq("f_uuid", id).eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).maybeSingle();
  if (error) throw new Error("No se pudo consultar el perfil del paciente");
  if (!patient) return null;
  const [branchResult, consentResult] = await Promise.all([
    patient.f_uuid_sucursal_preferida
      ? client.schema("api").from("t_sucursales").select("f_nombre,f_codigo")
        .eq("f_uuid", patient.f_uuid_sucursal_preferida).eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    client.schema("api").from("t_consentimientos").select("f_estado")
      .eq("f_uuid_paciente", id).eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId)
      .order("f_creado_en", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (branchResult.error || consentResult.error) throw new Error("No se pudo completar el perfil del paciente");
  return {
    id: patient.f_uuid,
    code: patient.f_codigo_interno,
    name: patient.f_nombre_completo,
    phone: patient.f_telefono,
    governmentIdMask: patient.f_identificacion_mascara,
    insuranceCardMask: patient.f_nss_mascara,
    birthDate: patient.f_fecha_nacimiento,
    phoneVerified: patient.f_telefono_verificado_en !== null,
    insurer: patient.f_aseguradora,
    followUpStatus: patient.f_estado_seguimiento,
    preferredContactChannel: patient.f_canal_contacto_preferido,
    branch: branchResult.data?.f_nombre ?? null,
    branchCode: branchResult.data?.f_codigo ?? null,
    active: patient.f_activo,
    consentStatus: consentResult.data?.f_estado ?? null,
    joinedAt: patient.f_creado_en,
  };
}

export async function getPatientSummary(tenant: TenantScope): Promise<PatientSummary> {
  const { getSupabaseAdmin } = await import("@/infrastructure/supabase/server-client");
  const { data, error } = await getSupabaseAdmin().schema("api").rpc("fn_resumen_pacientes", {
    p_empresa: tenant.companyId,
    p_app: tenant.appId,
  }).single();
  if (error) throw new Error("No se pudo consultar el resumen de pacientes");
  const row = (data ?? {}) as {
    f_total_pacientes?: number;
    f_pacientes_activos?: number;
    f_pacientes_inactivos?: number;
    f_consentimientos_vigentes?: number;
    f_sin_consentimiento_vigente?: number;
    f_continuidad_activa?: number;
    f_alertas_pendientes?: number;
    f_nuevos_mes?: number;
    f_con_sucursal_preferida?: number;
  };
  return {
    totalPatients: Number(row.f_total_pacientes ?? 0),
    activePatients: Number(row.f_pacientes_activos ?? 0),
    inactivePatients: Number(row.f_pacientes_inactivos ?? 0),
    currentConsents: Number(row.f_consentimientos_vigentes ?? 0),
    withoutCurrentConsent: Number(row.f_sin_consentimiento_vigente ?? 0),
    activeContinuity: Number(row.f_continuidad_activa ?? 0),
    pendingAlerts: Number(row.f_alertas_pendientes ?? 0),
    newThisMonth: Number(row.f_nuevos_mes ?? 0),
    patientsWithBranch: Number(row.f_con_sucursal_preferida ?? 0),
  };
}
