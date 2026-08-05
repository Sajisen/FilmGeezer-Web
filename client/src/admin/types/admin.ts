import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";

export interface AdminUser {
  userId: string;
  email: string;
  displayName: string;
  profileImagePath: string | null;
  roles: Array<"user" | "admin">;
}

export type AdminSessionAccessLevel = "full" | "mfa-enrollment";

export interface AdminSessionSummary {
  accessLevel: AdminSessionAccessLevel;
  createdAt: string;
  lastSeenAt: string;
  recentAuthenticationAt: string;
  mfaVerifiedAt: string | null;
  idleExpiresAt: string;
  expiresAt: string;
}

export interface AdminSecuritySummary {
  mfaEnabled: boolean;
  mfaRequiredByPolicy: boolean;
  passkeysConfigured: boolean;
  passkeyCount: number;
  recoveryCodesRemaining: number;
  mfaEnabledAt: string | null;
}

export interface AdminSessionResponse {
  status: "success";
  code: "ADMIN_SESSION_ACTIVE" | "ADMIN_MFA_ENROLLMENT_REQUIRED";
  user: AdminUser;
  session: AdminSessionSummary;
  csrfToken: string;
  security: AdminSecuritySummary;
}

export interface AdminLoginResponse {
  status: "success";
  code: "ADMIN_LOGIN_SUCCEEDED" | "ADMIN_MFA_ENROLLMENT_REQUIRED";
  message: string;
  user: AdminUser;
  session: AdminSessionSummary;
  csrfToken: string;
  security: AdminSecuritySummary;
}

export interface AdminMfaChallengeResponse {
  status: "success";
  code: "ADMIN_MFA_CHALLENGE_REQUIRED";
  message: string;
  challenge: {
    expiresAt: string;
    passkeyAllowed: boolean;
    totpAllowed: boolean;
    recoveryAllowed: boolean;
  };
}

export type AdminLoginResult =
  | AdminLoginResponse
  | AdminMfaChallengeResponse;

export interface AdminMfaStatusResponse {
  status: "success";
  code: "ADMIN_MFA_STATUS_READY";
  security: AdminSecuritySummary & {
    configured: boolean;
  };
}

export interface AdminMfaSetupResponse {
  status: "success";
  code: "ADMIN_MFA_SETUP_READY";
  setup: {
    setupId: string;
    secret: string;
    otpAuthUri: string;
    qrDataUrl: string;
    expiresAt: string;
  };
}

export interface AdminMfaRecoveryCodesResponse {
  status: "success";
  code:
    | "ADMIN_MFA_ENABLED"
    | "ADMIN_MFA_RECOVERY_CODES_REGENERATED";
  message: string;
  enabledAt?: string;
  generatedAt?: string;
  recoveryCodes: string[];
}

export interface AdminReauthenticationResponse {
  status: "success";
  code: "ADMIN_REAUTHENTICATION_SUCCEEDED";
  message: string;
  authenticatedAt: string;
}

export interface AdminOverview {
  generatedAt: string;
  users: {
    total: number;
    active: number;
    pending: number;
    suspended: number;
  };
  support: {
    new: number;
    inReview: number;
    resolved: number;
    spam: number;
    open: number;
  };
  administration: {
    activeAdministrators: number;
    activeAdminSessions: number;
  };
}

export interface AdminOverviewResponse {
  status: "success";
  code: "ADMIN_OVERVIEW_READY";
  overview: AdminOverview;
}

export interface AdminErrorPayload {
  status?: "error";
  code?: string;
  message?: string;
}

export type AdminAuthStatus =
  | "bootstrapping"
  | "guest"
  | "mfa-required"
  | "mfa-enrollment"
  | "authenticated";

export interface AdminMfaChallengeState {
  expiresAt: string;
  passkeyAllowed: boolean;
  totpAllowed: boolean;
  recoveryAllowed: boolean;
}

export type AdminSupportCategory =
  | "general"
  | "bug"
  | "content"
  | "account"
  | "feedback";

export type AdminSupportStatus =
  | "new"
  | "in-review"
  | "resolved"
  | "spam";

export type AdminSupportSenderRole = "user" | "admin";

export type AdminSupportStatusFilter =
  | "all"
  | "open"
  | AdminSupportStatus;

export type AdminSupportRequesterFilter =
  | "all"
  | "account"
  | "guest";

export interface AdminSupportRequester {
  userId: string | null;
  name: string;
  email: string;
  linkedToAccount: boolean;
}

export interface AdminSupportConversationSummary {
  referenceId: string;
  category: AdminSupportCategory;
  subject: string;
  status: AdminSupportStatus;
  preview: string;
  messageCount: number;
  lastSenderRole: AdminSupportSenderRole;
  lastMessageAt: string;
  createdAt: string;
  requester: AdminSupportRequester;
}

export interface AdminSupportConversationThread {
  conversation: AdminSupportConversationSummary & {
    updatedAt: string;
    resolvedAt: string | null;
  };
  messages: Array<{
    id: string;
    senderRole: AdminSupportSenderRole;
    body: string;
    createdAt: string;
  }>;
  delivery: {
    channel: "in-app" | "email";
    available: boolean;
    message: string;
  };
}

