import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdministrator } from "@/app/api/administration/staff-api";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";

export async function POST(request: Request) {
  const auth = await requireAdministrator();
  if ("response" in auth) return auth.response;
  const body = await request.json() as { profileId?: string; whatsappNumber?: string; canReview?: boolean; canCreateProducts?: boolean; canPost?: boolean };
  const admin = getSupabaseAdmin();
  const { data: profile } = await admin.schema("api").from("t_perfiles").select("f_uuid,f_idsucursal")
    .eq("f_uuid", body.profileId).eq("f_idempresa", auth.tenant.companyId).eq("f_app", auth.tenant.appId).eq("f_activo", true).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Usuario activo requerido" }, { status: 400 });
  const { error: reviewerError } = await admin.schema("api").from("t_revisores_documentos").upsert({
    f_uuid_perfil: profile.f_uuid, f_puede_revisar: Boolean(body.canReview), f_puede_crear_productos: Boolean(body.canCreateProducts),
    f_puede_contabilizar: Boolean(body.canPost), f_activo: true, f_idempresa: auth.tenant.companyId,
    f_idsucursal: profile.f_idsucursal, f_app: auth.tenant.appId,
  }, { onConflict: "f_idempresa,f_idsucursal,f_app,f_uuid_perfil" });
  if (reviewerError) return NextResponse.json({ error: "No fue posible guardar el revisor" }, { status: 500 });
  const normalized = String(body.whatsappNumber ?? "").replace(/\D/g, "");
  if (normalized) {
    if (normalized.length < 10 || normalized.length > 15) return NextResponse.json({ error: "Número de WhatsApp inválido" }, { status: 400 });
    const { error } = await admin.schema("api").from("t_identidades_canales").upsert({
      f_uuid_perfil: profile.f_uuid, f_canal: "whatsapp", f_identificador_hash: createHash("sha256").update(normalized).digest("hex"),
      f_identificador_mascara: `***${normalized.slice(-4)}`, f_verificado: true, f_puede_enviar: true,
      f_puede_decidir: Boolean(body.canReview), f_activo: true, f_idempresa: auth.tenant.companyId,
      f_idsucursal: profile.f_idsucursal, f_app: auth.tenant.appId,
    }, { onConflict: "f_idempresa,f_idsucursal,f_app,f_canal,f_identificador_hash" });
    if (error) return NextResponse.json({ error: "No fue posible vincular WhatsApp" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
