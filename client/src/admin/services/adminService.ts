import type {
  AdminContentDetail,
  AdminContentDetailResponse,
  AdminContentListFilters,
  AdminContentListResponse,
  AdminContentMediaSnapshot,
  AdminContentMovieQualityLink,
  AdminContentMovieSource,
  AdminContentMutationResponse,
  AdminContentSaveInput,
  AdminContentSeriesOption,
  AdminContentSummary,
  AdminContentTmdbSearchResponse,
  AdminErrorPayload,
  AdminLoginResponse,
  AdminLoginResult,
  AdminMfaChallengeResponse,
  AdminManagedUserDetail,
  AdminManagedUserSession,
  AdminManagedUserSummary,
  AdminMfaRecoveryCodesResponse,
  AdminMfaSetupResponse,
  AdminMfaStatusResponse,
  AdminOverviewResponse,
  AdminPasskeyAuthenticationOptionsResponse,
  AdminPasskeyRegistrationOptionsResponse,
  AdminPasskeyRegistrationResponse,
  AdminPasskeyRevokeResponse,
  AdminPasskeysResponse,
  AdminAuthenticationCredential,
  AdminRegistrationCredential,
  AdminReauthenticationResponse,
  AdminSecuritySummary,
  AdminSessionResponse,
  AdminSessionSummary,
  AdminSupportCategory,
  AdminSupportConversationSummary,
  AdminSupportConversationThread,
  AdminSupportListFilters,
  AdminSupportListResponse,
  AdminSupportMutationResponse,
  AdminSupportRequester,
  AdminSupportSenderRole,
  AdminSupportStatus,
  AdminSupportThreadResponse,
  AdminUser,
  AdminUserDetailResponse,
  AdminUserListFilters,
  AdminUserListResponse,
  AdminUserMutationResponse,
} from "../types/admin";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(
    status: number,
    payload: AdminErrorPayload,
    fallbackMessage: string,
  ) {
    super(payload.message?.trim() || fallbackMessage);
    this.name = "AdminApiError";
    this.status = status;
    this.code = typeof payload.code === "string" ? payload.code : null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAdminUser(value: unknown): value is AdminUser {
  return (
    isRecord(value) &&
    typeof value.userId === "string" &&
    typeof value.email === "string" &&
    typeof value.displayName === "string" &&
    (value.profileImagePath === null ||
      typeof value.profileImagePath === "string") &&
    Array.isArray(value.roles) &&
    value.roles.includes("admin") &&
    value.roles.every((role) => role === "user" || role === "admin")
  );
}

function isAdminSessionSummary(
  value: unknown,
): value is AdminSessionSummary {
  return (
    isRecord(value) &&
    (value.accessLevel === "full" ||
      value.accessLevel === "mfa-enrollment") &&
    typeof value.createdAt === "string" &&
    typeof value.lastSeenAt === "string" &&
    typeof value.recentAuthenticationAt === "string" &&
    (value.mfaVerifiedAt === null ||
      typeof value.mfaVerifiedAt === "string") &&
    typeof value.idleExpiresAt === "string" &&
    typeof value.expiresAt === "string"
  );
}

function isAdminSecuritySummary(
  value: unknown,
): value is AdminSecuritySummary {
  return (
    isRecord(value) &&
    typeof value.mfaEnabled === "boolean" &&
    typeof value.mfaRequiredByPolicy === "boolean" &&
    typeof value.passkeysConfigured === "boolean" &&
    typeof value.passkeyCount === "number" &&
    typeof value.recoveryCodesRemaining === "number" &&
    (value.mfaEnabledAt === null ||
      typeof value.mfaEnabledAt === "string")
  );
}

function isSessionResponse(value: unknown): value is AdminSessionResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    (value.code === "ADMIN_SESSION_ACTIVE" ||
      value.code === "ADMIN_MFA_ENROLLMENT_REQUIRED") &&
    isAdminUser(value.user) &&
    isAdminSessionSummary(value.session) &&
    typeof value.csrfToken === "string" &&
    isAdminSecuritySummary(value.security)
  );
}

function isLoginResponse(value: unknown): value is AdminLoginResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    (value.code === "ADMIN_LOGIN_SUCCEEDED" ||
      value.code === "ADMIN_MFA_ENROLLMENT_REQUIRED") &&
    typeof value.message === "string" &&
    isAdminUser(value.user) &&
    isAdminSessionSummary(value.session) &&
    typeof value.csrfToken === "string" &&
    isAdminSecuritySummary(value.security)
  );
}

function isMfaChallengeResponse(
  value: unknown,
): value is AdminMfaChallengeResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_MFA_CHALLENGE_REQUIRED" &&
    typeof value.message === "string" &&
    isRecord(value.challenge) &&
    typeof value.challenge.expiresAt === "string" &&
    typeof value.challenge.passkeyAllowed === "boolean" &&
    typeof value.challenge.totpAllowed === "boolean" &&
    typeof value.challenge.recoveryAllowed === "boolean"
  );
}

