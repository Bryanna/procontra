import "server-only";

import { randomBytes, randomUUID } from "node:crypto";

import { appUrl } from "@/shared/auth/app-url";
import type { StaffAdministrationPort } from "@/modules/administration/staff-administration-service";
import type { StaffAuditEvent } from "@/modules/administration/staff-administration-service";
import type { StaffAccount, StaffBranch } from "@/modules/administration/staff-management";
import { getSupabaseAdmin } from "./server-client";
import { mapStaffAccounts } from "./staff-account-mapper";
import { tenantDatabaseFields, type TenantScope } from "./tenant-context";

function fail(error: { message: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

export class SupabaseStaffAdministrationPort implements StaffAdministrationPort {
  constructor(private readonly tenant: TenantScope) {}

  async listAccounts(): Promise<StaffAccount[]> {
    const admin = getSupabaseAdmin();
    const [{ data: authData, error: authError }, { data: profiles, error: profileError }] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.schema("api").from("t_perfiles").select("f_uuid,f_nombre_mostrar,f_rol,f_activo,f_creado_en,t_membresias_sucursales(t_sucursales(f_uuid,f_codigo,f_nombre))")
        .eq("f_idempresa", this.tenant.companyId).eq("f_app", this.tenant.appId).order("f_nombre_mostrar"),
    ]);
    if (authError) fail(authError, "No se pudieron consultar los usuarios");
    if (profileError) fail(profileError, "No se pudieron consultar los perfiles");
    return mapStaffAccounts(authData.users, (profiles ?? []) as never[]);
  }

  async listBranches(): Promise<StaffBranch[]> {
    const { data, error } = await getSupabaseAdmin()
      .schema("api")
      .from("t_sucursales")
      .select("f_uuid,f_codigo,f_nombre")
      .eq("f_idempresa", this.tenant.companyId)
      .eq("f_app", this.tenant.appId)
      .eq("f_activo", true)
      .order("f_codigo");
    if (error) fail(error, "No se pudieron consultar las sucursales");
    return (data ?? []).map((branch) => ({ id: branch.f_uuid, code: branch.f_codigo, name: branch.f_nombre }));
  }

  async listAuditEvents(): Promise<StaffAuditEvent[]> {
    const admin = getSupabaseAdmin();
    const { data: events, error } = await admin
      .schema("api")
      .from("t_eventos_auditoria")
      .select("f_uuid,f_uuid_actor,f_tipo_evento,f_uuid_entidad,f_metadatos_seguros,f_creado_en")
      .eq("f_idempresa", this.tenant.companyId)
      .eq("f_app", this.tenant.appId)
      .like("f_tipo_evento", "staff.%")
      .order("f_creado_en", { ascending: false })
      .limit(25);
    if (error) fail(error, "No se pudo consultar la auditoría");
    const actorIds = [...new Set((events ?? []).flatMap((event) => event.f_uuid_actor ? [event.f_uuid_actor] : []))];
    const { data: actors, error: actorError } = actorIds.length
      ? await admin.schema("api").from("t_perfiles").select("f_uuid,f_nombre_mostrar")
        .eq("f_idempresa", this.tenant.companyId).eq("f_app", this.tenant.appId).in("f_uuid", actorIds)
      : { data: [], error: null };
    if (actorError) fail(actorError, "No se pudieron consultar los actores de auditoría");
    const names = new Map((actors ?? []).map((actor) => [actor.f_uuid, actor.f_nombre_mostrar]));
    return (events ?? []).map((event) => ({
      id: event.f_uuid,
      eventType: event.f_tipo_evento,
      entityId: event.f_uuid_entidad,
      actorName: event.f_uuid_actor ? names.get(event.f_uuid_actor) ?? "Usuario eliminado" : "Sistema",
      createdAt: event.f_creado_en,
      metadata: (event.f_metadatos_seguros ?? {}) as Record<string, unknown>,
    }));
  }

  async findAccount(id: string): Promise<StaffAccount | null> {
    return (await this.listAccounts()).find((account) => account.id === id) ?? null;
  }

  async createAuthUser(input: { email: string; displayName: string }) {
    const password = `${randomBytes(24).toString("base64url")}A1!`;
    const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
      email: input.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: input.displayName },
    });
    if (error || !data.user) fail(error, "No se pudo crear el acceso del empleado");
    return { id: data.user.id };
  }

  async deleteAuthUser(id: string): Promise<void> {
    const { error } = await getSupabaseAdmin().auth.admin.deleteUser(id);
    if (error) fail(error, "No se pudo revertir el usuario incompleto");
  }

  async saveNewProfile(
    input: { id: string; displayName: string; role: StaffAccount["role"]; branchIds: string[] },
    actorId: string,
  ): Promise<void> {
    const { error } = await getSupabaseAdmin().schema("api").rpc("fn_crear_perfil_empleado", {
      p_actor_uuid: actorId,
      p_perfil_uuid: input.id,
      p_nombre: input.displayName,
      p_rol: input.role,
      p_sucursales_uuid: input.branchIds,
    });
    if (error) fail(error, "No se pudo crear el perfil del empleado");
  }

  async updateProfile(
    input: { id: string; displayName: string; role: StaffAccount["role"]; active: boolean; branchIds: string[] },
    actorId: string,
    changedFields: string[],
  ): Promise<void> {
    const { error } = await getSupabaseAdmin().schema("api").rpc("fn_actualizar_perfil_empleado", {
      p_actor_uuid: actorId,
      p_perfil_uuid: input.id,
      p_nombre: input.displayName,
      p_rol: input.role,
      p_activo: input.active,
      p_sucursales_uuid: input.branchIds,
      p_campos_cambiados: changedFields,
    });
    if (error) fail(error, "No se pudo actualizar el empleado");
  }

  async createRecoveryLink(email: string): Promise<string> {
    const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: appUrl("/api/auth/callback?next=/restablecer").toString() },
    });
    if (error || !data.properties?.action_link) fail(error, "No se pudo restablecer el acceso");
    return data.properties.action_link;
  }

  async recordAudit(
    type: string,
    entityId: string,
    metadata: Record<string, unknown>,
    actorId: string,
  ): Promise<void> {
    const { error } = await getSupabaseAdmin().schema("api").from("t_eventos_auditoria").insert({
      f_uuid_actor: actorId,
      f_tipo_evento: type,
      f_tipo_entidad: "profile",
      f_uuid_entidad: entityId,
      f_uuid_correlacion: randomUUID(),
      f_metadatos_seguros: metadata,
      ...tenantDatabaseFields(this.tenant),
    });
    if (error) fail(error, "No se pudo registrar la auditoría");
  }
}

export function createStaffAdministrationServicePort(tenant: TenantScope) {
  return new SupabaseStaffAdministrationPort(tenant);
}
