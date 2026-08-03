import type {
  AdminErrorPayload,
  AdminLoginResponse,
  AdminOverviewResponse,
  AdminSessionResponse,
  AdminSessionSummary,
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
    method?: "GET" | "POST";
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