export interface AdminSupportListResponse {
  status: "success";
  code: "ADMIN_SUPPORT_CONVERSATIONS_READY";
  items: AdminSupportConversationSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AdminSupportThreadResponse {
  status: "success";
  code: "ADMIN_SUPPORT_CONVERSATION_READY";
  thread: AdminSupportConversationThread;
}

export interface AdminSupportMutationResponse {
  status: "success";
  code:
    | "ADMIN_SUPPORT_REPLY_ADDED"
    | "ADMIN_SUPPORT_STATUS_UPDATED";
  message: string;
  thread: AdminSupportConversationThread;
}

export interface AdminSupportListFilters {
  page: number;
  status: AdminSupportStatusFilter;
  category: "all" | AdminSupportCategory;
  requester: AdminSupportRequesterFilter;
  search: string;
}


export type AdminPasskeyAttachment = "platform" | "cross-platform";

export interface AdminPasskeySummary {
  credentialId: string;
  label: string;
  attachment: AdminPasskeyAttachment;
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  transports: string[];
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AdminPasskeysResponse {
  status: "success";
  code: "ADMIN_PASSKEYS_READY";
  configured: boolean;
  passkeys: AdminPasskeySummary[];
}

export interface AdminPasskeyRegistrationOptionsResponse {
  status: "success";
  code: "ADMIN_PASSKEY_REGISTRATION_READY";
  challengeId: string;
  expiresAt: string;
  options: PublicKeyCredentialCreationOptionsJSON;
}

export interface AdminPasskeyAuthenticationOptionsResponse {
  status: "success";
  code:
    | "ADMIN_PASSKEY_LOGIN_READY"
    | "ADMIN_PASSKEY_REAUTHENTICATION_READY";
  challengeId: string;
  expiresAt: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}

export interface AdminPasskeyRegistrationResponse {
  status: "success";
  code: "ADMIN_PASSKEY_REGISTERED";
  message: string;
  registeredAt: string;
  passkey: AdminPasskeySummary;
  recoveryCodes: string[] | null;
}

export interface AdminPasskeyRevokeResponse {
  status: "success";
  code: "ADMIN_PASSKEY_REVOKED";
  message: string;
  revokedAt: string;
  remainingPasskeys: number;
  revokedOtherSessions: number;
}

export type AdminRegistrationCredential = RegistrationResponseJSON;
export type AdminAuthenticationCredential = AuthenticationResponseJSON;


export type AdminManagedUserStatus =
  | "pending"
  | "active"
  | "suspended"
  | "deactivated"
  | "deleted";

export type AdminManagedUserRole = "user" | "admin";
export type AdminManagedUserVerificationFilter =
  | "all"
  | "verified"
  | "unverified";
export type AdminManagedUserStatusFilter =
  | "all"
  | AdminManagedUserStatus;
export type AdminManagedUserRoleFilter =
  | "all"
  | AdminManagedUserRole;

export interface AdminManagedUserSummary {
  userId: string;
  email: string;
  displayName: string;
  profileImagePath: string | null;
  status: AdminManagedUserStatus;
  roles: AdminManagedUserRole[];
  emailVerified: boolean;
  activeSessionCount: number;
  isCurrentAdministrator: boolean;
  finalAdministratorProtected: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface AdminManagedUserSession {
  sessionId: string;
  provider: "local" | "clerk";
  userAgentSummary: string | null;
  createdAt: string;
  lastSeenAt: string;
  recentAuthenticationAt: string | null;
  expiresAt: string;
}

export interface AdminManagedUserDetail {
  user: AdminManagedUserSummary & {
    emailVerifiedAt: string | null;
    suspendedAt: string | null;
    deactivatedAt: string | null;
    deletedAt: string | null;
  };
  identities: Array<{
    provider: "local" | "clerk";
    createdAt: string;
  }>;
  activeSessions: AdminManagedUserSession[];
  permissions: {
    canSuspend: boolean;
    canReactivate: boolean;
    canRevokeSessions: boolean;
    blockedReason: string | null;
  };
}

export interface AdminUserListFilters {
  page: number;
  status: AdminManagedUserStatusFilter;
  role: AdminManagedUserRoleFilter;
  verification: AdminManagedUserVerificationFilter;
  search: string;
}

export interface AdminUserListResponse {
  status: "success";
  code: "ADMIN_USERS_READY";
  items: AdminManagedUserSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AdminUserDetailResponse {
  status: "success";
  code: "ADMIN_USER_READY";
  detail: AdminManagedUserDetail;
}

export interface AdminUserMutationResponse {
  status: "success";
  code:
    | "ADMIN_USER_SUSPENDED"
    | "ADMIN_USER_REACTIVATED"
    | "ADMIN_USER_SESSION_REVOKED"
    | "ADMIN_USER_SESSIONS_REVOKED";
  message: string;
  revokedSessions?: number;
  detail: AdminManagedUserDetail;
}
