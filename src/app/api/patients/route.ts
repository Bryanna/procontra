import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { listInventoryBranches } from "@/modules/inventory/inventory-repository";
import { searchPatientsFromDatabase } from "@/modules/patients/patient-repository";
import { preparePatientCreate } from "@/modules/patients/patient-registration";
import { patientApiError, requirePatientRead, requirePatientWrite } from "./patient-api";

export async function GET(request: Request) {
  const auth = await requirePatientRead();
  if ("response" in auth) return auth.response;
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const pageSize = Math.max(1, Math.min(25, Number(url.searchParams.get("limit")) || 8));
    const result = await searchPatientsFromDatabase(query, "active", "", 1, pageSize, auth.tenant);
    return NextResponse.json({
      items: result.items.map((patient) => ({
        id: patient.id,
        code: patient.code,
        name: patient.name,
        phone: patient.phone,
        insurer: patient.insurer,
        insuranceCardMask: patient.insuranceCardMask,
        branch: patient.branch,
        branchCode: patient.branchCode,
        phoneVerified: patient.phoneVerified,
        preferredContactChannel: patient.preferredContactChannel,
        consentStatus: patient.consentStatus,
      })),
      total: result.total,
      pageSize,
    });
  } catch (error) {
    return patientApiError(error);
  }
}

export async function POST(request: Request) {
  const auth = await requirePatientWrite();
  if ("response" in auth) return auth.response;
  try {
    const branches = await listInventoryBranches(auth.tenant);
    const input = preparePatientCreate(await request.json(), branches.map((branch) => branch.id));
    const dataKey = process.env.PROCONTRA_PATIENT_DATA_KEY ?? "";
    if (dataKey.length < 32) throw new Error("Configuración de seguridad de pacientes no disponible");
    const { data, error } = await getSupabaseAdmin().schema("api").rpc("fn_crear_paciente", {
      p_actor_uuid: auth.actorId,
      p_codigo: input.code,
      p_nombre: input.name,
      p_telefono: input.phone,
      p_identificacion: input.governmentId,
      p_nss: input.insuranceCard,
      p_fecha_nacimiento: input.birthDate,
      p_telefono_verificado: input.phoneVerified,
      p_aseguradora: input.insurer,
      p_estado_seguimiento: input.followUpStatus,
      p_canal_contacto: input.preferredContactChannel,
      p_uuid_sucursal: input.branchId,
      p_consentimiento: input.consentGranted,
      p_clave_datos: dataKey,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({ id: data }, { status: 201 });
  } catch (error) {
    return patientApiError(error);
  }
}
