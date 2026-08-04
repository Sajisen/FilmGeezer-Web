export const ADMIN_COLLECTION_NAMES = {
  sessions: "admin_sessions",
  auditEvents: "admin_audit_events",
  mfaFactors: "admin_mfa_factors",
  mfaChallenges: "admin_mfa_challenges",
  recoveryFactors: "admin_recovery_factors",
  passkeyCredentials: "admin_passkey_credentials",
  passkeyChallenges: "admin_passkey_challenges",
  securityStates: "admin_security_states",
} as const;

export const ADMIN_SCHEMA_VERSION = 4;

export const ADMIN_SESSION_POLICY = {
  developmentCookieName: "filmgeezer_admin_session",
  productionCookieName: "__Host-filmgeezer_admin_session",
  csrfHeaderName: "x-admin-csrf-token",
  tokenBytes: 32,
  tokenCharacterLength: 43,
  absoluteLifetimeMilliseconds: 8 * 60 * 60 * 1_000,
  idleTimeoutMilliseconds: 30 * 60 * 1_000,
  activityTouchIntervalMilliseconds: 2 * 60 * 1_000,
  recentAuthenticationLifetimeMilliseconds: 10 * 60 * 1_000,
  maximumActiveSessionsPerUser: 2,
  userAgentMaximumLength: 256,
} as const;

export const ADMIN_MFA_POLICY = {
  issuer: "FilmGeezer",
  algorithm: "SHA1",
  digits: 6,
  periodSeconds: 30,
  verificationWindowSteps: 1,
  secretBytes: 20,
  challengeTokenBytes: 32,
  challengeLifetimeMilliseconds: 10 * 60 * 1_000,
  setupLifetimeMilliseconds: 10 * 60 * 1_000,
  maximumVerificationAttempts: 5,
  recoveryCodeCount: 10,
  recoveryCodeCharacters: 12,
  recoveryCodePrefix: "FG",
  recoveryAlphabet: "23456789ABCDEFGHJKLMNPQRSTUVWXYZ",
  encryptionKeyVersion: 1,
} as const;

export const ADMIN_PASSKEY_POLICY = {
  challengeLifetimeMilliseconds: 5 * 60 * 1_000,
  maximumVerificationAttempts: 5,
  labelMaximumLength: 64,
  maximumCredentialsPerAdministrator: 10,
  supportedAlgorithmIds: [-7, -257] as const,
} as const;

export const ADMIN_HTTP_POLICY = {
  login: {
    requestBodyLimit: "4kb",
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 5,
  },
  mfaChallenge: {
    requestBodyLimit: "4kb",
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 10,
  },
  mfaManagement: {
    requestBodyLimit: "16kb",
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 20,
  },
  passkey: {
    requestBodyLimit: "64kb",
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 30,
  },
  session: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 120,
  },
  logout: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 20,
  },
  overview: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 120,
  },
  supportRead: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 240,
  },
  supportWrite: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 80,
    replyBodyLimit: "8kb",
    statusBodyLimit: "4kb",
  },
} as const;

export const ADMIN_EMAIL_MAXIMUM_LENGTH = 254;
export const ADMIN_PASSWORD_MAXIMUM_LENGTH = 128;
