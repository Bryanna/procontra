import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { parseNewPlanPayload } from "@/modules/follow-up/follow-up-validation";
import { followUpApiError, requireFollowUpWrite } from "../follow-up-api";

export async function POST(request: Request) {
  const auth = await requireFollowUpWrite();
  if ("response" in auth) return auth.response;
  try {
    const input = parseNewPlanPayload(await request.json());
    const { data, error } = await getSupabaseAdmin().schema("api").rpc("fn_crear_plan_seguimiento", {
      p_empresa: auth.tenant.companyId,
      p_sucursal: auth.tenant.branchId,
      p_app: auth.tenant.appId,
      p_email: auth.email,
      p_rnc: auth.rnc,
      p_usuario: auth.actorId,
      p_uuid_paciente: input.patientId,
      p_codigo_ars: input.insurerCode,
      p_fecha_primera_compra: input.firstPurchaseDate,
      p_medicamentos: input.medicines,
      p_numero_receta: input.prescriptionNumber,
      p_fecha_receta: input.prescriptionDate,
      p_items: input.prescriptionItems,
      p_canales_recordatorio: input.reminderChannels,
      p_medico: input.doctor,
      p_numero_caso: input.caseNumber,
      p_observaciones: input.observations,
      p_programacion_modo: input.scheduleMode,
      p_cantidad_recetas: input.prescriptionCount,
      p_numero_receta_actual: input.currentPrescription,
      p_fecha_ultima_compra: input.lastPurchaseDate,
      p_proxima_compra: input.nextPurchaseDate,
      p_fecha_contacto: input.contactDate,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data }, { status: 201 });
  } catch (error) { return followUpApiError(error); }
}
