import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { appUrl } from "@/shared/auth/app-url";

export async function POST() {
  const sessionClient = await createSupabaseSessionClient();
  const { data } = await sessionClient.auth.getUser();
  if (data.user) {
    await getSupabaseAdmin().schema("api").from("t_eventos_auditoria").insert({
      f_uuid_actor: data.user.id,
      f_tipo_evento: "auth.logout",
      f_tipo_entidad: "profile",
      f_uuid_entidad: data.user.id,
      f_uuid_correlacion: randomUUID(),
      f_metadatos_seguros: { channel: "web" },
    });
  }
  await sessionClient.auth.signOut();
  return NextResponse.redirect(appUrl("/ingresar"), 303);
}
