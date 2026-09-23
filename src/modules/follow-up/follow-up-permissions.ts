import { can, type StaffRole } from "@/shared/auth/permissions";

export function canRegisterFollowUpPurchase(role: StaffRole): boolean {
  return can(role, "continuity:write") && can(role, "dispensations:write");
}
