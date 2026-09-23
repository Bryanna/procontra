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
  const [branches, profileResult, invoicesResult, linesResult, profilesResult] = await Promise.all([
    listInventoryBranches(tenant),
    admin.schema("api").from("t_perfiles").select("f_rol").eq("f_uuid", data.user.id).maybeSingle(),
    admin.schema("api").from("t_facturas_inventario").select("f_uuid,f_referencia,f_tipo_operacion,f_canal_origen,f_estado,f_creado_en").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).order("f_creado_en", { ascending: false }).limit(50),
    admin.schema("api").from("t_renglones_factura").select("f_uuid,f_uuid_factura,f_numero,f_descripcion_original,f_codigo_original,f_cantidad,f_lote,f_fecha_vencimiento,f_estado_conciliacion").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).order("f_numero"),
    admin.schema("api").from("t_perfiles").select("f_uuid,f_nombre_mostrar,f_rol").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).eq("f_activo", true).order("f_nombre_mostrar"),
  ]);
  const lines = linesResult.data ?? [];
  const invoices = (invoicesResult.data ?? []).map((invoice) => ({
    id: invoice.f_uuid, reference: invoice.f_referencia, type: invoice.f_tipo_operacion, channel: invoice.f_canal_origen,
    status: invoice.f_estado, createdAt: invoice.f_creado_en,
    lines: lines.filter((line) => line.f_uuid_factura === invoice.f_uuid).map((line) => ({ id: line.f_uuid, number: line.f_numero, description: line.f_descripcion_original, code: line.f_codigo_original, quantity: Number(line.f_cantidad), lot: line.f_lote, expiry: line.f_fecha_vencimiento, status: line.f_estado_conciliacion, productName: null })),
  }));
  return <InvoiceWorkspace branches={branches} invoices={invoices} isAdmin={profileResult.data?.f_rol === "administrator"} profiles={(profilesResult.data ?? []).map((profile) => ({ id: profile.f_uuid, name: profile.f_nombre_mostrar, role: profile.f_rol }))}/>;
}
