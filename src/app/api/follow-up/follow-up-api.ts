import { NextResponse } from "next/server";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { can, isStaffRole } from "@/shared/auth/permissions";

async function requireFollowUpPermission(permission: "continuity:read" | "continuity:write") {
  const session = await createSupabaseSessionClient();
  const { data } = await session.auth.getUser();
  if (!data.user) return { response: NextResponse.json({ error: "Sesión requerida" }, { status: 401 }) };
  const tenant = await getTenantScopeForUser(data.user.id);
  const profile = await session.schema("api").from("t_perfiles")
    .select("f_rol,f_email_principal,f_rnc_principal")
    .eq("f_uuid", data.user.id).eq("f_idempresa", tenant.companyId).eq("f_app", tenant.appId).maybeSingle();
  if (profile.error || !profile.data || !isStaffRole(profile.data.f_rol) || !can(profile.data.f_rol, permission)) {
    return { response: NextResponse.json({ error: "No autorizado" }, { status: 403 }) };
  }
  return {
    actorId: data.user.id,
    role: profile.data.f_rol,
    email: profile.data.f_email_principal || data.user.email || "usuario@procontra.local",
    rnc: profile.data.f_rnc_principal || "PENDIENTE",
    tenant,
  };
}

export function requireFollowUpRead() {
  return requireFollowUpPermission("continuity:read");
}

export async function requireFollowUpWrite() {
  return requireFollowUpPermission("continuity:write");
}

const safeMessages = ["Paciente inválido","ARS inválida","Fecha de primera compra inválida","Número de receta requerido","Fecha de receta inválida","Renglones de receta requeridos","Renglones de receta inválidos","Canales de recordatorio inválidos","Medicamentos requeridos","Número de caso requerido para IDOPPRIL","Programación manual inválida","Resultado inválido","Canal inválido","Próxima acción inválida","Paciente no disponible","ARS no configurada","Plan no disponible","Producto dispensado requerido","Cantidad dispensada inválida","Unidades por día inválidas","Clave idempotente inválida","Receta actual inválida","El plan cambió; actualice antes de confirmar la compra","Sucursal no disponible","Existencia insuficiente o desactualizada","Cobertura calculada inválida","Compra requiere dispensación","Conflicto de clave idempotente","No autorizado"];
export function followUpApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const safe = safeMessages.find((candidate) => message.includes(candidate));
  return NextResponse.json({ error: safe ?? "No se pudo completar la operación de seguimiento" }, { status: safe ? 400 : 500 });
}
