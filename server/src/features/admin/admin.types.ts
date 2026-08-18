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

export const ADMIN_PASSKEY_CHALLENGE_PURPOSE_VALUES = [
  "registration",
  "login",
  "reauthentication",
] as const;

export type AdminPasskeyChallengePurpose =
  (typeof ADMIN_PASSKEY_CHALLENGE_PURPOSE_VALUES)[number];

export const ADMIN_PASSKEY_ATTACHMENT_VALUES = [
  "platform",
  "cross-platform",
] as const;

export type AdminPasskeyAttachment =
  (typeof ADMIN_PASSKEY_ATTACHMENT_VALUES)[number];

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
  "passkey-reset",
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
  "admin-passkey-registration-started",
  "admin-passkey-registered",
  "admin-passkey-authentication-succeeded",
  "admin-passkey-authentication-failed",
  "admin-passkey-revoked",
  "admin-passkey-used-for-reauthentication",
  "admin-passkey-emergency-reset",
  "admin-user-suspended",
  "admin-user-reactivated",
  "admin-user-session-revoked",
  "admin-user-sessions-revoked",
  "admin-content-created",
  "admin-content-updated",
  "admin-content-status-updated",
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

export interface AdminRecoveryFactorDocument {
  _id: ObjectId;
  schemaVersion: number;
  userId: ObjectId;
  recoveryCodeHashes: string[];
  createdAt: Date;
  updatedAt: Date;
}


export interface AdminGovernanceStateDocument {
  _id: "administrator-membership";
  schemaVersion: number;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSecurityStateDocument {
  _id: ObjectId;
  schemaVersion: number;
  userId: ObjectId;
  factorRevision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPasskeyCredentialDocument {
  _id: ObjectId;
  schemaVersion: number;
  userId: ObjectId;
  credentialId: string;
  publicKeyBase64: string;
  counter: number;
  transports: string[];
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  label: string;
  attachment: AdminPasskeyAttachment;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export interface AdminPasskeyChallengeDocument {
  _id: ObjectId;
  schemaVersion: number;
  publicId: string;
  purpose: AdminPasskeyChallengePurpose;
  userId: ObjectId;
  sessionId: ObjectId | null;
  parentMfaChallengeId: ObjectId | null;
  challenge: string;
  label: string | null;
  attachment: AdminPasskeyAttachment | null;
  attemptCount: number;
  maximumAttempts: number;
  ipHash: string | null;
  userAgentSummary: string | null;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
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
  deleteAt: Date;
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
  passkeysConfigured: boolean;
  passkeyCount: number;
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