function isLoginResult(value: unknown): value is AdminLoginResult {
  return isLoginResponse(value) || isMfaChallengeResponse(value);
}

function isMfaStatusResponse(
  value: unknown,
): value is AdminMfaStatusResponse {
  if (
    !isRecord(value) ||
    value.status !== "success" ||
    value.code !== "ADMIN_MFA_STATUS_READY" ||
    !isRecord(value.security)
  ) {
    return false;
  }

  return (
    isAdminSecuritySummary(value.security) &&
    typeof value.security.configured === "boolean"
  );
}

function isMfaSetupResponse(
  value: unknown,
): value is AdminMfaSetupResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_MFA_SETUP_READY" &&
    isRecord(value.setup) &&
    typeof value.setup.setupId === "string" &&
    typeof value.setup.secret === "string" &&
    typeof value.setup.otpAuthUri === "string" &&
    typeof value.setup.qrDataUrl === "string" &&
    typeof value.setup.expiresAt === "string"
  );
}

function isMfaRecoveryCodesResponse(
  value: unknown,
): value is AdminMfaRecoveryCodesResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    (value.code === "ADMIN_MFA_ENABLED" ||
      value.code === "ADMIN_MFA_RECOVERY_CODES_REGENERATED") &&
    typeof value.message === "string" &&
    Array.isArray(value.recoveryCodes) &&
    value.recoveryCodes.every((code) => typeof code === "string") &&
    (value.enabledAt === undefined || typeof value.enabledAt === "string") &&
    (value.generatedAt === undefined ||
      typeof value.generatedAt === "string")
  );
}

function isReauthenticationResponse(
  value: unknown,
): value is AdminReauthenticationResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_REAUTHENTICATION_SUCCEEDED" &&
    typeof value.message === "string" &&
    typeof value.authenticatedAt === "string"
  );
}

function isOverviewResponse(value: unknown): value is AdminOverviewResponse {
  if (
    !isRecord(value) ||
    value.status !== "success" ||
    value.code !== "ADMIN_OVERVIEW_READY" ||
    !isRecord(value.overview)
  ) {
    return false;
  }

  const overview = value.overview;

  if (
    typeof overview.generatedAt !== "string" ||
    !isRecord(overview.users) ||
    !isRecord(overview.support) ||
    !isRecord(overview.administration)
  ) {
    return false;
  }

  return [
    overview.users.total,
    overview.users.active,
    overview.users.pending,
    overview.users.suspended,
    overview.support.new,
    overview.support.inReview,
    overview.support.resolved,
    overview.support.spam,
    overview.support.open,
    overview.administration.activeAdministrators,
    overview.administration.activeAdminSessions,
  ].every((item) => typeof item === "number");
}

const SUPPORT_CATEGORIES: AdminSupportCategory[] = [
  "general",
  "bug",
  "content",
  "account",
  "feedback",
];
const SUPPORT_STATUSES: AdminSupportStatus[] = [
  "new",
  "in-review",
  "resolved",
  "spam",
];
const SUPPORT_SENDER_ROLES: AdminSupportSenderRole[] = [
  "user",
  "admin",
];

function isSupportRequester(value: unknown): value is AdminSupportRequester {
  return (
    isRecord(value) &&
    (value.userId === null || typeof value.userId === "string") &&
    typeof value.name === "string" &&
    typeof value.email === "string" &&
    typeof value.linkedToAccount === "boolean"
  );
}

function isSupportSummary(
  value: unknown,
): value is AdminSupportConversationSummary {
  return (
    isRecord(value) &&
    typeof value.referenceId === "string" &&
    typeof value.category === "string" &&
    SUPPORT_CATEGORIES.includes(value.category as AdminSupportCategory) &&
    typeof value.subject === "string" &&
    typeof value.status === "string" &&
    SUPPORT_STATUSES.includes(value.status as AdminSupportStatus) &&
    typeof value.preview === "string" &&
    typeof value.messageCount === "number" &&
    typeof value.lastSenderRole === "string" &&
    SUPPORT_SENDER_ROLES.includes(
      value.lastSenderRole as AdminSupportSenderRole,
    ) &&
    typeof value.lastMessageAt === "string" &&
    typeof value.createdAt === "string" &&
    isSupportRequester(value.requester)
  );
}

