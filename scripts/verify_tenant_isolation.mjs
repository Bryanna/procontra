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
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const db = admin.schema("api");
const createdIds = [];
try {
  async function createTenantUser(label, companyId, branchId = 1) {
    const email = `tenant-${label}-${Date.now()}@example.invalid`;
    const password = `${randomBytes(24).toString("base64url")}T3!`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: `Tenant ${label}` } });
    if (error || !data.user) throw error ?? new Error("tenant user creation failed");
    createdIds.push(data.user.id);
    const { error: updateError } = await db.from("t_perfiles").update({ f_idempresa: companyId, f_idsucursal: branchId, f_app: 0, f_activo: true }).eq("f_uuid", data.user.id);
    if (updateError) throw updateError;
    const client = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error) throw login.error;
    return client;
  }

  const tenant4 = await createTenantUser("allowed", 4);
  const tenant999 = await createTenantUser("blocked", 999);
  const otherBranch = await createTenantUser("branch-blocked", 4, 2);
  const [allowed, blocked, branchBlocked] = await Promise.all([
    tenant4.schema("api").from("t_productos").select("f_uuid", { count: "exact", head: true }),
    tenant999.schema("api").from("t_productos").select("f_uuid", { count: "exact", head: true }),
    otherBranch.schema("api").from("t_productos").select("f_uuid", { count: "exact", head: true }),
  ]);
  const branch = await db.from("t_sucursales").select("f_uuid").eq("f_idempresa", 4).eq("f_idsucursal", 1).single();
  if (branch.error) throw branch.error;
  const invalidMembership = await db.from("t_membresias_sucursales").insert({
    f_uuid_perfil: createdIds[1], f_uuid_sucursal: branch.data.f_uuid,
    f_idempresa: 999, f_idsucursal: 1, f_app: 0,
  });
  const result = {
    sameTenantCanRead: !allowed.error && (allowed.count ?? 0) > 0,
    otherTenantIsIsolated: !blocked.error && blocked.count === 0,
    otherBranchIsIsolated: !branchBlocked.error && branchBlocked.count === 0,
    crossTenantMembershipRejected: Boolean(invalidMembership.error?.message.includes("Tenant de perfil y sucursal no coincide")),
  };
  if (Object.values(result).some((value) => !value)) throw new Error(`tenant isolation failed: ${JSON.stringify(result)}`);
  console.log(JSON.stringify(result));
} finally {
  for (const id of createdIds) await admin.auth.admin.deleteUser(id);
}
