import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { buildTenantScope } from "@/infrastructure/supabase/tenant-context";
import { can, isStaffRole } from "@/shared/auth/permissions";

export async function requireInventoryWrite() {
  const session = await createSupabaseSessionClient();
  const { data: userData } = await session.auth.getUser();
  if (!userData.user) {
    return { response: NextResponse.json({ error: "Sesión requerida" }, { status: 401 }) } as const;
  }
  const { data: profile, error } = await session
    .schema("api")
    .from("t_perfiles")
    .select("f_rol,f_activo,f_idempresa,f_idsucursal,f_app")
    .eq("f_uuid", userData.user.id)
    .maybeSingle();
  const tenant = buildTenantScope(profile);
  if (error || !tenant || !isStaffRole(profile?.f_rol) || !can(profile.f_rol, "inventory:write")) {
    return { response: NextResponse.json({ error: "Permiso de inventario requerido" }, { status: 403 }) } as const;
  }
  return { actorId: userData.user.id, tenant } as const;
}

const inventoryClientErrors = [
  "Código de producto inválido",
  "Nombre de producto inválido",
  "Presentación de producto inválida",
  "Código de barras inválido",
  "Principio activo inválido",
  "Fabricante inválido",
  "Categoría inválida",
  "Unidad de medida inválida",
  "Forma farmacéutica inválida",
  "Vía de administración inválida",
  "Tipo de mantenimiento inválido",
  "Nombre de mantenimiento inválido",
  "Datos de mantenimiento inválidos",
  "Código de mantenimiento ya existe",
  "Registro sanitario inválido",
  "Posiciones de inventario inválidas",
  "Sucursal de inventario inválida",
  "Existencia inicial inválida",
  "Mínimo de reposición inválido",
  "Lote de inventario inválido",
  "Vencimiento de inventario inválido",
  "Costo de inventario inválido",
  "Precio de inventario inválido",
  "Código de producto ya existe",
];

export function inventoryApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : "";
  const message = inventoryClientErrors.find((candidate) => raw.includes(candidate));
  return NextResponse.json(
    { error: message ?? "No fue posible completar la operación de inventario" },
    { status: message ? 400 : 500 },
  );
}
