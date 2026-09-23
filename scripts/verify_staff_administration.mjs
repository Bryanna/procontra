import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function envFile(path) {
  return Object.fromEntries(readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => {
    const split = line.indexOf("=");
    return [line.slice(0, split), line.slice(split + 1).replace(/^['"]|['"]$/g, "")];
  }));
}

const env = envFile(".env.local");
const client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const db = client.schema("api");
let userId;
try {
  const { data: admins, error: adminError } = await db.from("t_perfiles").select("f_uuid").eq("f_rol", "administrator").eq("f_activo", true).limit(1);
  if (adminError || !admins?.[0]) throw adminError ?? new Error("active administrator missing");
  const actorId = admins[0].f_uuid;
  const { data: branches, error: branchError } = await db.from("t_sucursales").select("f_uuid,f_codigo").eq("f_activo", true).order("f_codigo").limit(2);
  if (branchError || !branches || branches.length < 2) throw branchError ?? new Error("branches missing");

  const email = `verify-${Date.now()}@example.invalid`;
  const password = `${randomBytes(24).toString("base64url")}A1!`;
  const { data: created, error: createError } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: "Verificación Temporal" } });
  if (createError || !created.user) throw createError ?? new Error("auth creation failed");
  userId = created.user.id;

  const { error: profileError } = await db.rpc("fn_crear_perfil_empleado", {
    p_actor_uuid: actorId, p_perfil_uuid: userId, p_nombre: "Verificación Temporal", p_rol: "attention", p_sucursales_uuid: [branches[0].f_uuid],
  });
  if (profileError) throw profileError;
  const { error: updateError } = await db.rpc("fn_actualizar_perfil_empleado", {
    p_actor_uuid: actorId, p_perfil_uuid: userId, p_nombre: "Verificación Temporal", p_rol: "inventory", p_activo: true,
    p_sucursales_uuid: [branches[1].f_uuid], p_campos_cambiados: ["role", "branchIds"],
  });
  if (updateError) throw updateError;

  const [{ data: profile }, { data: memberships }, { data: audits }, recovery, selfGuard] = await Promise.all([
    db.from("t_perfiles").select("f_rol,f_activo").eq("f_uuid", userId).single(),
    db.from("t_membresias_sucursales").select("f_uuid_sucursal").eq("f_uuid_perfil", userId),
    db.from("t_eventos_auditoria").select("f_tipo_evento").eq("f_uuid_entidad", userId),
    client.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: `${env.APP_URL}/api/auth/callback?next=/restablecer` } }),
    db.rpc("fn_actualizar_perfil_empleado", {
      p_actor_uuid: actorId, p_perfil_uuid: actorId, p_nombre: "Autoprotección", p_rol: "administrator", p_activo: false,
      p_sucursales_uuid: [], p_campos_cambiados: ["active"],
    }),
  ]);
  const actionLink = recovery.data?.properties?.action_link;
  const tokenHash = actionLink ? new URL(actionLink).searchParams.get("token") : null;
  const recoveryClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const recoveredPassword = `${randomBytes(24).toString("base64url")}B2!`;
  const verified = tokenHash
    ? await recoveryClient.auth.verifyOtp({ type: "recovery", token_hash: tokenHash })
    : { error: new Error("missing recovery token") };
  const passwordUpdate = verified.error
    ? { error: verified.error }
    : await recoveryClient.auth.updateUser({ password: recoveredPassword });
  await recoveryClient.auth.signOut();
  const recoveredLogin = passwordUpdate.error
    ? { data: { user: null }, error: passwordUpdate.error }
    : await recoveryClient.auth.signInWithPassword({ email, password: recoveredPassword });
  const eventTypes = new Set((audits ?? []).map((event) => event.f_tipo_evento));
  const result = {
    createdAndListed: profile?.f_rol === "inventory" && profile?.f_activo === true,
    branchUpdated: memberships?.length === 1 && memberships[0].f_uuid_sucursal === branches[1].f_uuid,
    auditCreated: eventTypes.has("staff.created") && eventTypes.has("staff.updated"),
    recoveryGenerated: Boolean(recovery.data?.properties?.action_link) && !recovery.error,
    recoveryFlowCompleted: Boolean(recoveredLogin.data.user) && !recoveredLogin.error,
    selfDeactivationBlocked: Boolean(selfGuard.error?.message.includes("No puede desactivar su propia cuenta")),
  };
  if (Object.values(result).some((value) => !value)) throw new Error(`runtime verification failed: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result));
} finally {
  if (userId) {
    await db.from("t_eventos_auditoria").delete().eq("f_uuid_entidad", userId);
    await client.auth.admin.deleteUser(userId);
  }
}
