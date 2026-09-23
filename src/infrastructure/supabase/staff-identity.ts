import { isStaffRole, type StaffView } from "@/shared/auth/permissions";

interface ProfileRow {
  f_nombre_mostrar: unknown;
  f_rol: unknown;
  f_activo: unknown;
}

interface MembershipRow {
  f_uuid_sucursal: unknown;
  t_sucursales: unknown;
}

function branchValue(value: unknown): { code: string; name: string } | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") return null;
  const branch = candidate as Record<string, unknown>;
  if (typeof branch.f_codigo !== "string" || typeof branch.f_nombre !== "string") return null;
  return { code: branch.f_codigo, name: branch.f_nombre };
}

export function buildStaffView(
  profile: ProfileRow | null,
  memberships: MembershipRow[],
): StaffView | null {
  if (
    !profile
    || profile.f_activo !== true
    || typeof profile.f_nombre_mostrar !== "string"
    || !profile.f_nombre_mostrar.trim()
    || !isStaffRole(profile.f_rol)
  ) {
    return null;
  }

  const branches = memberships.flatMap((membership) => {
    if (typeof membership.f_uuid_sucursal !== "string") return [];
    const branch = branchValue(membership.t_sucursales);
    return branch ? [{ id: membership.f_uuid_sucursal, ...branch }] : [];
  }).sort((left, right) => left.code.localeCompare(right.code));

  return {
    displayName: profile.f_nombre_mostrar.trim(),
    role: profile.f_rol,
    branches,
  };
}
