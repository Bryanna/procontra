import { can, canAccessBranch, isStaffRole, type StaffIdentity } from "./permissions";

describe("staff permissions", () => {
  it("grants administrators every operational permission and branch", () => {
    const admin: StaffIdentity = {
      userId: "user-1",
      role: "administrator",
      branchIds: [],
    };

    expect(can(admin.role, "administration:manage")).toBe(true);
    expect(can(admin.role, "dispensations:write")).toBe(true);
    expect(canAccessBranch(admin, "branch-any")).toBe(true);
  });

  it("limits inventory staff to inventory and assigned branches", () => {
    const inventory: StaffIdentity = {
      userId: "user-2",
      role: "inventory",
      branchIds: ["branch-70"],
    };

    expect(can(inventory.role, "inventory:read")).toBe(true);
    expect(can(inventory.role, "inventory:write")).toBe(true);
    expect(can(inventory.role, "patients:write")).toBe(false);
    expect(canAccessBranch(inventory, "branch-70")).toBe(true);
    expect(canAccessBranch(inventory, "branch-01")).toBe(false);
  });

  it("keeps management reporting read-only", () => {
    expect(can("direction", "reports:read")).toBe(true);
    expect(can("direction", "inventory:read")).toBe(true);
    expect(can("direction", "inventory:write")).toBe(false);
    expect(can("direction", "messaging:send")).toBe(false);
  });

  it("limits physicians to patient and continuity consultation", () => {
    expect(isStaffRole("physician")).toBe(true);
    expect(can("physician", "patients:read")).toBe(true);
    expect(can("physician", "continuity:read")).toBe(true);
    expect(can("physician", "patients:write")).toBe(false);
    expect(can("physician", "continuity:write")).toBe(false);
    expect(can("physician", "documents:read")).toBe(false);
    expect(can("physician", "administration:manage")).toBe(false);
  });

  it("rejects unknown database roles", () => {
    expect(isStaffRole("administrator")).toBe(true);
    expect(isStaffRole("root")).toBe(false);
    expect(isStaffRole(null)).toBe(false);
  });
});
