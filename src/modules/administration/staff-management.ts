import { isStaffRole, type StaffRole } from "@/shared/auth/permissions";

export interface StaffBranch {
  id: string;
  code: string;
  name: string;
}

export interface StaffAccount {
  id: string;
  displayName: string;
  email: string;
  role: StaffRole;
  active: boolean;
  branchIds: string[];
  branches: StaffBranch[];
  lastSignInAt: string | null;
  createdAt: string;
}

export interface StaffCreateInput {
  displayName: unknown;
  email: unknown;
  role: unknown;
  branchIds: unknown;
}

export interface StaffUpdateInput {
  displayName: unknown;
  role: unknown;
  active: unknown;
  branchIds: unknown;
}

const operationalRoles = new Set<StaffRole>([
  "coordinator", "pharmacist", "inventory", "attention", "physician",
]);

function normalizedName(value: unknown): string {
  if (typeof value !== "string" || value.trim().length < 2 || value.trim().length > 120) {
    throw new Error("Nombre de empleado inválido");
  }
  return value.trim().replace(/\s+/g, " ");
}

function normalizedEmail(value: unknown): string {
  if (typeof value !== "string") throw new Error("Correo electrónico inválido");
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new Error("Correo electrónico inválido");
  }
  return email;
}

function normalizedRole(value: unknown): StaffRole {
  if (!isStaffRole(value)) throw new Error("Rol no permitido");
  return value;
}

function normalizedBranches(value: unknown, allowedBranchIds: readonly string[], role: StaffRole): string[] {
  if (!Array.isArray(value) || value.some((branchId) => typeof branchId !== "string")) {
    throw new Error("Sucursales inválidas");
  }
  const branchIds = [...new Set(value as string[])];
  const allowed = new Set(allowedBranchIds);
  if (branchIds.some((branchId) => !allowed.has(branchId))) throw new Error("Sucursal no permitida");
  if (operationalRoles.has(role) && branchIds.length === 0) {
    throw new Error("Seleccione al menos una sucursal");
  }
  return branchIds;
}

export function prepareStaffCreate(input: StaffCreateInput, allowedBranchIds: readonly string[]) {
  const role = normalizedRole(input.role);
  return {
    displayName: normalizedName(input.displayName),
    email: normalizedEmail(input.email),
    role,
    branchIds: normalizedBranches(input.branchIds, allowedBranchIds, role),
  };
}

export function prepareStaffUpdate(
  actorId: string,
  current: StaffAccount,
  input: StaffUpdateInput,
  allowedBranchIds: readonly string[],
) {
  const displayName = normalizedName(input.displayName);
  const role = normalizedRole(input.role);
  if (typeof input.active !== "boolean") throw new Error("Estado de empleado inválido");
  if (actorId === current.id && !input.active) throw new Error("No puede desactivar su propia cuenta");
  const branchIds = normalizedBranches(input.branchIds, allowedBranchIds, role);
  const changedFields: string[] = [];
  if (displayName !== current.displayName) changedFields.push("displayName");
  if (role !== current.role) changedFields.push("role");
  if (input.active !== current.active) changedFields.push("active");
  if ([...branchIds].sort().join("|") !== [...current.branchIds].sort().join("|")) changedFields.push("branchIds");

  return { displayName, role, active: input.active, branchIds, changedFields };
}
