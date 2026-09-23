import "server-only";

import { getSupabaseAdmin } from "./server-client";
import { resolveTenantScope, type TenantScope } from "./tenant-context";

export async function getTenantScopeForUser(userId: string): Promise<TenantScope> {
  return resolveTenantScope(userId, async (id) => {
    const { data, error } = await getSupabaseAdmin()
      .schema("api")
      .from("t_perfiles")
      .select("f_idempresa,f_idsucursal,f_app,f_activo")
      .eq("f_uuid", id)
      .maybeSingle();
    if (error) throw new Error("No se pudo resolver el tenant activo");
    return data;
  });
}
