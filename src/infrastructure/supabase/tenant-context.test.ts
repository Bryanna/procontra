import { describe, expect, it } from "vitest";
import { buildTenantScope, resolveTenantScope, scopeTenantQuery, tenantDatabaseFields } from "./tenant-context";

describe("tenant context", () => {
  it("maps an active profile to the mandatory tenant key", () => {
    expect(buildTenantScope({ f_idempresa: 4, f_idsucursal: 2, f_app: 0, f_activo: true })).toEqual({ companyId: 4, branchId: 2, appId: 0 });
  });

  it("rejects inactive or malformed tenant profiles", () => {
    expect(buildTenantScope({ f_idempresa: 4, f_idsucursal: 1, f_app: 0, f_activo: false })).toBeNull();
    expect(buildTenantScope({ f_idempresa: "4", f_idsucursal: 1, f_app: 0, f_activo: true })).toBeNull();
  });

  it("loads the tenant scope for an authenticated user", async () => {
    const scope = await resolveTenantScope("user-1", async (userId) => {
      expect(userId).toBe("user-1");
      return { f_idempresa: 9, f_idsucursal: 3, f_app: 2, f_activo: true };
    });

    expect(scope).toEqual({ companyId: 9, branchId: 3, appId: 2 });
  });

  it("fails closed when the user has no active tenant", async () => {
    await expect(resolveTenantScope("user-2", async () => null)).rejects.toThrow("Tenant activo no disponible");
  });

  it("applies company and app scope to privileged queries", () => {
    const filters: Array<[string, number]> = [];
    const query = { eq(field: string, value: number) { filters.push([field, value]); return this; } };
    expect(scopeTenantQuery(query, { companyId: 4, branchId: 2, appId: 0 })).toBe(query);
    expect(filters).toEqual([["f_idempresa", 4], ["f_app", 0]]);
  });

  it("creates explicit tenant fields for privileged writes", () => {
    expect(tenantDatabaseFields({ companyId: 4, branchId: 2, appId: 0 })).toEqual({
      f_idempresa: 4,
      f_idsucursal: 2,
      f_app: 0,
    });
  });
});
