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
  requestBodyLimit: "4kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 10,
} as const;

export const AUTH_SESSION_HTTP_POLICY = {
  /*
   * Session state may be checked during application startup, route
   * changes, and account-menu refreshes. The limit is intentionally much
   * higher than login while still bounding abusive polling.
   */
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 120,
} as const;

export const AUTH_LOGOUT_HTTP_POLICY = {
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 20,
} as const;

export const AUTH_PASSWORD_RESET_REQUEST_HTTP_POLICY = {
  requestBodyLimit: "4kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 10,
} as const;

export const AUTH_PASSWORD_RESET_HTTP_POLICY = {
  requestBodyLimit: "8kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 10,
} as const;

export const AUTH_PASSWORD_RESET_POLICY = {
  tokenBytes: 32,
  tokenCharacterLength: 43,

  expiresAfterMilliseconds: 30 * 60 * 1_000,
  retentionAfterExpiryMilliseconds:
    24 * 60 * 60 * 1_000,

  maximumAttempts: 5,
  requestCooldownMilliseconds: 60 * 1_000,
  maximumSendsPerWindow: 3,

  /*
   * Unknown and known email addresses should take approximately the same
   * minimum time before the generic public response is returned.
   */
  minimumRequestDurationMilliseconds: 500,
} as const;


export const AUTH_ACCOUNT_PROFILE_HTTP_POLICY = {
  requestBodyLimit: "4kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 30,
} as const;

export const AUTH_RECENT_AUTHENTICATION_HTTP_POLICY = {
  requestBodyLimit: "4kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 10,
} as const;

export const AUTH_PASSWORD_CHANGE_HTTP_POLICY = {
  requestBodyLimit: "8kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 5,
} as const;

export const AUTH_ACCOUNT_DETAILS_HTTP_POLICY = {
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 120,
} as const;

export const AUTH_ACCOUNT_SESSION_LIST_HTTP_POLICY = {
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 120,
} as const;

export const AUTH_ACCOUNT_SESSION_REVOKE_HTTP_POLICY = {
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 20,
} as const;


export const AUTH_EMAIL_CHANGE_REQUEST_HTTP_POLICY = {
  requestBodyLimit: "4kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 5,
} as const;

export const AUTH_EMAIL_CHANGE_VERIFY_HTTP_POLICY = {
  requestBodyLimit: "4kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 20,
} as const;

export const AUTH_EMAIL_CHANGE_RESEND_HTTP_POLICY = {
  requestBodyLimit: "4kb",
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 10,
} as const;

export const AUTH_EMAIL_CHANGE_CANCEL_HTTP_POLICY = {
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 20,
} as const;

export const AUTH_EMAIL_CHANGE_POLICY = {
  codeDigits: 6,
  expiresAfterMilliseconds: 10 * 60 * 1_000,
  retentionAfterExpiryMilliseconds:
    24 * 60 * 60 * 1_000,
  maximumAttempts: 5,
  resendCooldownMilliseconds: 60 * 1_000,
  maximumSendsPerChallenge: 3,
} as const;

export const AUTH_RECENT_AUTHENTICATION_POLICY = {
  validForMilliseconds: 5 * 60 * 1_000,
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
  developmentCookieName:
    "filmgeezer_session",
  productionCookieName:
    "__Host-filmgeezer_session",

  csrfHeaderName:
    "x-csrf-token",

  tokenBytes: 32,

  /*
   * A 32-byte Base64URL token contains 43 characters without padding.
   * Requiring the exact format avoids hashing arbitrary cookie input.
   */
  tokenCharacterLength: 43,

  absoluteLifetimeMilliseconds:
    30 * 24 * 60 * 60 * 1_000,

  idleTimeoutMilliseconds:
    7 * 24 * 60 * 60 * 1_000,

  /*
   * lastSeenAt is updated at most once during this interval so ordinary
   * authenticated browsing does not write to MongoDB on every request.
   */
  activityTouchIntervalMilliseconds:
    5 * 60 * 1_000,

  maximumActiveSessionsPerUser: 5,
  userAgentMaximumLength: 256,
} as const;
