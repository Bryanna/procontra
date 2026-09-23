import { describe, expect, it } from "vitest";

import { StaffAdministrationService, type StaffAdministrationPort } from "./staff-administration-service";
import type { StaffAccount, StaffBranch } from "./staff-management";

function fixture() {
  const accounts: StaffAccount[] = [{
    id: "user-1",
    displayName: "Ana",
    email: "ana@example.com",
    role: "attention",
    active: true,
    branchIds: ["branch-70"],
    branches: [{ id: "branch-70", code: "70", name: "Esperanza" }],
    lastSignInAt: null,
    createdAt: "2026-08-27T00:00:00Z",
  }];
  const branches: StaffBranch[] = [
    { id: "branch-70", code: "70", name: "Esperanza" },
    { id: "branch-01", code: "01", name: "Amina" },
  ];
  const events: Array<{ type: string; entityId: string; metadata: Record<string, unknown> }> = [];
  const deleted: string[] = [];
  let failSave = false;
  const port: StaffAdministrationPort = {
    listAccounts: async () => accounts,
    listBranches: async () => branches,
    listAuditEvents: async () => [],
    createAuthUser: async () => ({ id: "new-user" }),
    deleteAuthUser: async (id) => { deleted.push(id); },
    saveNewProfile: async (input, actorId) => {
      if (failSave) throw new Error("db failed");
      events.push({ type: "staff.created", entityId: input.id, metadata: { role: input.role, branchIds: input.branchIds } });
      void actorId;
    },
    updateProfile: async (input, actorId, changedFields) => {
      events.push({ type: "staff.updated", entityId: input.id, metadata: { changedFields } });
      void actorId;
    },
    findAccount: async (id) => accounts.find((account) => account.id === id) ?? null,
    createRecoveryLink: async () => "https://app.example.com/reset#token=secret",
    recordAudit: async (type, entityId, metadata) => { events.push({ type, entityId, metadata }); },
  };
  return { accounts, branches, deleted, events, port, setFailSave: () => { failSave = true; } };
}

describe("StaffAdministrationService", () => {
  it("lists employee accounts and branches for the administration workspace", async () => {
    const data = fixture();
    const service = new StaffAdministrationService(data.port);
    await expect(service.list()).resolves.toEqual({ accounts: data.accounts, branches: data.branches, auditEvents: [] });
  });

  it("creates an auth user, profile, memberships and audit event", async () => {
    const data = fixture();
    const service = new StaffAdministrationService(data.port);
    const created = await service.create("admin-1", {
      displayName: " Ana Pérez ", email: " ANA@EXAMPLE.COM ", role: "inventory", branchIds: ["branch-70"],
    });

    expect(created.id).toBe("new-user");
    expect(data.events).toEqual([{
      type: "staff.created",
      entityId: "new-user",
      metadata: { role: "inventory", branchIds: ["branch-70"] },
    }]);
  });

  it("deletes the auth user when profile provisioning fails", async () => {
    const data = fixture();
    data.setFailSave();
    const service = new StaffAdministrationService(data.port);

    await expect(service.create("admin-1", {
      displayName: "Ana Pérez", email: "ana@example.com", role: "inventory", branchIds: ["branch-70"],
    })).rejects.toThrow("db failed");
    expect(data.deleted).toEqual(["new-user"]);
    expect(data.events).toEqual([]);
  });

  it("updates employee access and records only safe change names", async () => {
    const data = fixture();
    const service = new StaffAdministrationService(data.port);
    await service.update("admin-1", "user-1", {
      displayName: "Ana Pérez", role: "inventory", active: true, branchIds: ["branch-01"],
    });

    expect(data.events).toEqual([{
      type: "staff.updated",
      entityId: "user-1",
      metadata: { changedFields: ["displayName", "role", "branchIds"] },
    }]);
  });

  it("generates a recovery link and audits without storing its secret", async () => {
    const data = fixture();
    const service = new StaffAdministrationService(data.port);
    await expect(service.resetAccess("admin-1", "user-1")).resolves.toEqual({
      recoveryLink: "https://app.example.com/reset#token=secret",
    });
    expect(data.events).toEqual([{
      type: "staff.access_reset",
      entityId: "user-1",
      metadata: { channel: "administrator_generated" },
    }]);
  });
});
