import type { StaffRole } from "@/shared/auth/permissions";
import {
  prepareStaffCreate,
  prepareStaffUpdate,
  type StaffAccount,
  type StaffBranch,
  type StaffCreateInput,
  type StaffUpdateInput,
} from "./staff-management";

export interface StaffAuditEvent {
  id: string;
  eventType: string;
  entityId: string | null;
  actorName: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface StaffAdministrationPort {
  listAccounts(): Promise<StaffAccount[]>;
  listBranches(): Promise<StaffBranch[]>;
  listAuditEvents(): Promise<StaffAuditEvent[]>;
  findAccount(id: string): Promise<StaffAccount | null>;
  createAuthUser(input: { email: string; displayName: string }): Promise<{ id: string }>;
  deleteAuthUser(id: string): Promise<void>;
  saveNewProfile(input: {
    id: string;
    displayName: string;
    role: StaffRole;
    branchIds: string[];
  }, actorId: string): Promise<void>;
  updateProfile(input: {
    id: string;
    displayName: string;
    role: StaffRole;
    active: boolean;
    branchIds: string[];
  }, actorId: string, changedFields: string[]): Promise<void>;
  createRecoveryLink(email: string): Promise<string>;
  recordAudit(
    type: string,
    entityId: string,
    metadata: Record<string, unknown>,
    actorId: string,
  ): Promise<void>;
}

export class StaffAdministrationService {
  constructor(private readonly port: StaffAdministrationPort) {}

  async list() {
    const [accounts, branches, auditEvents] = await Promise.all([
      this.port.listAccounts(),
      this.port.listBranches(),
      this.port.listAuditEvents(),
    ]);
    return { accounts, branches, auditEvents };
  }

  async create(actorId: string, input: StaffCreateInput) {
    const branches = await this.port.listBranches();
    const prepared = prepareStaffCreate(input, branches.map((branch) => branch.id));
    const authUser = await this.port.createAuthUser({
      email: prepared.email,
      displayName: prepared.displayName,
    });
    try {
      await this.port.saveNewProfile({ id: authUser.id, ...prepared }, actorId);
    } catch (error) {
      await this.port.deleteAuthUser(authUser.id);
      throw error;
    }
    return { id: authUser.id };
  }

  async update(actorId: string, accountId: string, input: StaffUpdateInput) {
    const [current, branches] = await Promise.all([
      this.port.findAccount(accountId),
      this.port.listBranches(),
    ]);
    if (!current) throw new Error("Empleado no encontrado");
    const prepared = prepareStaffUpdate(
      actorId,
      current,
      input,
      branches.map((branch) => branch.id),
    );
    if (prepared.changedFields.length === 0) return { changed: false };
    await this.port.updateProfile(
      { id: accountId, ...prepared },
      actorId,
      prepared.changedFields,
    );
    return { changed: true };
  }

  async resetAccess(actorId: string, accountId: string) {
    const account = await this.port.findAccount(accountId);
    if (!account) throw new Error("Empleado no encontrado");
    if (!account.active) throw new Error("Active la cuenta antes de restablecer el acceso");
    const recoveryLink = await this.port.createRecoveryLink(account.email);
    await this.port.recordAudit("staff.access_reset", accountId, {
      channel: "administrator_generated",
    }, actorId);
    return { recoveryLink };
  }
}
