import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { prepareInvoiceSubmission, type InvoiceSubmission } from "@/modules/documents/invoice-workflow";
import { documentApiError, requireDocumentWrite } from "../document-api";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request: Request) {
  const auth = await requireDocumentWrite();
  if ("response" in auth) return auth.response;
  let uploadedPath = "";
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: "Adjunte una imagen o PDF válido de hasta 10 MB" }, { status: 400 });
    const raw = JSON.parse(String(form.get("metadata") ?? "{}")) as Omit<InvoiceSubmission, "hash" | "storagePath">;
    const bytes = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex");
    const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
    uploadedPath = `private/${auth.tenant.companyId}/${auth.tenant.appId}/${randomUUID()}.${extension}`;
    const input = prepareInvoiceSubmission({ ...raw, source: "web", hash, storagePath: uploadedPath });
    const admin = getSupabaseAdmin();
    const upload = await admin.storage.from("invoice-private").upload(uploadedPath, bytes, { contentType: file.type, upsert: false });
    if (upload.error) throw new Error(upload.error.message);
    const { data, error } = await admin.schema("api").rpc("fn_recibir_factura_inventario", {
      p_actor_uuid: auth.actorId, p_canal: "web", p_identificador_canal: null,
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
