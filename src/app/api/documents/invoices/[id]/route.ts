import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { documentApiError, requireDocumentWrite } from "../../document-api";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireDocumentWrite();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await context.params;
    const body = await request.json() as { action?: string; lineId?: string; productCode?: string; reason?: string };
    const admin = getSupabaseAdmin();
    if (body.action === "post") {
      const { error } = await admin.schema("api").rpc("fn_contabilizar_factura_inventario", { p_actor_uuid: auth.actorId, p_uuid_factura: id });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }
    let productId: string | null = null;
    if (body.action === "link") {
      const code = String(body.productCode ?? "").trim();
      const { data, error } = await admin.schema("api").from("t_productos").select("f_uuid")
        .eq("f_idempresa", auth.tenant.companyId).eq("f_app", auth.tenant.appId).eq("f_codigo", code).eq("f_activo", true).maybeSingle();
      if (error || !data) return NextResponse.json({ error: "Producto no encontrado por código" }, { status: 400 });
      productId = data.f_uuid;
    }
    const { error } = await admin.schema("api").rpc("fn_decidir_renglon_factura", {
      p_actor_uuid: auth.actorId, p_uuid_renglon: body.lineId, p_accion: body.action,
      p_uuid_producto: productId, p_motivo: body.reason ?? null, p_canal: "web",
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) { return documentApiError(error); }
}
