import type {
  AuthSessionSummary,
  AuthUser,
} from "./auth";

export interface AccountSummary {
  userId: string;
  provider: "local";
  email: string;
  displayName: string;
  roles: AuthUser["roles"];
  emailVerifiedAt: string;
  memberSince: string;
  lastLoginAt: string | null;
}

export interface AccountSecuritySummary {
  passwordChangedAt: string;
  recentAuthenticationExpiresAt:
    | string
    | null;
}

export interface AccountDetailsResponse {
  status: "success";
  code: "ACCOUNT_DETAILS_READY";
  account: AccountSummary;
  security: AccountSecuritySummary;
  session: Required<AuthSessionSummary>;
}

export interface AccountProfileUpdateResponse {
  status: "success";
  code: "ACCOUNT_PROFILE_UPDATED";
  message: string;
  changed: boolean;
  user: AuthUser;
}

export interface RecentAuthenticationResponse {
  status: "success";
  code:
    "AUTH_RECENT_AUTHENTICATION_CONFIRMED";
  message: string;
  confirmedAt: string;
  expiresAt: string;
}

export interface AccountPasswordChangeResponse {
  status: "success";
  code: "ACCOUNT_PASSWORD_CHANGED";
  message: string;
  changedAt: string;
  sessionsRevoked: number;
  user: AuthUser;
  session: AuthSessionSummary;
}