function isSupportThread(
  value: unknown,
): value is AdminSupportConversationThread {
  if (!isRecord(value) || !isRecord(value.conversation)) {
    return false;
  }

  const conversation = value.conversation;

  if (
    !isSupportSummary(conversation) ||
    typeof conversation.updatedAt !== "string" ||
    !(
      conversation.resolvedAt === null ||
      typeof conversation.resolvedAt === "string"
    ) ||
    !Array.isArray(value.messages) ||
    !isRecord(value.delivery)
  ) {
    return false;
  }

  return (
    value.messages.every(
      (message) =>
        isRecord(message) &&
        typeof message.id === "string" &&
        typeof message.senderRole === "string" &&
        SUPPORT_SENDER_ROLES.includes(
          message.senderRole as AdminSupportSenderRole,
        ) &&
        typeof message.body === "string" &&
        typeof message.createdAt === "string",
    ) &&
    (value.delivery.channel === "in-app" ||
      value.delivery.channel === "email") &&
    typeof value.delivery.available === "boolean" &&
    typeof value.delivery.message === "string"
  );
}

function isSupportListResponse(
  value: unknown,
): value is AdminSupportListResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_SUPPORT_CONVERSATIONS_READY" &&
    Array.isArray(value.items) &&
    value.items.every(isSupportSummary) &&
    isRecord(value.pagination) &&
    [
      value.pagination.page,
      value.pagination.pageSize,
      value.pagination.totalItems,
      value.pagination.totalPages,
    ].every((item) => typeof item === "number")
  );
}

function isSupportThreadResponse(
  value: unknown,
): value is AdminSupportThreadResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_SUPPORT_CONVERSATION_READY" &&
    isSupportThread(value.thread)
  );
}

function isSupportMutationResponse(
  value: unknown,
): value is AdminSupportMutationResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    (value.code === "ADMIN_SUPPORT_REPLY_ADDED" ||
      value.code === "ADMIN_SUPPORT_STATUS_UPDATED") &&
    typeof value.message === "string" &&
    isSupportThread(value.thread)
  );
}

function isPasskeySummary(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.credentialId === "string" &&
    typeof value.label === "string" &&
    (value.attachment === "platform" || value.attachment === "cross-platform") &&
    (value.deviceType === "singleDevice" || value.deviceType === "multiDevice") &&
    typeof value.backedUp === "boolean" &&
    Array.isArray(value.transports) &&
    value.transports.every((transport) => typeof transport === "string") &&
    typeof value.createdAt === "string" &&
    (value.lastUsedAt === null || typeof value.lastUsedAt === "string")
  );
}

function isPasskeysResponse(value: unknown): value is AdminPasskeysResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_PASSKEYS_READY" &&
    typeof value.configured === "boolean" &&
    Array.isArray(value.passkeys) &&
    value.passkeys.every(isPasskeySummary)
  );
}

function isPasskeyRegistrationOptionsResponse(
  value: unknown,
): value is AdminPasskeyRegistrationOptionsResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_PASSKEY_REGISTRATION_READY" &&
    typeof value.challengeId === "string" &&
    typeof value.expiresAt === "string" &&
    isRecord(value.options)
  );
}

function isPasskeyAuthenticationOptionsResponse(
  value: unknown,
): value is AdminPasskeyAuthenticationOptionsResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    (value.code === "ADMIN_PASSKEY_LOGIN_READY" ||
      value.code === "ADMIN_PASSKEY_REAUTHENTICATION_READY") &&
    typeof value.challengeId === "string" &&
    typeof value.expiresAt === "string" &&
    isRecord(value.options)
  );
}

function isPasskeyRegistrationResponse(
  value: unknown,
): value is AdminPasskeyRegistrationResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_PASSKEY_REGISTERED" &&
    typeof value.message === "string" &&
    typeof value.registeredAt === "string" &&
    isPasskeySummary(value.passkey) &&
    (value.recoveryCodes === null ||
      (Array.isArray(value.recoveryCodes) &&
        value.recoveryCodes.every((code) => typeof code === "string")))
  );
}

function isPasskeyRevokeResponse(
  value: unknown,
): value is AdminPasskeyRevokeResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_PASSKEY_REVOKED" &&
    typeof value.message === "string" &&
    typeof value.revokedAt === "string" &&
    typeof value.remainingPasskeys === "number" &&
    typeof value.revokedOtherSessions === "number"
  );
}


const MANAGED_USER_STATUSES = [
  "pending",
  "active",
  "suspended",
  "deactivated",
  "deleted",
] as const;

function isManagedUserSummary(
  value: unknown,
): value is AdminManagedUserSummary {
  return (
    isRecord(value) &&
    typeof value.userId === "string" &&
    typeof value.email === "string" &&
    typeof value.displayName === "string" &&
    (value.profileImagePath === null ||
      typeof value.profileImagePath === "string") &&
    typeof value.status === "string" &&
    MANAGED_USER_STATUSES.includes(
      value.status as (typeof MANAGED_USER_STATUSES)[number],
    ) &&
    Array.isArray(value.roles) &&
    value.roles.every((role) => role === "user" || role === "admin") &&
    typeof value.emailVerified === "boolean" &&
    typeof value.activeSessionCount === "number" &&
    typeof value.isCurrentAdministrator === "boolean" &&
    typeof value.finalAdministratorProtected === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (value.lastLoginAt === null || typeof value.lastLoginAt === "string")
  );
}

