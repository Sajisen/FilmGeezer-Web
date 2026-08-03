export const ADMIN_COLLECTION_NAMES = {
  sessions: "admin_sessions",
  auditEvents: "admin_audit_events",
} as const;

export const ADMIN_SCHEMA_VERSION = 1;

export const ADMIN_SESSION_POLICY = {
  developmentCookieName: "filmgeezer_admin_session",
  productionCookieName: "__Host-filmgeezer_admin_session",
  csrfHeaderName: "x-admin-csrf-token",
  tokenBytes: 32,
  tokenCharacterLength: 43,
  absoluteLifetimeMilliseconds: 8 * 60 * 60 * 1_000,
  idleTimeoutMilliseconds: 30 * 60 * 1_000,
  activityTouchIntervalMilliseconds: 2 * 60 * 1_000,
  maximumActiveSessionsPerUser: 2,
  userAgentMaximumLength: 256,
} as const;

export const ADMIN_HTTP_POLICY = {
  login: {
    requestBodyLimit: "4kb",
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 5,
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
} as const;

export const ADMIN_EMAIL_MAXIMUM_LENGTH = 254;
export const ADMIN_PASSWORD_MAXIMUM_LENGTH = 128;
