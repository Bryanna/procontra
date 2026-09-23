import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { buildTenantScope } from "@/infrastructure/supabase/tenant-context";
import { can, isStaffRole } from "@/shared/auth/permissions";

export async function requirePatientRead() {
  const session = await createSupabaseSessionClient();
  const { data: userData } = await session.auth.getUser();
  if (!userData.user) return { response: NextResponse.json({ error: "Sesión requerida" }, { status: 401 }) } as const;
  const { data: profile, error } = await session.schema("api").from("t_perfiles")
    .select("f_rol,f_activo,f_idempresa,f_idsucursal,f_app").eq("f_uuid", userData.user.id).maybeSingle();
  const tenant = buildTenantScope(profile);
  if (error || !tenant || !isStaffRole(profile?.f_rol) || !can(profile.f_rol, "patients:read")) {
    return { response: NextResponse.json({ error: "Permiso de pacientes requerido" }, { status: 403 }) } as const;
  }
  return { actorId: userData.user.id, tenant } as const;
}

export async function requirePatientWrite() {
  const session = await createSupabaseSessionClient();
  const { data: userData } = await session.auth.getUser();
  if (!userData.user) return { response: NextResponse.json({ error: "Sesión requerida" }, { status: 401 }) } as const;
  const { data: profile, error } = await session.schema("api").from("t_perfiles")
    .select("f_rol,f_activo,f_idempresa,f_idsucursal,f_app").eq("f_uuid", userData.user.id).maybeSingle();
  const tenant = buildTenantScope(profile);
  if (error || !tenant || !isStaffRole(profile?.f_rol) || !can(profile.f_rol, "patients:write")) {
    return { response: NextResponse.json({ error: "Permiso de pacientes requerido" }, { status: 403 }) } as const;
  }
  return { actorId: userData.user.id, tenant } as const;
}

const patientClientErrors = [
  "Código de paciente inválido", "Nombre de paciente inválido", "Cédula de paciente inválida",
  "NSS de paciente inválido", "Carnet de paciente inválido", "Fecha de nacimiento inválida", "Teléfono de paciente inválido",
  "Estado de seguimiento inválido", "Canal de contacto inválido", "Sucursal de paciente inválida",
  "Aseguradora de paciente inválida", "Código de paciente ya existe", "Cédula de paciente ya registrada",
  "NSS de paciente ya registrado", "Registro de paciente duplicado",
];

export function patientApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const internalMessage = patientClientErrors.find((candidate) => raw.includes(candidate));
  const message = internalMessage?.replace("NSS", "Carnet");
  return NextResponse.json({ error: message ?? "No fue posible completar la operación de pacientes" }, { status: message ? 400 : 500 });
}
