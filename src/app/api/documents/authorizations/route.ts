import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { prepareInsuranceAuthorizationSubmission, type InsuranceAuthorizationInput } from "@/modules/documents/authorization-workflow";
import { documentApiError, requireDocumentWrite } from "../document-api";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function todayInSantoDomingo() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function POST(request: Request) {
  const auth = await requireDocumentWrite();
  if ("response" in auth) return auth.response;
  let uploadedPath = "";
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: "Adjunte una imagen o PDF válido de hasta 10 MB" }, { status: 400 });

    const raw = JSON.parse(String(form.get("metadata") ?? "{}")) as Omit<InsuranceAuthorizationInput, "hash" | "storagePath">;
    const bytes = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(bytes).digest("hex");
    const extension = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
    uploadedPath = `private/${auth.tenant.companyId}/${auth.tenant.appId}/authorizations/${randomUUID()}.${extension}`;
    const input = prepareInsuranceAuthorizationSubmission({ ...raw, source: "web", hash, storagePath: uploadedPath }, todayInSantoDomingo());
    const dataKey = process.env.PROCONTRA_PATIENT_DATA_KEY ?? "";
    if (dataKey.length < 32) throw new Error("Configuración de seguridad de pacientes no disponible");

    const admin = getSupabaseAdmin();
    const upload = await admin.storage.from("invoice-private").upload(uploadedPath, bytes, { contentType: file.type, upsert: false });
    if (upload.error) throw new Error(upload.error.message);

    const { data, error } = await admin.schema("api").rpc("fn_registrar_autorizacion_continuidad", {
      p_actor_uuid: auth.actorId,
      p_canal: "web",
      p_hash_contenido: input.hash,
      p_ruta_almacenamiento: input.storagePath,
      p_uuid_sucursal: input.branchId,
      p_codigo_ars: input.insurerCode,
      p_nombre_paciente: input.patientName,
      p_telefono: input.phone,
      p_identificacion: input.governmentId || null,
      p_carnet: input.insuranceCard || null,
      p_numero_autorizacion: input.authorizationNumber,
      p_fecha_autorizacion: input.authorizationDate,
      p_prescriptor: input.prescriber || null,
      p_estado_autorizado: input.authorized,
      p_uso_continuo: input.continuousUse,
      p_consentimiento: input.consentGranted,
      p_canales_recordatorio: input.reminderChannels,
      p_medicamentos: input.medicines,
      p_clave_datos: dataKey,
    });
    if (error) throw new Error(error.message);
    const result = data as { authorizationId: string; patientId: string; planId: string; created: boolean };
    if (result.created === false) {
      await admin.storage.from("invoice-private").remove([uploadedPath]);
      uploadedPath = "";
    }
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (uploadedPath) await getSupabaseAdmin().storage.from("invoice-private").remove([uploadedPath]);
    return documentApiError(error);
  }
}
