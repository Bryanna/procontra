import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { getFollowUpTimeline } from "@/modules/follow-up/follow-up-repository";
import { isUuid } from "@/modules/follow-up/follow-up-validation";
import { followUpApiError, requireFollowUpRead } from "../../../follow-up-api";

const resultLabels: Record<string, string> = {
  contesto: "Contestó",
  no_contesto: "No contestó",
  ya_tiene_receta: "Ya tiene receta",
  no_tiene_receta: "No tiene receta",
  tiene_cita_medica: "Tiene cita médica",
  esperando_autorizacion: "Esperando autorización",
  comprara_efectivo: "Comprará en efectivo",
  volver_a_llamar: "Volver a llamar",
  enviar_a_casa: "Enviar a la casa",
  compro: "Compra registrada",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireFollowUpRead();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    if (!isUuid(id)) throw new Error("Plan no disponible");
    const timeline = await getFollowUpTimeline(id, auth.tenant);
    const actorIds = [...new Set(timeline.flatMap((item) => item.actorId ? [item.actorId] : []))];
    const actorResult = actorIds.length
      ? await getSupabaseAdmin().schema("api").from("t_perfiles").select("f_uuid,f_nombre_mostrar")
        .eq("f_idempresa", auth.tenant.companyId).eq("f_app", auth.tenant.appId).in("f_uuid", actorIds)
      : { data: [], error: null };
    if (actorResult.error) throw new Error("No se pudo consultar la trazabilidad");
    const actors = new Map((actorResult.data ?? []).map((actor) => [actor.f_uuid, actor.f_nombre_mostrar]));
    const items = timeline.map((item) => ({
      id: item.id,
      type: item.type === "plan_registered" ? "plan_created" : item.result === "compro" ? "purchase" : item.type,
      title: item.type === "plan_registered" ? "Receta registrada" : resultLabels[item.result ?? ""] ?? "Gestión registrada",
      channel: item.channel,
      result: item.result,
      observations: item.observations,
      nextActionDate: typeof item.metadata.nextActionDate === "string" ? item.metadata.nextActionDate : null,
      actor: item.actorId ? actors.get(item.actorId) ?? "Usuario autorizado" : "Sistema PROCONTRA",
      occurredAt: item.occurredAt,
    }));
    return NextResponse.json({ items });
  } catch (error) {
    return followUpApiError(error);
  }
}
