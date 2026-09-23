import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { prepareInvoiceSubmission, type InvoiceSubmission } from "@/modules/documents/invoice-workflow";
import { documentApiError } from "../../document-api";

function authorized(request: Request) {
  const expected = process.env.PROCONTRA_CHANNEL_KEY ?? "";
  const received = request.headers.get("x-procontra-channel-key") ?? "";
  return expected.length >= 32 && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Canal no autorizado" }, { status: 401 });
  let uploadedPath = "";
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 1 || file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
    const raw = JSON.parse(String(form.get("metadata") ?? "{}")) as Omit<InvoiceSubmission, "hash" | "storagePath" | "source"> & { branchCode?: string };
    const sender = String(form.get("sender") ?? "");
    const admin = getSupabaseAdmin();
    if (!raw.branchId && raw.branchCode) {
      const senderHash = createHash("sha256").update(sender.replace(/\D/g, "")).digest("hex");
      const { data: identity } = await admin.schema("api").from("t_identidades_canales").select("f_idempresa,f_app")
        .eq("f_canal", "whatsapp").eq("f_identificador_hash", senderHash).eq("f_verificado", true).eq("f_activo", true).maybeSingle();
      if (!identity) return NextResponse.json({ error: "Identidad de canal no autorizada" }, { status: 403 });
      const { data: branch } = await admin.schema("api").from("t_sucursales").select("f_uuid")
        .eq("f_idempresa", identity.f_idempresa).eq("f_app", identity.f_app).eq("f_codigo", raw.branchCode).eq("f_activo", true).maybeSingle();
      if (!branch) return NextResponse.json({ error: "Sucursal inválida" }, { status: 400 });
      raw.branchId = branch.f_uuid;
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex");
    uploadedPath = `private/whatsapp/${randomUUID()}.${file.type === "application/pdf" ? "pdf" : "jpg"}`;
    const input = prepareInvoiceSubmission({ ...raw, source: "whatsapp", hash, storagePath: uploadedPath, channelIdentifier: sender });
    const upload = await admin.storage.from("invoice-private").upload(uploadedPath, bytes, { contentType: file.type || "image/jpeg" });
    if (upload.error) throw new Error(upload.error.message);
    const { data, error } = await admin.schema("api").rpc("fn_recibir_factura_inventario", {
      p_actor_uuid: null, p_canal: "whatsapp", p_identificador_canal: sender,
      p_tipo_operacion: input.documentType, p_hash_contenido: input.hash,
      p_ruta_almacenamiento: input.storagePath, p_uuid_sucursal: input.branchId,
      p_referencia: input.reference ?? null, p_renglones: input.lines,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data }, { status: 201 });
  } catch (error) {
    if (uploadedPath) await getSupabaseAdmin().storage.from("invoice-private").remove([uploadedPath]);
    return documentApiError(error);
  }
}
