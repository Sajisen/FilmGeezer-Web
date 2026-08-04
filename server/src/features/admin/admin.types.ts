import type { ObjectId } from "mongodb";

export const ADMIN_SESSION_ACCESS_LEVEL_VALUES = [
  "full",
  "mfa-enrollment",
] as const;

export type AdminSessionAccessLevel =
  (typeof ADMIN_SESSION_ACCESS_LEVEL_VALUES)[number];

export const ADMIN_MFA_CHALLENGE_PURPOSE_VALUES = [
  "login",
  "setup",
] as const;

export type AdminMfaChallengePurpose =
  (typeof ADMIN_MFA_CHALLENGE_PURPOSE_VALUES)[number];

export const ADMIN_SESSION_REVOCATION_REASON_VALUES = [
  "logout",
  "session-limit",
  "absolute-expiry",
  "idle-timeout",
  "role-removed",
  "account-unavailable",
  "security-event",
  "administrator-revoked",
  "mfa-reset",
  "mfa-disabled",
] as const;

export type AdminSessionRevocationReason =
  (typeof ADMIN_SESSION_REVOCATION_REASON_VALUES)[number];

export const ADMIN_AUDIT_OUTCOME_VALUES = ["success", "failure"] as const;
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
  "admin-mfa-challenge-created",
  "admin-mfa-challenge-failed",
  "admin-mfa-login-succeeded",
  "admin-mfa-setup-started",
  "admin-mfa-enabled",
  "admin-mfa-disabled",
  "admin-mfa-recovery-used",
  "admin-mfa-recovery-regenerated",
  "admin-reauthentication-succeeded",
  "admin-reauthentication-failed",
  "admin-mfa-reset",
] as const;

export type AdminAuditEvent =
  (typeof ADMIN_AUDIT_EVENT_VALUES)[number];

export type AdminAuditDetailValue = string | number | boolean | null;

export interface AdminSessionDocument {
  _id: ObjectId;
  schemaVersion: number;
  userId: ObjectId;
  tokenHash: string;
  csrfSecretHash: string;
  accessLevel: AdminSessionAccessLevel;
  userAgentSummary: string | null;
  ipHash: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  recentAuthenticationAt: Date;
  mfaVerifiedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  revocationReason: AdminSessionRevocationReason | null;
}

export interface AdminEncryptedSecret {
  ciphertext: string;
  initializationVector: string;
  authenticationTag: string;
  keyVersion: number;
}

export interface AdminMfaFactorDocument {
  _id: ObjectId;
  schemaVersion: number;
  userId: ObjectId;
  algorithm: "SHA1";
  digits: 6;
  periodSeconds: 30;
  encryptedSecret: AdminEncryptedSecret;
  recoveryCodeHashes: string[];
  lastAcceptedTimeStep: number | null;
  enabledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminMfaChallengeDocument {
  _id: ObjectId;
  schemaVersion: number;
  publicId: string;
  purpose: AdminMfaChallengePurpose;
  userId: ObjectId;
  sessionId: ObjectId | null;
  tokenHash: string | null;
  encryptedSecret: AdminEncryptedSecret | null;
  attemptCount: number;
  maximumAttempts: number;
  ipHash: string | null;
  userAgentSummary: string | null;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
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
  accessLevel: AdminSessionAccessLevel;
  mfaEnabled: boolean;
  mfaRequiredByPolicy: boolean;
  recoveryCodesRemaining: number;
  mfaEnabledAt: Date | null;
  createdAt: Date;
  lastSeenAt: Date;
  recentAuthenticationAt: Date;
  mfaVerifiedAt: Date | null;
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
