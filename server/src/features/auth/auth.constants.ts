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
  /*
   * Registration bodies contain only an email, display name, and
   * password. Eight kilobytes is comfortably larger than a legitimate
   * request while preventing unnecessarily large authentication bodies.
   */
  requestBodyLimit: "8kb",

  /*
   * This is the initial per-process registration limiter.
   *
   * Ten attempts gives normal users enough room to correct mistakes
   * while slowing automated registration abuse.
   */
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 10,
} as const;

export const AUTH_EMAIL_VERIFICATION_HTTP_POLICY = {
  /*
   * The body contains only a UUID and a six-digit verification code.
   * Four kilobytes is comfortably larger than any legitimate request.
   */
  requestBodyLimit: "4kb",

  /*
   * The challenge itself allows only five incorrect code attempts.
   * This additional IP limiter protects the route from broader abuse,
   * malformed challenge IDs, and repeated requests across challenges.
   */
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 20,
} as const;

export const AUTH_EMAIL_VERIFICATION_RESEND_HTTP_POLICY = {
  /*
   * Resend requests contain only the public challenge UUID.
   */
  requestBodyLimit: "4kb",

  /*
   * This route also has challenge-level cooldown and send limits.
   * The IP limiter protects against broad probing with random UUIDs.
   */
  rateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumRequestsPerWindow: 10,
} as const;

export const AUTH_EMAIL_VERIFICATION_POLICY = {
  codeDigits: 6,

  expiresAfterMilliseconds: 5 * 60 * 1_000,

  /*
   * Expired challenges remain available for a limited period so a user
   * can request a replacement code using the unguessable public ID.
   * `expiresAt` controls validity; `deleteAt` controls physical cleanup.
   */
  retentionAfterExpiryMilliseconds:
    24 * 60 * 60 * 1_000,

  maximumAttempts: 5,

  resendCooldownMilliseconds: 60 * 1_000,

  /*
   * The first registration email counts as send 1. A still-current
   * verification flow may therefore request at most two replacements.
   * Once the five-minute challenge window has expired, a new flow may
   * begin with a fresh send count.
   */
  maximumSendsPerChallenge: 3,
} as const;