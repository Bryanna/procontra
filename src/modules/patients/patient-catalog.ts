import type { PatientContactChannel, PatientFollowUpStatus } from "./patient-registration";

export type PatientFilter = "today" | "all" | "active" | "inactive" | "with_consent" | "without_consent";

export interface PatientListItem {
  id: string;
  code: string;
  name: string;
  phone: string;
  governmentIdMask: string | null;
  insuranceCardMask: string | null;
  birthDate: string | null;
  phoneVerified: boolean;
  insurer: string | null;
  followUpStatus: PatientFollowUpStatus;
  preferredContactChannel: PatientContactChannel;
  branch: string | null;
  branchCode: string | null;
  active: boolean;
  consentStatus: string | null;
  joinedAt: string;
}

export interface PatientSearchResult {
  items: PatientListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PatientSummary {
  totalPatients: number;
  activePatients: number;
  inactivePatients: number;
  currentConsents: number;
  withoutCurrentConsent: number;
  activeContinuity: number;
  pendingAlerts: number;
  newThisMonth: number;
  patientsWithBranch: number;
}
