import type {
  AuthProvider,
  AuthRole,
  UserStatus,
} from "../auth/auth.types.js";

export const ADMIN_USER_STATUS_FILTER_VALUES = [
  "all",
  "pending",
  "active",
  "suspended",
  "deactivated",
  "deleted",
] as const;

export type AdminUserStatusFilter =
  (typeof ADMIN_USER_STATUS_FILTER_VALUES)[number];

export const ADMIN_USER_ROLE_FILTER_VALUES = [
  "all",
  "user",
  "admin",
] as const;

export type AdminUserRoleFilter =
  (typeof ADMIN_USER_ROLE_FILTER_VALUES)[number];

export const ADMIN_USER_VERIFICATION_FILTER_VALUES = [
  "all",
  "verified",
  "unverified",
] as const;

export type AdminUserVerificationFilter =
  (typeof ADMIN_USER_VERIFICATION_FILTER_VALUES)[number];

export interface AdminUserListQuery {
  page: number;
  pageSize: number;
  status: AdminUserStatusFilter;
  role: AdminUserRoleFilter;
  verification: AdminUserVerificationFilter;
  search: string;
}

export interface AdminManagedUserSummary {
  userId: string;
  email: string;
  displayName: string;
  profileImagePath: string | null;
  status: UserStatus;
  roles: AuthRole[];
  emailVerified: boolean;
  activeSessionCount: number;
  isCurrentAdministrator: boolean;
  finalAdministratorProtected: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface AdminManagedUserIdentitySummary {
  provider: AuthProvider;
  createdAt: Date;
}

export interface AdminManagedUserSessionSummary {
  sessionId: string;
  provider: AuthProvider;
  userAgentSummary: string | null;
  createdAt: Date;
  lastSeenAt: Date;
  recentAuthenticationAt: Date | null;
  expiresAt: Date;
}

export interface AdminManagedUserPermissions {
  canSuspend: boolean;
  canReactivate: boolean;
  canRevokeSessions: boolean;
  blockedReason: string | null;
}

export interface AdminManagedUserDetail {
  user: AdminManagedUserSummary & {
    emailVerifiedAt: Date | null;
    suspendedAt: Date | null;
    deactivatedAt: Date | null;
    deletedAt: Date | null;
  };
  identities: AdminManagedUserIdentitySummary[];
  activeSessions: AdminManagedUserSessionSummary[];
  permissions: AdminManagedUserPermissions;
}

export interface AdminUserListResult {
  items: AdminManagedUserSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