function isManagedUserSession(
  value: unknown,
): value is AdminManagedUserSession {
  return (
    isRecord(value) &&
    typeof value.sessionId === "string" &&
    (value.provider === "local" || value.provider === "clerk") &&
    (value.userAgentSummary === null ||
      typeof value.userAgentSummary === "string") &&
    typeof value.createdAt === "string" &&
    typeof value.lastSeenAt === "string" &&
    (value.recentAuthenticationAt === null ||
      typeof value.recentAuthenticationAt === "string") &&
    typeof value.expiresAt === "string"
  );
}

function isManagedUserDetailUser(
  value: unknown,
): value is AdminManagedUserDetail["user"] {
  return (
    isRecord(value) &&
    isManagedUserSummary(value) &&
    (value.emailVerifiedAt === null ||
      typeof value.emailVerifiedAt === "string") &&
    (value.suspendedAt === null ||
      typeof value.suspendedAt === "string") &&
    (value.deactivatedAt === null ||
      typeof value.deactivatedAt === "string") &&
    (value.deletedAt === null ||
      typeof value.deletedAt === "string")
  );
}

function isManagedUserDetail(
  value: unknown,
): value is AdminManagedUserDetail {
  return (
    isRecord(value) &&
    isManagedUserDetailUser(value.user) &&
    Array.isArray(value.identities) &&
    value.identities.every(
      (identity) =>
        isRecord(identity) &&
        (identity.provider === "local" ||
          identity.provider === "clerk") &&
        typeof identity.createdAt === "string",
    ) &&
    Array.isArray(value.activeSessions) &&
    value.activeSessions.every(isManagedUserSession) &&
    isRecord(value.permissions) &&
    typeof value.permissions.canSuspend === "boolean" &&
    typeof value.permissions.canReactivate === "boolean" &&
    typeof value.permissions.canRevokeSessions === "boolean" &&
    (value.permissions.blockedReason === null ||
      typeof value.permissions.blockedReason === "string")
  );
}

function isAdminUserListResponse(
  value: unknown,
): value is AdminUserListResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_USERS_READY" &&
    Array.isArray(value.items) &&
    value.items.every(isManagedUserSummary) &&
    isRecord(value.pagination) &&
    [
      value.pagination.page,
      value.pagination.pageSize,
      value.pagination.totalItems,
      value.pagination.totalPages,
    ].every((item) => typeof item === "number")
  );
}

function isAdminUserDetailResponse(
  value: unknown,
): value is AdminUserDetailResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_USER_READY" &&
    isManagedUserDetail(value.detail)
  );
}

function isAdminUserMutationResponse(
  value: unknown,
): value is AdminUserMutationResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    (
      value.code === "ADMIN_USER_SUSPENDED" ||
      value.code === "ADMIN_USER_REACTIVATED" ||
      value.code === "ADMIN_USER_SESSION_REVOKED" ||
      value.code === "ADMIN_USER_SESSIONS_REVOKED"
    ) &&
    typeof value.message === "string" &&
    (value.revokedSessions === undefined ||
      typeof value.revokedSessions === "number") &&
    isManagedUserDetail(value.detail)
  );
}


function isAdminContentMediaSnapshot(
  value: unknown,
): value is AdminContentMediaSnapshot {
  return (
    isRecord(value) &&
    (value.mediaType === "movie" || value.mediaType === "tv") &&
    typeof value.tmdbId === "number" &&
    typeof value.title === "string" &&
    typeof value.year === "string" &&
    typeof value.rating === "number" &&
    (value.posterUrl === null || typeof value.posterUrl === "string") &&
    (value.backdropUrl === null || typeof value.backdropUrl === "string") &&
    typeof value.overview === "string"
  );
}

function isAdminContentSeriesOption(
  value: unknown,
): value is AdminContentSeriesOption {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.url === "string" &&
    typeof value.isMain === "boolean" &&
    typeof value.active === "boolean"
  );
}

function isAdminContentMovieQualityLink(
  value: unknown,
): value is AdminContentMovieQualityLink {
  return (
    isRecord(value) &&
    typeof value.url === "string" &&
    (value.size === null || typeof value.size === "string")
  );
}

function isNullableAdminContentMovieQualityLink(
  value: unknown,
): value is AdminContentMovieQualityLink | null {
  return value === null || isAdminContentMovieQualityLink(value);
}

function isAdminContentMovieSource(
  value: unknown,
): value is AdminContentMovieSource {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.isMain === "boolean" &&
    typeof value.active === "boolean" &&
    isRecord(value.links) &&
    isNullableAdminContentMovieQualityLink(value.links["720p"]) &&
    isNullableAdminContentMovieQualityLink(value.links["1080p"])
  );
}

