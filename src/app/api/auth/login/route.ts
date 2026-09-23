import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { validateLoginCredentials } from "@/shared/auth/credentials";
import { appUrl } from "@/shared/auth/app-url";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { tenantDatabaseFields } from "@/infrastructure/supabase/tenant-context";

const loginError = () =>
  NextResponse.redirect(appUrl("/ingresar?error=credenciales"), 303);

export async function POST(request: Request) {
  const form = await request.formData();
  const credentials = validateLoginCredentials({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!credentials.ok) return loginError();

  const sessionClient = await createSupabaseSessionClient();
  const { data, error } = await sessionClient.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  if (error || !data.user) return loginError();

  let tenant;
  try {
    tenant = await getTenantScopeForUser(data.user.id);
  } catch {
    await sessionClient.auth.signOut();
    return loginError();
  }

  await getSupabaseAdmin().schema("api").from("t_eventos_auditoria").insert({
    f_uuid_actor: data.user.id,
    f_tipo_evento: "auth.login",
    f_tipo_entidad: "profile",
    f_uuid_entidad: data.user.id,
    f_uuid_correlacion: randomUUID(),
    f_metadatos_seguros: { channel: "web" },
    ...tenantDatabaseFields(tenant),
  });

  return NextResponse.redirect(appUrl("/"), 303);
}
