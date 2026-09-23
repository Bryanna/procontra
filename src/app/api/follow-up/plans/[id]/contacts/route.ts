import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { isUuid, parseContactPayload } from "@/modules/follow-up/follow-up-validation";
import { canRegisterFollowUpPurchase } from "@/modules/follow-up/follow-up-permissions";
import { followUpApiError, requireFollowUpWrite } from "../../../follow-up-api";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFollowUpWrite();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    if (!isUuid(id)) throw new Error("Plan no disponible");
    const input = parseContactPayload(await request.json());
    if (input.result === "compro" && !canRegisterFollowUpPurchase(auth.role)) {
      return NextResponse.json({ error: "Permiso de dispensación requerido" }, { status: 403 });
    }
    const client = getSupabaseAdmin().schema("api");
    const operation = input.result === "compro"
      ? client.rpc("fn_registrar_compra_seguimiento", {
        p_empresa: auth.tenant.companyId,
        p_app: auth.tenant.appId,
        p_uuid_plan: id,
        p_uuid_producto: input.productId,
        p_cantidad: input.quantity,
        p_unidades_por_dia: input.unitsPerDay,
        p_indicaciones_verificadas: input.directionsVerified,
        p_clave_idempotencia: input.idempotencyKey,
        p_receta_esperada: input.currentPrescription,
        p_canal: input.channel,
        p_observaciones: input.observations,
        p_usuario: auth.actorId,
      })
      : client.rpc("fn_registrar_resultado_seguimiento", {
        p_empresa: auth.tenant.companyId,
        p_app: auth.tenant.appId,
        p_uuid_plan: id,
        p_resultado: input.result,
        p_canal: input.channel,
        p_observaciones: input.observations,
        p_proxima_accion: input.nextActionDate,
        p_usuario: auth.actorId,
      });
    const { data, error } = await operation;
    if (error) throw new Error(error.message);
    return NextResponse.json(input.result === "compro" ? { ok: true, dispensationId: data } : { ok: true }, { status: 201 });
  } catch (error) { return followUpApiError(error); }
}