function isAdminContentSummary(
  value: unknown,
): value is AdminContentSummary {
  return (
    isRecord(value) &&
    (value.mediaType === "movie" || value.mediaType === "tv") &&
    typeof value.tmdbId === "number" &&
    (value.kind === "movie" || value.kind === "series") &&
    typeof value.title === "string" &&
    typeof value.year === "string" &&
    typeof value.active === "boolean" &&
    typeof value.sourceCount === "number" &&
    typeof value.linkCount === "number" &&
    typeof value.revision === "number" &&
    (value.updatedAt === null || typeof value.updatedAt === "string")
  );
}

function isAdminContentDetail(
  value: unknown,
): value is AdminContentDetail {
  return (
    isRecord(value) &&
    isAdminContentMediaSnapshot(value.media) &&
    typeof value.exists === "boolean" &&
    typeof value.active === "boolean" &&
    (value.kind === "movie" || value.kind === "series") &&
    typeof value.revision === "number" &&
    typeof value.revisionToken === "string" &&
    /^[a-f0-9]{64}$/u.test(value.revisionToken) &&
    (value.updatedAt === null || typeof value.updatedAt === "string") &&
    Array.isArray(value.seriesOptions) &&
    value.seriesOptions.every(isAdminContentSeriesOption) &&
    Array.isArray(value.movieSources) &&
    value.movieSources.every(isAdminContentMovieSource)
  );
}

function isAdminContentListResponse(
  value: unknown,
): value is AdminContentListResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_CONTENT_ENTRIES_READY" &&
    Array.isArray(value.items) &&
    value.items.every(isAdminContentSummary) &&
    isRecord(value.pagination) &&
    [
      value.pagination.page,
      value.pagination.pageSize,
      value.pagination.totalItems,
      value.pagination.totalPages,
    ].every((item) => typeof item === "number")
  );
}

function isAdminContentTmdbSearchResponse(
  value: unknown,
): value is AdminContentTmdbSearchResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_CONTENT_TMDB_RESULTS_READY" &&
    Array.isArray(value.items) &&
    value.items.every(isAdminContentMediaSnapshot) &&
    isRecord(value.pagination) &&
    [
      value.pagination.page,
      value.pagination.totalItems,
      value.pagination.totalPages,
    ].every((item) => typeof item === "number")
  );
}

function isAdminContentDetailResponse(
  value: unknown,
): value is AdminContentDetailResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_CONTENT_ENTRY_READY" &&
    isAdminContentDetail(value.detail)
  );
}

function isAdminContentMutationResponse(
  value: unknown,
): value is AdminContentMutationResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    (value.code === "ADMIN_CONTENT_ENTRY_SAVED" ||
      value.code === "ADMIN_CONTENT_STATUS_UPDATED") &&
    typeof value.message === "string" &&
    isAdminContentDetail(value.detail)
  );
}

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function adminRequest<T>(
  path: string,
  input: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    csrfToken?: string;
    signal?: AbortSignal;
    guard: (value: unknown) => value is T;
    fallbackMessage: string;
  },
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: input.method ?? "GET",
    credentials: "include",
    signal: input.signal,
    headers: {
      ...(input.body !== undefined
        ? { "Content-Type": "application/json" }
        : {}),
      ...(input.csrfToken
        ? { "X-Admin-CSRF-Token": input.csrfToken }
        : {}),
    },
    body:
      input.body !== undefined ? JSON.stringify(input.body) : undefined,
  });
  const payload = await parseJson(response);

  if (!response.ok) {
    throw new AdminApiError(
      response.status,
      isRecord(payload) ? payload : {},
      input.fallbackMessage,
    );
  }

  if (!input.guard(payload)) {
    throw new Error("FilmGeezer received an invalid administrator response.");
  }

  return payload;
}

export function getAdminSession(
  signal?: AbortSignal,
): Promise<AdminSessionResponse> {
  return adminRequest("/api/admin/auth/session", {
    signal,
    guard: isSessionResponse,
    fallbackMessage: "Administrator access could not be checked.",
  });
}

export function loginAdmin(input: {
  email: string;
  password: string;
}): Promise<AdminLoginResult> {
  return adminRequest("/api/admin/auth/login", {
    method: "POST",
    body: input,
    guard: isLoginResult,
    fallbackMessage: "Administrator sign-in could not be completed.",
  });
}

export function verifyAdminMfaLogin(input: {
  method: "totp" | "recovery";
  code: string;
}): Promise<AdminLoginResponse> {
  return adminRequest("/api/admin/auth/mfa/verify", {
    method: "POST",
    body: input,
    guard: isLoginResponse,
    fallbackMessage: "Administrator MFA could not be verified.",
  });
}

