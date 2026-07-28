export const AUTH_COLLECTION_NAMES = {
  users: "users",
  identities: "auth_identities",
  credentials: "auth_credentials",
  sessions: "auth_sessions",
  challenges: "auth_challenges",
  auditEvents: "auth_audit_events",
} as const;

export const AUTH_SCHEMA_VERSION = 1;

export const AUTH_INPUT_LIMITS = {
  emailMaximumLength: 254,

  displayNameMinimumLength: 2,
  displayNameMaximumLength: 50,

  passwordMinimumLength: 8,
  passwordMaximumLength: 128,
} as const;

export const AUTH_PASSWORD_QUALITY_POLICY = {
  minimumAcceptedScore: 2,
} as const;

export const AUTH_REGISTRATION_POLICY = {
  requestBodyLimit: "8kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 10,
} as const;

export const AUTH_EMAIL_VERIFICATION_HTTP_POLICY = {
  requestBodyLimit: "4kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 20,
} as const;

export const AUTH_EMAIL_VERIFICATION_RESEND_HTTP_POLICY = {
  requestBodyLimit: "4kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 10,
} as const;

export const AUTH_LOGIN_HTTP_POLICY = {
  /*
   * A login body contains only an email address and password.
   */
  requestBodyLimit: "4kb",

  /*
   * This is an initial per-IP defence against password guessing and
   * credential stuffing. The application also records failed attempts.
   */
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 10,
} as const;

export const AUTH_EMAIL_VERIFICATION_POLICY = {
  codeDigits: 6,

  expiresAfterMilliseconds: 5 * 60 * 1_000,

  retentionAfterExpiryMilliseconds:
    24 * 60 * 60 * 1_000,

  maximumAttempts: 5,
  resendCooldownMilliseconds: 60 * 1_000,
  maximumSendsPerChallenge: 3,
} as const;

export const AUTH_SESSION_POLICY = {
  /*
   * The production cookie uses the __Host- prefix. Browsers require a
   * __Host- cookie to be Secure, use Path=/, and omit Domain.
   */
  developmentCookieName:
    "filmgeezer_session",
  productionCookieName:
    "__Host-filmgeezer_session",

  tokenBytes: 32,

  absoluteLifetimeMilliseconds:
    30 * 24 * 60 * 60 * 1_000,

  idleTimeoutMilliseconds:
    7 * 24 * 60 * 60 * 1_000,

  maximumActiveSessionsPerUser: 5,

  userAgentMaximumLength: 256,
} as const;
