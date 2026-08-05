import type { ObjectId } from "mongodb";

import type { AuthRole, UserStatus } from "../auth/auth.types.js";
import type {
  AdminAuditDetailValue,
  AdminAuditEvent,
  AdminAuditOutcome,
} from "./admin.types.js";

export const ADMIN_AUDIT_CATEGORY_VALUES = [
  "all",
  "authentication",
  "security",
  "sessions",
  "roles",
  "support",
  "users",
  "content",
] as const;

export type AdminAuditCategoryFilter =
  (typeof ADMIN_AUDIT_CATEGORY_VALUES)[number];

export type AdminAuditCategory = Exclude<AdminAuditCategoryFilter, "all">;

export const ADMIN_AUDIT_OUTCOME_FILTER_VALUES = [
  "all",
  "success",
  "failure",
] as const;

export type AdminAuditOutcomeFilter =
  (typeof ADMIN_AUDIT_OUTCOME_FILTER_VALUES)[number];

export interface AdminAuditListQuery {
  page: number;
  pageSize: number;
  category: AdminAuditCategoryFilter;
  event: "all" | AdminAuditEvent;
  outcome: AdminAuditOutcomeFilter;
  actor: string;
  target: string;
  from: Date | null;
  to: Date | null;
}

export type AdminAuditIdentityFilter =
  | { kind: "any" }
  | { kind: "system" }
  | { kind: "users"; userIds: ObjectId[] }
  | { kind: "none" };

export interface AdminAuditIdentitySummary {
  kind: "user" | "system" | "unknown-user";
  userId: string | null;
  email: string | null;
  displayName: string;
  profileImagePath: string | null;
  roles: AuthRole[];
  status: UserStatus | null;
}

export interface AdminAuditEntry {
  auditEventId: string;
  eventType: AdminAuditEvent;
  category: AdminAuditCategory;
  outcome: AdminAuditOutcome;
  actor: AdminAuditIdentitySummary;
  target: AdminAuditIdentitySummary | null;
  details: Record<string, AdminAuditDetailValue>;
  userAgentSummary: string | null;
  createdAt: Date;
}

export interface AdminAuditListResult {
  items: AdminAuditEntry[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