export async function cancelAdminMfaLogin(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/auth/mfa/cancel`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await parseJson(response);
    throw new AdminApiError(
      response.status,
      isRecord(payload) ? payload : {},
      "Administrator MFA verification could not be cancelled.",
    );
  }
}

export async function logoutAdmin(csrfToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: { "X-Admin-CSRF-Token": csrfToken },
  });

  if (!response.ok) {
    const payload = await parseJson(response);
    throw new AdminApiError(
      response.status,
      isRecord(payload) ? payload : {},
      "Administrator sign-out could not be completed.",
    );
  }
}

export function getAdminMfaStatus(
  signal?: AbortSignal,
): Promise<AdminMfaStatusResponse> {
  return adminRequest("/api/admin/auth/mfa/status", {
    signal,
    guard: isMfaStatusResponse,
    fallbackMessage: "Administrator MFA status could not be loaded.",
  });
}

export function startAdminMfaSetup(
  input: { password?: string },
  csrfToken: string,
): Promise<AdminMfaSetupResponse> {
  return adminRequest("/api/admin/auth/mfa/setup", {
    method: "POST",
    body: input,
    csrfToken,
    guard: isMfaSetupResponse,
    fallbackMessage: "Administrator MFA setup could not be started.",
  });
}

export function completeAdminMfaSetup(
  input: { setupId: string; code: string },
  csrfToken: string,
): Promise<AdminMfaRecoveryCodesResponse> {
  return adminRequest("/api/admin/auth/mfa/setup/verify", {
    method: "POST",
    body: input,
    csrfToken,
    guard: isMfaRecoveryCodesResponse,
    fallbackMessage: "Administrator MFA setup could not be completed.",
  });
}

export function regenerateAdminMfaRecoveryCodes(
  input: {
    password: string;
    method: "totp" | "recovery";
    code: string;
  },
  csrfToken: string,
): Promise<AdminMfaRecoveryCodesResponse> {
  return adminRequest("/api/admin/auth/mfa/recovery-codes", {
    method: "POST",
    body: input,
    csrfToken,
    guard: isMfaRecoveryCodesResponse,
    fallbackMessage: "Recovery codes could not be regenerated.",
  });
}

export function regenerateAdminMfaRecoveryCodesWithRecentAuthentication(
  csrfToken: string,
): Promise<AdminMfaRecoveryCodesResponse> {
  return adminRequest(
    "/api/admin/auth/mfa/recovery-codes/recent-authentication",
    {
      method: "POST",
      csrfToken,
      guard: isMfaRecoveryCodesResponse,
      fallbackMessage: "Recovery codes could not be regenerated.",
    },
  );
}

export async function disableAdminMfa(
  input: {
    password: string;
    method: "totp" | "recovery";
    code: string;
  },
  csrfToken: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/auth/mfa/disable`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-CSRF-Token": csrfToken,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const payload = await parseJson(response);
    throw new AdminApiError(
      response.status,
      isRecord(payload) ? payload : {},
      "Administrator MFA could not be disabled.",
    );
  }
}

export function reauthenticateAdmin(
  input: {
    password: string;
    method: "totp" | "recovery";
    code: string;
  },
  csrfToken: string,
): Promise<AdminReauthenticationResponse> {
  return adminRequest("/api/admin/auth/reauthenticate", {
    method: "POST",
    body: input,
    csrfToken,
    guard: isReauthenticationResponse,
    fallbackMessage: "Administrator identity could not be confirmed.",
  });
}

export function getAdminOverview(
  signal?: AbortSignal,
): Promise<AdminOverviewResponse> {
  return adminRequest("/api/admin/overview", {
    signal,
    guard: isOverviewResponse,
    fallbackMessage: "The administrator overview could not be loaded.",
  });
}

export function getAdminSupportConversations(
  filters: AdminSupportListFilters,
  signal?: AbortSignal,
): Promise<AdminSupportListResponse> {
  const parameters = new URLSearchParams({
    page: String(filters.page),
    pageSize: "20",
    status: filters.status,
    category: filters.category,
    requester: filters.requester,
  });

  if (filters.search.trim()) {
    parameters.set("search", filters.search.trim());
  }

  return adminRequest(`/api/admin/support?${parameters.toString()}`, {
    signal,
    guard: isSupportListResponse,
    fallbackMessage: "The support inbox could not be loaded.",
  });
}

export function getAdminSupportConversation(
  referenceId: string,
  signal?: AbortSignal,
): Promise<AdminSupportThreadResponse> {
  return adminRequest(
    `/api/admin/support/${encodeURIComponent(referenceId)}`,
    {
      signal,
      guard: isSupportThreadResponse,
      fallbackMessage: "The support conversation could not be loaded.",
    },
  );
}

