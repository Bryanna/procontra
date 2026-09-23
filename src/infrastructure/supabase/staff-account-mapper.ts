import type { StaffAccount, StaffBranch } from "@/modules/administration/staff-management";
import { isStaffRole } from "@/shared/auth/permissions";

interface AuthUserRow {
  id: string;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
}

interface ProfileRow {
  f_uuid: string;
  f_nombre_mostrar: string;
  f_rol: unknown;
  f_activo: boolean;
  f_creado_en: string;
  t_membresias_sucursales?: Array<{ t_sucursales: TenantBranch | TenantBranch[] | null }>;
}

interface TenantBranch { f_uuid: string; f_codigo: string; f_nombre: string }

export function mapStaffAccounts(authUsers: AuthUserRow[], profiles: ProfileRow[]): StaffAccount[] {
  const authById = new Map(authUsers.map((user) => [user.id, user]));
  return profiles.map((profile) => {
    const authUser = authById.get(profile.f_uuid);
    if (!authUser) return null;
    if (!isStaffRole(profile.f_rol)) throw new Error("Rol de empleado desconocido");
    const branches: StaffBranch[] = (profile.t_membresias_sucursales ?? []).flatMap((membership) => {
      if (!membership.t_sucursales) return [];
      const values = Array.isArray(membership.t_sucursales) ? membership.t_sucursales : [membership.t_sucursales];
      return values.map((branch) => ({ id: branch.f_uuid, code: branch.f_codigo, name: branch.f_nombre }));
    });
    return {
      id: profile.f_uuid,
      displayName: profile.f_nombre_mostrar,
      email: (authUser.email ?? "").toLowerCase(),
      role: profile.f_rol,
      active: profile.f_activo,
      branchIds: branches.map((branch) => branch.id),
      branches,
      lastSignInAt: authUser.last_sign_in_at ?? null,
      createdAt: profile.f_creado_en || authUser.created_at || "",
    } satisfies StaffAccount;
  }).filter((account): account is StaffAccount => account !== null);
}
