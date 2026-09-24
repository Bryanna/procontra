import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { buildTenantScope } from "@/infrastructure/supabase/tenant-context";
import { can, isStaffRole } from "@/shared/auth/permissions";

export async function requireDocumentWrite() {
  const session = await createSupabaseSessionClient();
  const { data: userData } = await session.auth.getUser();
  if (!userData.user) return { response: NextResponse.json({ error: "Sesión requerida" }, { status: 401 }) } as const;
  const { data: profile, error } = await session.schema("api").from("t_perfiles")
    .select("f_rol,f_activo,f_idempresa,f_idsucursal,f_app").eq("f_uuid", userData.user.id).maybeSingle();
  const tenant = buildTenantScope(profile);
  if (error || !tenant || !isStaffRole(profile?.f_rol) || !can(profile.f_rol, "documents:write"))
    return { response: NextResponse.json({ error: "Permiso de documentos requerido" }, { status: 403 }) } as const;
  return { actorId: userData.user.id, tenant } as const;
}

export function documentApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const known = ["Tipo de documento inválido", "Imagen de factura inválida", "Sucursal inválida", "Renglón de factura inválido", "Renglones de factura requeridos", "Revisor de documentos requerido", "Decisión inválida", "Producto inválido", "Aprobador de inventario requerido", "Factura requiere revisión", "Lote y vencimiento requeridos", "Dispensación requiere autorización vinculada", "Canal de documento inválido", "Documento de autorización inválido", "Estado autorizado requerido", "Uso continuo requerido", "Consentimiento de seguimiento requerido", "Fecha de autorización inválida", "Nombre de paciente inválido", "Teléfono de paciente inválido", "Cédula de paciente inválida", "Carnet de paciente inválido", "Número de autorización requerido", "Medicamentos autorizados inválidos", "Canales de recordatorio inválidos", "ARS no configurada", "Configuración de seguridad no disponible"];
  const message = known.find((value) => raw.includes(value));
  return NextResponse.json({ error: message ?? "No fue posible procesar el documento" }, { status: message ? 400 : 500 });
}
