export type StaffRole =
  | "administrator"
  | "coordinator"
  | "pharmacist"
  | "inventory"
  | "attention"
  | "physician"
  | "direction";

const staffRoles: readonly StaffRole[] = [
  "administrator", "coordinator", "pharmacist", "inventory", "attention", "physician", "direction",
];

export function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && staffRoles.includes(value as StaffRole);
}

export type Permission =
  | "patients:read"
  | "patients:write"
  | "documents:read"
  | "documents:write"
  | "dispensations:read"
  | "dispensations:write"
  | "inventory:read"
  | "inventory:write"
  | "continuity:read"
  | "continuity:write"
  | "reservations:read"
  | "reservations:write"
  | "messaging:read"
  | "messaging:send"
  | "reports:read"
  | "administration:manage";

export interface StaffIdentity {
  userId: string;
  role: StaffRole;
  branchIds: string[];
}

export interface StaffView {
  displayName: string;
  role: StaffRole;
  branches: Array<{ id: string; code: string; name: string }>;
}

const permissions: Record<StaffRole, ReadonlySet<Permission>> = {
  administrator: new Set<Permission>([
    "patients:read", "patients:write", "documents:read", "documents:write",
    "dispensations:read", "dispensations:write", "inventory:read", "inventory:write",
    "continuity:read", "continuity:write", "reservations:read", "reservations:write",
    "messaging:read", "messaging:send", "reports:read", "administration:manage",
  ]),
  coordinator: new Set<Permission>([
    "patients:read", "patients:write", "documents:read", "dispensations:read",
    "inventory:read", "continuity:read", "continuity:write", "reservations:read",
    "reservations:write", "messaging:read", "messaging:send", "reports:read",
  ]),
  pharmacist: new Set<Permission>([
    "patients:read", "documents:read", "documents:write", "dispensations:read",
    "dispensations:write", "inventory:read", "continuity:read", "continuity:write",
    "reservations:read", "messaging:read", "messaging:send",
  ]),
  inventory: new Set<Permission>([
    "documents:read", "dispensations:read", "inventory:read", "inventory:write",
    "reservations:read", "reservations:write", "reports:read",
  ]),
  attention: new Set<Permission>([
    "patients:read", "patients:write", "documents:read", "inventory:read",
    "continuity:read", "reservations:read", "reservations:write", "messaging:read",
    "messaging:send",
  ]),
  physician: new Set<Permission>([
    "patients:read", "continuity:read",
  ]),
  direction: new Set<Permission>([
    "patients:read", "documents:read", "dispensations:read", "inventory:read",
    "continuity:read", "reservations:read", "messaging:read", "reports:read",
  ]),
};

export function can(role: StaffRole, permission: Permission): boolean {
  return permissions[role].has(permission);
}

export function canAccessBranch(identity: StaffIdentity, branchId: string): boolean {
  return identity.role === "administrator" || identity.branchIds.includes(branchId);
}
