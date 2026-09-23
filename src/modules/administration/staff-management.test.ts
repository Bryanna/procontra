import { describe, expect, it } from "vitest";

import {
  prepareStaffCreate,
  prepareStaffUpdate,
  type StaffAccount,
} from "./staff-management";

const branches = ["branch-70", "branch-01"];

describe("staff management rules", () => {
  it("normalizes a new employee and requires a branch for operational roles", () => {
    expect(prepareStaffCreate({
      displayName: "  Ana Pérez  ",
      email: " ANA@EXAMPLE.COM ",
      role: "inventory",
      branchIds: ["branch-70", "branch-70"],
    }, branches)).toEqual({
      displayName: "Ana Pérez",
      email: "ana@example.com",
      role: "inventory",
      branchIds: ["branch-70"],
    });

    expect(() => prepareStaffCreate({
      displayName: "Ana Pérez",
      email: "ana@example.com",
      role: "inventory",
      branchIds: [],
    }, branches)).toThrow("Seleccione al menos una sucursal");
  });

  it("rejects unknown branches and invalid roles", () => {
    expect(() => prepareStaffCreate({
      displayName: "Ana Pérez",
      email: "ana@example.com",
      role: "owner" as "administrator",
      branchIds: ["branch-70"],
    }, branches)).toThrow("Rol no permitido");

    expect(() => prepareStaffCreate({
      displayName: "Ana Pérez",
      email: "ana@example.com",
      role: "attention",
      branchIds: ["missing"],
    }, branches)).toThrow("Sucursal no permitida");
  });

  it("prevents an administrator from deactivating their own account", () => {
    const account: StaffAccount = {
      id: "admin-1",
      displayName: "Administrador",
      email: "admin@example.com",
      role: "administrator",
      active: true,
      branchIds: [],
      branches: [],
      lastSignInAt: null,
      createdAt: "2026-08-27T00:00:00Z",
    };

    expect(() => prepareStaffUpdate("admin-1", account, {
      displayName: account.displayName,
      role: account.role,
      active: false,
      branchIds: [],
    }, branches)).toThrow("No puede desactivar su propia cuenta");
  });

  it("returns only changed fields for an update and deduplicates branches", () => {
    const account: StaffAccount = {
      id: "user-1",
      displayName: "Ana",
      email: "ana@example.com",
      role: "attention",
      active: true,
      branchIds: ["branch-70"],
      branches: [{ id: "branch-70", code: "70", name: "Esperanza" }],
      lastSignInAt: null,
      createdAt: "2026-08-27T00:00:00Z",
    };

    expect(prepareStaffUpdate("admin-1", account, {
      displayName: "Ana Pérez",
      role: "inventory",
      active: true,
      branchIds: ["branch-01", "branch-01"],
    }, branches)).toEqual({
      displayName: "Ana Pérez",
      role: "inventory",
      active: true,
      branchIds: ["branch-01"],
      changedFields: ["displayName", "role", "branchIds"],
    });
  });
});
