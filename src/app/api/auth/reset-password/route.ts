import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/infrastructure/supabase/server-client";
import { createSupabaseSessionClient } from "@/infrastructure/supabase/session-client";
import { appUrl } from "@/shared/auth/app-url";
import { validatePasswordReset } from "@/shared/auth/password-reset";
import { getTenantScopeForUser } from "@/infrastructure/supabase/tenant-context-server";
import { tenantDatabaseFields } from "@/infrastructure/supabase/tenant-context";

export async function POST(request: Request) {
  const form = await request.formData();
  const validated = validatePasswordReset(form.get("password"), form.get("confirmation"));
  if (!validated.ok) return NextResponse.redirect(appUrl("/restablecer?error=clave"), 303);
  const supabase = await createSupabaseSessionClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.redirect(appUrl("/ingresar?error=recuperacion"), 303);
  let tenant;
  try {
    tenant = await getTenantScopeForUser(userData.user.id);
  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(appUrl("/ingresar?error=recuperacion"), 303);
  }
  const { error } = await supabase.auth.updateUser({
    password: validated.password,
    data: { must_change_password: false },
  });
  if (error) return NextResponse.redirect(appUrl("/restablecer?error=clave"), 303);
  await getSupabaseAdmin().schema("api").from("t_eventos_auditoria").insert({
    f_uuid_actor: userData.user.id,
    f_tipo_evento: "auth.password_changed",
    f_tipo_entidad: "profile",
    f_uuid_entidad: userData.user.id,
    f_uuid_correlacion: randomUUID(),
    f_metadatos_seguros: { channel: "recovery" },
    ...tenantDatabaseFields(tenant),
  });
  await supabase.auth.signOut();
  return NextResponse.redirect(appUrl("/ingresar?reset=success"), 303);
}
