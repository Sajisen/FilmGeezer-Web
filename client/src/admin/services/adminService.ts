import type {
  AdminErrorPayload,
  AdminLoginResponse,
  AdminOverviewResponse,
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
  if (!isRecord(value)) {
    return false;
  }

  return (
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
  if (!isRecord(value)) {
    return false;
  }

  return [
    value.createdAt,
    value.lastSeenAt,
    value.idleExpiresAt,
    value.expiresAt,
  ].every((item) => typeof item === "string");
}

function isSessionResponse(value: unknown): value is AdminSessionResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_SESSION_ACTIVE" &&
    isAdminUser(value.user) &&
    isAdminSessionSummary(value.session) &&
    typeof value.csrfToken === "string"
  );
}

function isLoginResponse(value: unknown): value is AdminLoginResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ADMIN_LOGIN_SUCCEEDED" &&
    typeof value.message === "string" &&
    isAdminUser(value.user) &&
    isAdminSessionSummary(value.session) &&
    typeof value.csrfToken === "string"
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

  const messagesAreValid = value.messages.every(
    (message) =>
      isRecord(message) &&
      typeof message.id === "string" &&
      typeof message.senderRole === "string" &&
      SUPPORT_SENDER_ROLES.includes(
        message.senderRole as AdminSupportSenderRole,
      ) &&
      typeof message.body === "string" &&
      typeof message.createdAt === "string",
  );

  return (
    messagesAreValid &&
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
    method?: "GET" | "POST" | "PATCH";
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
}): Promise<AdminLoginResponse> {
  return adminRequest("/api/admin/auth/login", {
    method: "POST",
    body: input,
    guard: isLoginResponse,
    fallbackMessage: "Administrator sign-in could not be completed.",
  });
}

export async function logoutAdmin(csrfToken: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/auth/logout`, {
    method: "POST",
    credentials: "include",
    headers: {
      "X-Admin-CSRF-Token": csrfToken,
    },
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
