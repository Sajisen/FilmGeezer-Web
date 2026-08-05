import type {
  AdminAuditCategory,
  AdminAuditDetailValue,
  AdminAuditEventType,
  AdminAuditIdentity,
} from "../types/admin";

export interface AdminAuditEventOption {
  value: AdminAuditEventType;
  label: string;
  category: AdminAuditCategory;
}

export const ADMIN_AUDIT_EVENT_OPTIONS: AdminAuditEventOption[] = [
  { value: "admin-login-succeeded", label: "Administrator login succeeded", category: "authentication" },
  { value: "admin-login-failed", label: "Administrator login failed", category: "authentication" },
  { value: "admin-mfa-challenge-created", label: "Verification challenge created", category: "authentication" },
  { value: "admin-mfa-challenge-failed", label: "Verification challenge failed", category: "authentication" },
  { value: "admin-mfa-login-succeeded", label: "MFA login succeeded", category: "authentication" },

  { value: "admin-mfa-setup-started", label: "Authenticator setup started", category: "security" },
  { value: "admin-mfa-enabled", label: "Authenticator enabled", category: "security" },
  { value: "admin-mfa-disabled", label: "Authenticator disabled", category: "security" },
  { value: "admin-mfa-recovery-used", label: "Recovery code used", category: "security" },
  { value: "admin-mfa-recovery-regenerated", label: "Recovery codes regenerated", category: "security" },
  { value: "admin-reauthentication-succeeded", label: "Recent authentication succeeded", category: "security" },
  { value: "admin-reauthentication-failed", label: "Recent authentication failed", category: "security" },
  { value: "admin-mfa-reset", label: "Administrator MFA reset", category: "security" },
  { value: "admin-passkey-registration-started", label: "Passkey registration started", category: "security" },
  { value: "admin-passkey-registered", label: "Passkey registered", category: "security" },
  { value: "admin-passkey-authentication-succeeded", label: "Passkey authentication succeeded", category: "security" },
  { value: "admin-passkey-authentication-failed", label: "Passkey authentication failed", category: "security" },
  { value: "admin-passkey-revoked", label: "Passkey revoked", category: "security" },
  { value: "admin-passkey-used-for-reauthentication", label: "Passkey used for recent authentication", category: "security" },
  { value: "admin-passkey-emergency-reset", label: "Passkeys reset from server CLI", category: "security" },

  { value: "admin-logout", label: "Administrator signed out", category: "sessions" },
  { value: "admin-session-revoked", label: "Administrator session revoked", category: "sessions" },

  { value: "admin-role-granted", label: "Administrator role granted", category: "roles" },
  { value: "admin-role-revoked", label: "Administrator role revoked", category: "roles" },

  { value: "admin-support-replied", label: "Support reply added", category: "support" },
  { value: "admin-support-status-updated", label: "Support status changed", category: "support" },

  { value: "admin-user-suspended", label: "User suspended", category: "users" },
  { value: "admin-user-reactivated", label: "User reactivated", category: "users" },
  { value: "admin-user-session-revoked", label: "User session revoked", category: "users" },
  { value: "admin-user-sessions-revoked", label: "All user sessions revoked", category: "users" },

  { value: "admin-content-created", label: "Content entry created", category: "content" },
  { value: "admin-content-updated", label: "Content entry updated", category: "content" },
  { value: "admin-content-status-updated", label: "Content status changed", category: "content" },
];

const EVENT_BY_VALUE = new Map(
  ADMIN_AUDIT_EVENT_OPTIONS.map((option) => [option.value, option]),
);

