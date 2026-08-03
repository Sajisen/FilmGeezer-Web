import type { ObjectId } from "mongodb";

export const ADMIN_SESSION_REVOCATION_REASON_VALUES = [
  "logout",
  "session-limit",
  "absolute-expiry",
  "idle-timeout",
  "role-removed",
  "account-unavailable",
  "security-event",
  "administrator-revoked",
] as const;

export type AdminSessionRevocationReason =
  (typeof ADMIN_SESSION_REVOCATION_REASON_VALUES)[number];

export const ADMIN_AUDIT_OUTCOME_VALUES = [
  "success",
  "failure",
] as const;

export type AdminAuditOutcome =
  (typeof ADMIN_AUDIT_OUTCOME_VALUES)[number];

export const ADMIN_AUDIT_EVENT_VALUES = [
  "admin-login-succeeded",
  "admin-login-failed",
  "admin-logout",
  "admin-session-revoked",
  "admin-role-granted",
  "admin-role-revoked",
  "admin-support-replied",
  "admin-support-status-updated",
] as const;

export type AdminAuditEvent =
  (typeof ADMIN_AUDIT_EVENT_VALUES)[number];

export type AdminAuditDetailValue =
  | string
  | number
  | boolean
  | null;

export interface AdminSessionDocument {
  _id: ObjectId;
  schemaVersion: number;
  userId: ObjectId;
  tokenHash: string;
  csrfSecretHash: string;
  userAgentSummary: string | null;
  ipHash: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  revocationReason: AdminSessionRevocationReason | null;
}

export interface AdminAuditEventDocument {
  _id: ObjectId;
  schemaVersion: number;
  actorUserId: ObjectId | null;
  targetUserId: ObjectId | null;
  eventType: AdminAuditEvent;
  outcome: AdminAuditOutcome;
  ipHash: string | null;
  userAgentSummary: string | null;
  details: Record<string, AdminAuditDetailValue>;
  createdAt: Date;
}

export interface AdminSessionContext {
  sessionId: ObjectId;
  userId: ObjectId;
  email: string;
  displayName: string;
  profileImagePath: string | null;
  roles: Array<"user" | "admin">;
  csrfToken: string;
  csrfSecretHash: string;
  createdAt: Date;
  lastSeenAt: Date;
  idleExpiresAt: Date;
  expiresAt: Date;
}

export interface AdminOverviewResult {
  generatedAt: Date;
  users: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
  support: {
    new: number;
    inReview: number;
    resolved: number;
    spam: number;
    open: number;
  };
  administration: {
    activeAdministrators: number;
    activeAdminSessions: number;
  };
}
