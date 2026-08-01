import type { ObjectId } from "mongodb";

export const AUTH_PROVIDER_VALUES = [
  "local",
  "clerk",
] as const;

export type AuthProvider =
  (typeof AUTH_PROVIDER_VALUES)[number];

export const AUTH_ROLE_VALUES = [
  "user",
  "admin",
] as const;

export type AuthRole =
  (typeof AUTH_ROLE_VALUES)[number];

export const USER_STATUS_VALUES = [
  "pending",
  "active",
  "suspended",
  "deactivated",
  "deleted",
] as const;

export type UserStatus =
  (typeof USER_STATUS_VALUES)[number];

export const AUTH_CHALLENGE_PURPOSE_VALUES = [
  "verify-email",
  "reset-password",
  "change-email",
] as const;

export type AuthChallengePurpose =
  (typeof AUTH_CHALLENGE_PURPOSE_VALUES)[number];

export const AUTH_SESSION_REVOCATION_REASON_VALUES = [
  "logout",
  "logout-all",
  "password-changed",
  "email-changed",
  "account-suspended",
  "account-deactivated",
  "security-event",
  "provider-migration",
  "session-limit",
  "absolute-expiry",
  "idle-timeout",
  "user-revoked",
] as const;

export type AuthSessionRevocationReason =
  (typeof AUTH_SESSION_REVOCATION_REASON_VALUES)[number];

export const AUTH_AUDIT_OUTCOME_VALUES = [
  "success",
  "failure",
] as const;

export type AuthAuditOutcome =
  (typeof AUTH_AUDIT_OUTCOME_VALUES)[number];

export const AUTH_AUDIT_EVENT_VALUES = [
  "registration-started",
  "registration-completed",
  "verification-sent",
  "verification-succeeded",
  "verification-failed",
  "login-succeeded",
  "login-failed",
  "logout",
  "logout-all",
  "password-reset-requested",
  "password-reset-failed",
  "password-reset-completed",
  "password-changed",
  "profile-updated",
  "reauthentication-succeeded",
  "reauthentication-failed",
  "session-revoked",
  "email-change-requested",
  "email-change-verification-sent",
  "email-change-verification-failed",
  "email-changed",
  "email-change-cancelled",
  "email-change-old-address-notified",
  "account-suspended",
  "account-deactivated",
  "account-deactivation-notice-sent",
  "account-reactivated",
] as const;

export type AuthAuditEvent =
  (typeof AUTH_AUDIT_EVENT_VALUES)[number];

export interface AuthenticatedUser {
  userId: string;
  provider: AuthProvider;
  providerSubject: string;
  email: string;
  displayName: string;
  roles: AuthRole[];
}

export interface FilmGeezerUserDocument {
  _id: ObjectId;
  schemaVersion: number;

  emailNormalized: string;
  emailDisplay: string;
  displayName: string;

  status: UserStatus;
  roles: AuthRole[];

  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  suspendedAt: Date | null;
  deactivatedAt: Date | null;
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface AuthIdentityDocument {
  _id: ObjectId;
  schemaVersion: number;

  userId: ObjectId;
  provider: AuthProvider;
  providerSubject: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface AuthCredentialDocument {
  _id: ObjectId;
  schemaVersion: number;

  userId: ObjectId;

  passwordAlgorithm: "argon2id";
  passwordHash: string;
  passwordChangedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSessionDocument {
  _id: ObjectId;
  schemaVersion: number;

  userId: ObjectId;
  authProvider: AuthProvider;

  tokenHash: string;
  csrfSecretHash: string;

  userAgentSummary: string | null;
  ipHash: string | null;

  createdAt: Date;
  lastSeenAt: Date;
  recentAuthenticationAt: Date | null;
  expiresAt: Date;

  revokedAt: Date | null;
  revocationReason:
    | AuthSessionRevocationReason
    | null;
}

export interface AuthEmailChangeChallengeContext {
  sourceEmailNormalized: string;
  targetEmailNormalized: string;
  targetEmailDisplay: string;
}

export interface AuthChallengeDocument {
  _id: ObjectId;
  schemaVersion: number;

  publicId: string;

  userId: ObjectId;
  purpose: AuthChallengePurpose;

  /*
   * Purpose-specific context. Existing challenge documents may not have
   * this field, so consumers must treat it as optional.
   */
  emailChange?:
    | AuthEmailChangeChallengeContext
    | null;

  secretHash: string;

  attemptCount: number;
  maximumAttempts: number;

  sendCount: number;

  createdAt: Date;
  lastSentAt: Date | null;
  expiresAt: Date;
  deleteAt: Date;

  consumedAt: Date | null;
  invalidatedAt: Date | null;
}

export type AuthAuditDetailValue =
  | string
  | number
  | boolean
  | null;

export interface AuthAuditEventDocument {
  _id: ObjectId;
  schemaVersion: number;

  userId: ObjectId | null;

  eventType: AuthAuditEvent;
  outcome: AuthAuditOutcome;

  ipHash: string | null;
  userAgentSummary: string | null;

  details: Record<
    string,
    AuthAuditDetailValue
  >;

  createdAt: Date;
}