const DETAIL_LABELS: Record<string, string> = {
  accessLevel: "Access level",
  active: "Active",
  adminSessionId: "Admin session",
  attachment: "Authenticator type",
  attemptsRemaining: "Attempts remaining",
  authenticationMethod: "Authentication method",
  backedUp: "Synced or backed up",
  changed: "State changed",
  deletedPasskeys: "Passkeys removed",
  deviceType: "Passkey device type",
  existingPasskeys: "Existing passkeys",
  linkCount: "Links",
  mediaType: "Media type",
  messageLength: "Reply length",
  method: "Method",
  nextStatus: "New status",
  passkeyAllowed: "Passkey available",
  passkeyCount: "Passkeys",
  passwordHashReplaced: "Password hash upgraded",
  previousStatus: "Previous status",
  reason: "Reason",
  recoveryAllowed: "Recovery code available",
  recoveryCodeCount: "Recovery codes created",
  recoveryCodesGenerated: "Recovery codes generated",
  recoveryCodesRemaining: "Recovery codes remaining",
  referenceId: "Support reference",
  remainingPasskeys: "Remaining passkeys",
  restoredStatus: "Restored status",
  revision: "Revision",
  revokedAdminSessions: "Admin sessions revoked",
  revokedOtherSessions: "Other admin sessions revoked",
  revokedPublicSessions: "Public sessions revoked",
  revokedSessions: "Sessions revoked",
  sessionId: "Session",
  sessionsRevokedForLimit: "Sessions revoked for limit",
  source: "Source",
  sourceCount: "Sources",
  tmdbId: "TMDB ID",
  totpAllowed: "Authenticator available",
  verificationMethod: "Verification method",
};

export function auditEventLabel(eventType: AdminAuditEventType): string {
  return EVENT_BY_VALUE.get(eventType)?.label ?? eventType;
}

export function auditCategoryLabel(category: AdminAuditCategory): string {
  switch (category) {
    case "authentication":
      return "Authentication";
    case "security":
      return "Security";
    case "sessions":
      return "Sessions";
    case "roles":
      return "Roles";
    case "support":
      return "Support";
    case "users":
      return "Users";
    case "content":
      return "Content";
  }
}

export function auditCategoryClass(category: AdminAuditCategory): string {
  switch (category) {
    case "authentication":
      return "border-sky-300/15 bg-sky-400/[0.08] text-sky-200";
    case "security":
      return "border-cyan-300/15 bg-cyan-400/[0.08] text-cyan-200";
    case "sessions":
      return "border-violet-300/15 bg-violet-400/[0.08] text-violet-200";
    case "roles":
      return "border-amber-300/15 bg-amber-400/[0.08] text-amber-200";
    case "support":
      return "border-fuchsia-300/15 bg-fuchsia-400/[0.08] text-fuchsia-200";
    case "users":
      return "border-indigo-300/15 bg-indigo-400/[0.08] text-indigo-200";
    case "content":
      return "border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-200";
  }
}

export function auditIdentityPrimary(identity: AdminAuditIdentity): string {
  return identity.displayName;
}

export function auditIdentitySecondary(identity: AdminAuditIdentity): string {
  if (identity.kind === "system") {
    return "Server operation";
  }

  if (identity.email) {
    return identity.email;
  }

  return identity.userId ?? "Account unavailable";
}

export function formatAuditDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatAuditRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Unknown time";
  }

  const differenceSeconds = Math.round((timestamp - Date.now()) / 1_000);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (Math.abs(differenceSeconds) < 60) {
    return formatter.format(differenceSeconds, "second");
  }

  const differenceMinutes = Math.round(differenceSeconds / 60);
  if (Math.abs(differenceMinutes) < 60) {
    return formatter.format(differenceMinutes, "minute");
  }

  const differenceHours = Math.round(differenceMinutes / 60);
  if (Math.abs(differenceHours) < 24) {
    return formatter.format(differenceHours, "hour");
  }

  const differenceDays = Math.round(differenceHours / 24);
  return formatter.format(differenceDays, "day");
}

export function auditDetailLabel(key: string): string {
  return DETAIL_LABELS[key] ?? key.replace(/([a-z])([A-Z])/gu, "$1 $2");
}

export function auditDetailValue(value: AdminAuditDetailValue): string {
  if (value === null) {
    return "Not recorded";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

export function eventsForAuditCategory(
  category: "all" | AdminAuditCategory,
): AdminAuditEventOption[] {
  return category === "all"
    ? ADMIN_AUDIT_EVENT_OPTIONS
    : ADMIN_AUDIT_EVENT_OPTIONS.filter(
        (option) => option.category === category,
      );
}
