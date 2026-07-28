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

export const AUTH_EMAIL_VERIFICATION_POLICY = {
  codeDigits: 6,

  expiresAfterMilliseconds: 5 * 60 * 1_000,

  maximumAttempts: 5,

  resendCooldownMilliseconds: 60 * 1_000,

  maximumSendsPerChallenge: 3,
} as const;