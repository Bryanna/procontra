export interface TenantScope {
  companyId: number;
  branchId: number;
  appId: number;
}

interface TenantProfileRow {
  f_idempresa: unknown;
  f_idsucursal: unknown;
  f_app: unknown;
  f_activo: unknown;
}

export function buildTenantScope(row: TenantProfileRow | null): TenantScope | null {
  if (
    !row ||
    row.f_activo !== true ||
    !Number.isInteger(row.f_idempresa) ||
    !Number.isInteger(row.f_idsucursal) ||
    !Number.isInteger(row.f_app)
  ) {
    return null;
  }

  return {
    companyId: row.f_idempresa as number,
    branchId: row.f_idsucursal as number,
    appId: row.f_app as number,
  };
}

export async function resolveTenantScope(
  userId: string,
  loadProfile: (userId: string) => Promise<TenantProfileRow | null>,
): Promise<TenantScope> {
  const scope = buildTenantScope(await loadProfile(userId));
  if (!scope) {
    throw new Error("Tenant activo no disponible");
  }
  return scope;
}

export function scopeTenantQuery<T extends { eq(field: string, value: number): T }>(
  query: T,
  scope: TenantScope,
): T {
  return query.eq("f_idempresa", scope.companyId).eq("f_app", scope.appId);
}

export function tenantDatabaseFields(scope: TenantScope) {
  return {
    f_idempresa: scope.companyId,
    f_idsucursal: scope.branchId,
    f_app: scope.appId,
  };
}
