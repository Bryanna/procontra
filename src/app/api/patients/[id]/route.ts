import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { listInventoryBranches } from "@/modules/inventory/inventory-repository";
import { preparePatientUpdate } from "@/modules/patients/patient-registration";
import { patientApiError, requirePatientWrite } from "../patient-api";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePatientWrite();
  if ("response" in auth) return auth.response;
  try {
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error("Paciente inválido");
    const branches = await listInventoryBranches(auth.tenant);
    const input = preparePatientUpdate(await request.json(), branches.map((branch) => branch.id));
    const dataKey = process.env.PROCONTRA_PATIENT_DATA_KEY ?? "";
    if (dataKey.length < 32) throw new Error("Configuración de seguridad de pacientes no disponible");
    const { data, error } = await getSupabaseAdmin().schema("api").rpc("fn_actualizar_paciente", {
      p_actor_uuid: auth.actorId, p_paciente_uuid: id, p_nombre: input.name, p_telefono: input.phone,
      p_aseguradora: input.insurer, p_uuid_sucursal: input.branchId, p_identificacion: input.governmentId,
      p_nss: input.insuranceCard, p_fecha_nacimiento: input.birthDate,
      p_telefono_verificado: input.phoneVerified, p_estado_seguimiento: input.followUpStatus,
      p_canal_contacto: input.preferredContactChannel, p_activo: input.active, p_clave_datos: dataKey,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data });
  } catch (error) {
    return patientApiError(error);
  }
}