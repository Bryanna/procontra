import { describe, expect, it } from "vitest";
import { mapStaffAccounts } from "./staff-account-mapper";

describe("mapStaffAccounts", () => {
  it("joins auth identity, profile and branch memberships without exposing auth metadata", () => {
    expect(mapStaffAccounts([
      { id: "user-1", email: "ANA@EXAMPLE.COM", created_at: "2026-08-01T00:00:00Z", last_sign_in_at: "2026-08-27T12:00:00Z" },
    ], [{
      f_uuid: "user-1",
      f_nombre_mostrar: "Ana",
      f_rol: "inventory",
      f_activo: true,
      f_creado_en: "2026-08-01T00:00:00Z",
      t_membresias_sucursales: [{ t_sucursales: { f_uuid: "branch-70", f_codigo: "70", f_nombre: "Esperanza" } }],
    }])).toEqual([{
      id: "user-1",
      displayName: "Ana",
      email: "ana@example.com",
      role: "inventory",
      active: true,
      branchIds: ["branch-70"],
      branches: [{ id: "branch-70", code: "70", name: "Esperanza" }],
      lastSignInAt: "2026-08-27T12:00:00Z",
      createdAt: "2026-08-01T00:00:00Z",
    }]);
  });

  it("skips orphaned auth users and rejects invalid profile roles", () => {
    expect(mapStaffAccounts([{ id: "orphan", email: "orphan@example.com" }], [])).toEqual([]);
    expect(() => mapStaffAccounts([{ id: "user-1", email: "a@example.com" }], [{
      f_uuid: "user-1", f_nombre_mostrar: "A", f_rol: "owner", f_activo: true, f_creado_en: "2026-08-01T00:00:00Z", t_membresias_sucursales: [],
    }])).toThrow("Rol de empleado desconocido");
  });
});
