import "server-only";

import { NextResponse } from "next/server";

import { StaffAdministrationService } from "@/modules/administration/staff-administration-service";
import { createStaffAdministrationServicePort } from "@/infrastructure/supabase/staff-administration-server";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { buildTenantScope } from "@/infrastructure/supabase/tenant-context";

export async function requireAdministrator() {
  const session = await createSupabaseSessionClient();
  const { data: userData } = await session.auth.getUser();
  if (!userData.user) return { response: NextResponse.json({ error: "Sesión requerida" }, { status: 401 }) } as const;
  const { data: profile, error } = await session
    .schema("api")
    .from("t_perfiles")
    .select("f_rol,f_activo,f_idempresa,f_idsucursal,f_app")
    .eq("f_uuid", userData.user.id)
    .maybeSingle();
  const tenant = buildTenantScope(profile);
  if (error || !tenant || profile?.f_rol !== "administrator") {
    return { response: NextResponse.json({ error: "Acceso administrativo requerido" }, { status: 403 }) } as const;
  }
  return {
    actorId: userData.user.id,
    tenant,
    service: new StaffAdministrationService(createStaffAdministrationServicePort(tenant)),
  } as const;
}

const clientErrors = [
  "Nombre de empleado inválido", "Correo electrónico inválido", "Rol no permitido",
  "Sucursales inválidas", "Sucursal no permitida", "Seleccione al menos una sucursal",
  "Estado de empleado inválido", "No puede desactivar su propia cuenta", "Empleado no encontrado",
  "Active la cuenta antes de restablecer el acceso",
];

export function staffApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const isClientError = clientErrors.includes(message);
  return NextResponse.json(
    { error: isClientError ? message : "No fue posible completar la operación administrativa" },
    { status: isClientError ? 400 : 500 },
  );
}
