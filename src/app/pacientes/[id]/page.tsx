import { notFound, redirect } from "next/navigation";
import { PatientRecordProfile } from "@/components/patient-record-profile";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { getPatientById } from "@/modules/patients/patient-repository";

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await createSupabaseSessionClient();
  const { data } = await session.auth.getUser();
  if (!data.user) redirect("/ingresar");
  const tenant = await getTenantScopeForUser(data.user.id);
  const patient = await getPatientById(id, tenant);
  if (!patient) notFound();
  return <PatientRecordProfile patient={patient} />;
}
