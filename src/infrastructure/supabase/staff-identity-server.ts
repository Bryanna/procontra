import "server-only";

import type { StaffView } from "@/shared/auth/permissions";
import { createSupabaseSessionClient } from "./session-client";
import { buildStaffView } from "./staff-identity";

export async function getCurrentStaffView(): Promise<StaffView | null> {
  const supabase = await createSupabaseSessionClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const [profileResult, membershipsResult] = await Promise.all([
    supabase
      .schema("api")
      .from("t_perfiles")
      .select("f_nombre_mostrar,f_rol,f_activo")
      .eq("f_uuid", userData.user.id)
      .maybeSingle(),
    supabase
      .schema("api")
      .from("t_membresias_sucursales")
      .select("f_uuid_sucursal,t_sucursales(f_codigo,f_nombre)")
      .eq("f_uuid_perfil", userData.user.id),
  ]);

  if (profileResult.error || membershipsResult.error) return null;
  return buildStaffView(profileResult.data, membershipsResult.data ?? []);
}
