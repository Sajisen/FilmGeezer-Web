export const AUTH_COLLECTION_NAMES = {
  users: "users",
  identities: "auth_identities",
  credentials: "auth_credentials",
  sessions: "auth_sessions",
  challenges: "auth_challenges",
  auditEvents: "auth_audit_events",
} as const;

export const AUTH_SCHEMA_VERSION = 1;