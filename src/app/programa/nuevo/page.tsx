import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, FileHeart } from "lucide-react";
import { NewPlanWorkspace } from "@/components/new-plan-workspace";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { searchPatientsFromDatabase } from "@/modules/patients/patient-repository";
import { can, isStaffRole } from "@/shared/auth/permissions";

const initialSearch = { pageSize: 8 };

export default async function NewProgramPage() {
  const session = await createSupabaseSessionClient();
  const { data } = await session.auth.getUser();
  if (!data.user) redirect("/ingresar");

  const tenant = await getTenantScopeForUser(data.user.id);
  const [patientResult, profileResult, branchResult] = await Promise.all([
    searchPatientsFromDatabase("", "active", "", 1, initialSearch.pageSize, tenant),
    session.schema("api").from("t_perfiles").select("f_rol,f_nombre_mostrar").eq("f_uuid", data.user.id).maybeSingle(),
    session.schema("api").from("t_sucursales").select("f_nombre,f_codigo").eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).eq("f_idsucursal", tenant.branchId).maybeSingle(),
  ]);
  const role = profileResult.data?.f_rol;
  if (profileResult.error || !isStaffRole(role) || !can(role, "continuity:write")) redirect("/sin-acceso");

  const patients = patientResult.items.map((patient) => ({
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
  }));
  const branchLabel = branchResult.data ? `${branchResult.data.f_nombre} ${branchResult.data.f_codigo}` : `Sucursal ${tenant.branchId}`;

  return <div className="page-stack followup-page followup-new-page">
    <section className="page-heading followup-heading followup-prescription-heading">
      <Link className="followup-back-icon" href="/programa" aria-label="Volver a la agenda"><ArrowLeft size={21} /></Link>
      <div className="followup-heading-copy">
        <span className="followup-hero-icon"><FileHeart size={24} /></span>
        <div><p className="eyebrow">PROGRAMA DE CONTINUIDAD</p><h1>Nueva receta en seguimiento</h1><p className="page-description">Registre la receta, defina los recordatorios y deje preparada la trazabilidad operativa del paciente.</p></div>
      </div>
      <span className="followup-registration-policy followup-heading-policy"><CalendarClock size={18}/><strong>Alerta institucional</strong><small>3 días antes de la próxima compra</small></span>
    </section>
    <NewPlanWorkspace
      initialPatients={patients}
      cancelHref="/programa"
      actorLabel={profileResult.data?.f_nombre_mostrar ?? data.user.email ?? "Usuario autorizado"}
      branchLabel={branchLabel}
    />
  </div>;
}
