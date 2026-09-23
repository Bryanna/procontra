import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { isUuid } from "@/modules/follow-up/follow-up-validation";
import { followUpApiError, requireFollowUpWrite } from "../follow-up-api";

export async function GET(request: Request) {
  const auth = await requireFollowUpWrite();
  if ("response" in auth) return auth.response;
  try {
    const url = new URL(request.url);
    const planId = url.searchParams.get("planId") ?? "";
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 100).replace(/[%_*,()."\\]/g, " ");
    if (!isUuid(planId)) throw new Error("Plan no disponible");
    const { data, error } = await getSupabaseAdmin().schema("api").rpc("fn_buscar_productos_dispensables", {
      p_empresa: auth.tenant.companyId,
      p_app: auth.tenant.appId,
      p_uuid_plan: planId,
      p_busqueda: query,
      p_limite: 10,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({
      items: (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.f_uuid,
        code: row.f_codigo,
        name: row.f_nombre,
        presentation: row.f_presentacion,
        available: Number(row.f_disponible ?? 0),
        updatedAt: row.f_actualizado_en,
      })),
    });
  } catch (error) {
    return followUpApiError(error);
  }
}