export function replyToAdminSupportConversation(
  referenceId: string,
  message: string,
  csrfToken: string,
): Promise<AdminSupportMutationResponse> {
  return adminRequest(
    `/api/admin/support/${encodeURIComponent(referenceId)}/messages`,
    {
      method: "POST",
      body: { message },
      csrfToken,
      guard: isSupportMutationResponse,
      fallbackMessage: "The administrator reply could not be saved.",
    },
  );
}

export function updateAdminSupportStatus(
  referenceId: string,
  status: AdminSupportStatus,
  csrfToken: string,
): Promise<AdminSupportMutationResponse> {
  return adminRequest(
    `/api/admin/support/${encodeURIComponent(referenceId)}/status`,
    {
      method: "PATCH",
      body: { status },
      csrfToken,
      guard: isSupportMutationResponse,
      fallbackMessage: "The support-request status could not be updated.",
    },
  );
}

export function getAdminPasskeys(
  signal?: AbortSignal,
): Promise<AdminPasskeysResponse> {
  return adminRequest("/api/admin/auth/passkeys", {
    signal,
    guard: isPasskeysResponse,
    fallbackMessage: "Administrator passkeys could not be loaded.",
  });
}

export function startAdminPasskeyRegistration(
  input: { label: string; attachment: "platform" | "cross-platform" },
  csrfToken: string,
): Promise<AdminPasskeyRegistrationOptionsResponse> {
  return adminRequest("/api/admin/auth/passkeys/registration/options", {
    method: "POST",
    body: input,
    csrfToken,
    guard: isPasskeyRegistrationOptionsResponse,
    fallbackMessage: "Passkey registration could not be started.",
  });
}

export function completeAdminPasskeyRegistration(
  input: {
    challengeId: string;
    response: AdminRegistrationCredential;
  },
  csrfToken: string,
): Promise<AdminPasskeyRegistrationResponse> {
  return adminRequest("/api/admin/auth/passkeys/registration/verify", {
    method: "POST",
    body: input,
    csrfToken,
    guard: isPasskeyRegistrationResponse,
    fallbackMessage: "The passkey could not be registered.",
  });
}

export function startAdminPasskeyLogin(): Promise<AdminPasskeyAuthenticationOptionsResponse> {
  return adminRequest("/api/admin/auth/passkeys/login/options", {
    method: "POST",
    body: {},
    guard: isPasskeyAuthenticationOptionsResponse,
    fallbackMessage: "Passkey verification could not be started.",
  });
}

export function completeAdminPasskeyLogin(input: {
  challengeId: string;
  response: AdminAuthenticationCredential;
}): Promise<AdminLoginResponse> {
  return adminRequest("/api/admin/auth/passkeys/login/verify", {
    method: "POST",
    body: input,
    guard: isLoginResponse,
    fallbackMessage: "The administrator passkey could not be verified.",
  });
}

export function startAdminPasskeyReauthentication(
  csrfToken: string,
): Promise<AdminPasskeyAuthenticationOptionsResponse> {
  return adminRequest(
    "/api/admin/auth/passkeys/reauthentication/options",
    {
      method: "POST",
      body: {},
      csrfToken,
      guard: isPasskeyAuthenticationOptionsResponse,
      fallbackMessage: "Passkey confirmation could not be started.",
    },
  );
}

export function completeAdminPasskeyReauthentication(
  input: {
    challengeId: string;
    response: AdminAuthenticationCredential;
  },
  csrfToken: string,
): Promise<AdminReauthenticationResponse> {
  return adminRequest(
    "/api/admin/auth/passkeys/reauthentication/verify",
    {
      method: "POST",
      body: input,
      csrfToken,
      guard: isReauthenticationResponse,
      fallbackMessage: "The administrator passkey could not be confirmed.",
    },
  );
}

export function revokeAdminPasskey(
  credentialId: string,
  csrfToken: string,
): Promise<AdminPasskeyRevokeResponse> {
  return adminRequest(
    `/api/admin/auth/passkeys/${encodeURIComponent(credentialId)}`,
    {
      method: "DELETE",
      csrfToken,
      guard: isPasskeyRevokeResponse,
      fallbackMessage: "The passkey could not be removed.",
    },
  );
}


export function getAdminUsers(
  filters: AdminUserListFilters,
  signal?: AbortSignal,
): Promise<AdminUserListResponse> {
  const parameters = new URLSearchParams({
    page: String(filters.page),
    pageSize: "20",
    status: filters.status,
    role: filters.role,
    verification: filters.verification,
  });

  if (filters.search.trim()) {
    parameters.set("search", filters.search.trim());
  }

  return adminRequest(`/api/admin/users?${parameters.toString()}`, {
    signal,
    guard: isAdminUserListResponse,
    fallbackMessage: "FilmGeezer accounts could not be loaded.",
  });
}

