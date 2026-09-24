import { redirect } from "next/navigation";
import { InvoiceWorkspace } from "@/components/invoice-workspace";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { listInventoryBranches } from "@/modules/inventory/inventory-repository";

export default async function DocumentsPage() {
  const session = await createSupabaseSessionClient();
  const { data } = await session.auth.getUser();
  if (!data.user) redirect("/ingresar");
  const tenant = await getTenantScopeForUser(data.user.id);
  const admin = getSupabaseAdmin();
  const [branches, profileResult, invoicesResult, invoiceLinesResult, profilesResult, authorizationsResult, authorizationLinesResult, patientsResult, plansResult, insurersResult] = await Promise.all([
    listInventoryBranches(tenant),
    admin.schema("api").from("t_perfiles").select("f_rol").eq("f_uuid", data.user.id).maybeSingle(),
    admin.schema("api").from("t_facturas_inventario").select("f_uuid,f_referencia,f_tipo_operacion,f_canal_origen,f_estado,f_creado_en").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).order("f_creado_en", { ascending: false }).limit(50),
    admin.schema("api").from("t_renglones_factura").select("f_uuid,f_uuid_factura,f_numero,f_descripcion_original,f_codigo_original,f_cantidad,f_lote,f_fecha_vencimiento,f_estado_conciliacion").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).order("f_numero"),
    admin.schema("api").from("t_perfiles").select("f_uuid,f_nombre_mostrar,f_rol").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).eq("f_activo", true).order("f_nombre_mostrar"),
    admin.schema("api").from("t_autorizaciones_seguros").select("f_uuid,f_uuid_paciente,f_uuid_plan,f_uuid_regla_ars,f_numero_autorizacion,f_estado,f_creado_en").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).order("f_creado_en", { ascending: false }).limit(50),
    admin.schema("api").from("t_renglones_autorizacion").select("f_uuid,f_uuid_autorizacion,f_descripcion_original,f_cantidad,f_estado_conciliacion").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).order("f_posicion"),
    admin.schema("api").from("t_pacientes").select("f_uuid,f_nombre_completo").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId),
    admin.schema("api").from("t_planes_seguimiento").select("f_uuid,f_numero_receta").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId),
    admin.schema("api").from("t_reglas_ars").select("f_uuid,f_codigo,f_nombre").eq("f_idempresa", 0).eq("f_app", 0).eq("f_activa", true).order("f_nombre"),
  ]);

  const invoiceLines = invoiceLinesResult.data ?? [];
  const invoices = (invoicesResult.data ?? []).map((invoice) => ({
    id: invoice.f_uuid,
    reference: invoice.f_referencia,
    type: invoice.f_tipo_operacion,
    channel: invoice.f_canal_origen,
    status: invoice.f_estado,
    createdAt: invoice.f_creado_en,
    lines: invoiceLines.filter((line) => line.f_uuid_factura === invoice.f_uuid).map((line) => ({
      id: line.f_uuid,
      number: line.f_numero,
      description: line.f_descripcion_original,
      code: line.f_codigo_original,
      quantity: Number(line.f_cantidad),
      lot: line.f_lote,
      expiry: line.f_fecha_vencimiento,
      status: line.f_estado_conciliacion,
      productName: null,
    })),
  }));

  const patients = new Map((patientsResult.data ?? []).map((patient) => [patient.f_uuid, patient.f_nombre_completo]));
  const plans = new Map((plansResult.data ?? []).map((plan) => [plan.f_uuid, plan.f_numero_receta]));
  const rules = new Map((insurersResult.data ?? []).map((rule) => [rule.f_uuid, rule.f_nombre]));
  const authorizationLines = authorizationLinesResult.data ?? [];
  const authorizations = (authorizationsResult.data ?? []).map((authorization) => ({
    id: authorization.f_uuid,
    reference: authorization.f_numero_autorizacion,
    insurer: rules.get(authorization.f_uuid_regla_ars) ?? "ARS",
    patientName: patients.get(authorization.f_uuid_paciente) ?? "Paciente protegido",
    prescriptionNumber: plans.get(authorization.f_uuid_plan) ?? "Receta vinculada",
    status: authorization.f_estado,
    createdAt: authorization.f_creado_en,
    medicines: authorizationLines.filter((line) => line.f_uuid_autorizacion === authorization.f_uuid).map((line) => ({
      id: line.f_uuid,
      description: line.f_descripcion_original,
      quantity: Number(line.f_cantidad),
      status: line.f_estado_conciliacion,
    })),
  }));

  return <InvoiceWorkspace
    branches={branches}
    invoices={invoices}
    authorizations={authorizations}
    insurers={(insurersResult.data ?? []).map((rule) => ({ code: rule.f_codigo, name: rule.f_nombre }))}
    isAdmin={profileResult.data?.f_rol === "administrator"}
    profiles={(profilesResult.data ?? []).map((profile) => ({ id: profile.f_uuid, name: profile.f_nombre_mostrar, role: profile.f_rol }))}
  />;
}