export function getAdminUserDetail(
  userId: string,
  signal?: AbortSignal,
): Promise<AdminUserDetailResponse> {
  return adminRequest(`/api/admin/users/${encodeURIComponent(userId)}`, {
    signal,
    guard: isAdminUserDetailResponse,
    fallbackMessage: "The FilmGeezer account could not be loaded.",
  });
}

export function suspendAdminUser(
  userId: string,
  reason: string,
  csrfToken: string,
): Promise<AdminUserMutationResponse> {
  return adminRequest(
    `/api/admin/users/${encodeURIComponent(userId)}/suspend`,
    {
      method: "POST",
      body: { reason },
      csrfToken,
      guard: isAdminUserMutationResponse,
      fallbackMessage: "The FilmGeezer account could not be suspended.",
    },
  );
}

export function reactivateAdminUser(
  userId: string,
  reason: string,
  csrfToken: string,
): Promise<AdminUserMutationResponse> {
  return adminRequest(
    `/api/admin/users/${encodeURIComponent(userId)}/reactivate`,
    {
      method: "POST",
      body: { reason },
      csrfToken,
      guard: isAdminUserMutationResponse,
      fallbackMessage: "The FilmGeezer account could not be reactivated.",
    },
  );
}

export function revokeAdminUserSession(
  userId: string,
  sessionId: string,
  csrfToken: string,
): Promise<AdminUserMutationResponse> {
  return adminRequest(
    `/api/admin/users/${encodeURIComponent(userId)}/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "DELETE",
      csrfToken,
      guard: isAdminUserMutationResponse,
      fallbackMessage: "The public FilmGeezer session could not be revoked.",
    },
  );
}

export function revokeAllAdminUserSessions(
  userId: string,
  csrfToken: string,
): Promise<AdminUserMutationResponse> {
  return adminRequest(
    `/api/admin/users/${encodeURIComponent(userId)}/sessions/revoke-all`,
    {
      method: "POST",
      csrfToken,
      guard: isAdminUserMutationResponse,
      fallbackMessage: "The public FilmGeezer sessions could not be revoked.",
    },
  );
}

export function getAdminContentEntries(
  filters: AdminContentListFilters,
  signal?: AbortSignal,
): Promise<AdminContentListResponse> {
  const parameters = new URLSearchParams({
    page: String(filters.page),
    pageSize: "20",
    mediaType: filters.mediaType,
    status: filters.status,
  });

  if (filters.search.trim()) {
    parameters.set("search", filters.search.trim());
  }

  return adminRequest(`/api/admin/content?${parameters.toString()}`, {
    signal,
    guard: isAdminContentListResponse,
    fallbackMessage: "FilmGeezer content entries could not be loaded.",
  });
}

export function searchAdminContentTmdb(
  input: {
    mediaType: "movie" | "tv";
    query: string;
    page: number;
  },
  signal?: AbortSignal,
): Promise<AdminContentTmdbSearchResponse> {
  const parameters = new URLSearchParams({
    mediaType: input.mediaType,
    query: input.query.trim(),
    page: String(input.page),
  });

  return adminRequest(
    `/api/admin/content/tmdb/search?${parameters.toString()}`,
    {
      signal,
      guard: isAdminContentTmdbSearchResponse,
      fallbackMessage: "TMDB title search could not be completed.",
    },
  );
}

export function getAdminContentEntry(
  mediaType: "movie" | "tv",
  tmdbId: number,
  signal?: AbortSignal,
): Promise<AdminContentDetailResponse> {
  return adminRequest(
    `/api/admin/content/${mediaType}/${encodeURIComponent(String(tmdbId))}`,
    {
      signal,
      guard: isAdminContentDetailResponse,
      fallbackMessage: "The FilmGeezer content entry could not be loaded.",
    },
  );
}

export function saveAdminContentEntry(
  mediaType: "movie" | "tv",
  tmdbId: number,
  input: AdminContentSaveInput,
  csrfToken: string,
): Promise<AdminContentMutationResponse> {
  return adminRequest(
    `/api/admin/content/${mediaType}/${encodeURIComponent(String(tmdbId))}`,
    {
      method: "PUT",
      body: input,
      csrfToken,
      guard: isAdminContentMutationResponse,
      fallbackMessage: "The FilmGeezer content links could not be saved.",
    },
  );
}

export function updateAdminContentEntryStatus(
  mediaType: "movie" | "tv",
  tmdbId: number,
  input: {
    expectedRevision: number;
    expectedRevisionToken: string;
    active: boolean;
    reason: string;
  },
  csrfToken: string,
): Promise<AdminContentMutationResponse> {
  return adminRequest(
    `/api/admin/content/${mediaType}/${encodeURIComponent(String(tmdbId))}/status`,
    {
      method: "PATCH",
      body: input,
      csrfToken,
      guard: isAdminContentMutationResponse,
      fallbackMessage: "The FilmGeezer content status could not be updated.",
    },
  );
}
