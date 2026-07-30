import {
  AuthApiError,
} from "./authService";

import type {
  AuthErrorPayload,
  AuthRole,
  AuthSessionSummary,
  AuthUser,
} from "../types/auth";

import type {
  AccountDetailsResponse,
  AccountPasswordChangeResponse,
  AccountProfileUpdateResponse,
  AccountSecuritySummary,
  AccountSummary,
  RecentAuthenticationResponse,
} from "../types/account";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

interface AccountRequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  csrfToken?: string | null;
  signal?: AbortSignal;
}

type PayloadGuard<T> = (
  value: unknown,
) => value is T;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function isStringArray(
  value: unknown,
): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string",
    )
  );
}

function isNullableString(
  value: unknown,
): value is string | null {
  return (
    value === null ||
    typeof value === "string"
  );
}

function isRoles(
  value: unknown,
): value is AuthRole[] {
  return (
    isStringArray(value) &&
    value.every(
      (role) =>
        role === "user" ||
        role === "admin",
    )
  );
}

function isAuthUser(
  value: unknown,
): value is AuthUser {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.userId === "string" &&
    value.provider === "local" &&
    typeof value.email === "string" &&
    typeof value.displayName === "string" &&
    isRoles(value.roles)
  );
}

function isSessionSummary(
  value: unknown,
): value is AuthSessionSummary {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.expiresAt === "string" &&
    (
      value.createdAt === undefined ||
      typeof value.createdAt === "string"
    ) &&
    (
      value.lastSeenAt === undefined ||
      typeof value.lastSeenAt === "string"
    ) &&
    (
      value.idleExpiresAt === undefined ||
      typeof value.idleExpiresAt === "string"
    )
  );
}

function isFullSessionSummary(
  value: unknown,
): value is Required<AuthSessionSummary> {
  return (
    isSessionSummary(value) &&
    typeof value.createdAt === "string" &&
    typeof value.lastSeenAt === "string" &&
    typeof value.idleExpiresAt === "string"
  );
}

function isAccountSummary(
  value: unknown,
): value is AccountSummary {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.userId === "string" &&
    value.provider === "local" &&
    typeof value.email === "string" &&
    typeof value.displayName === "string" &&
    isRoles(value.roles) &&
    typeof value.emailVerifiedAt === "string" &&
    typeof value.memberSince === "string" &&
    isNullableString(value.lastLoginAt)
  );
}

function isAccountSecuritySummary(
  value: unknown,
): value is AccountSecuritySummary {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.passwordChangedAt === "string" &&
    isNullableString(
      value.recentAuthenticationExpiresAt,
    )
  );
}

function isAccountDetailsResponse(
  value: unknown,
): value is AccountDetailsResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ACCOUNT_DETAILS_READY" &&
    isAccountSummary(value.account) &&
    isAccountSecuritySummary(value.security) &&
    isFullSessionSummary(value.session)
  );
}

function isAccountProfileUpdateResponse(
  value: unknown,
): value is AccountProfileUpdateResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ACCOUNT_PROFILE_UPDATED" &&
    typeof value.message === "string" &&
    typeof value.changed === "boolean" &&
    isAuthUser(value.user)
  );
}

function isRecentAuthenticationResponse(
  value: unknown,
): value is RecentAuthenticationResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code ===
      "AUTH_RECENT_AUTHENTICATION_CONFIRMED" &&
    typeof value.message === "string" &&
    typeof value.confirmedAt === "string" &&
    typeof value.expiresAt === "string"
  );
}

function isAccountPasswordChangeResponse(
  value: unknown,
): value is AccountPasswordChangeResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ACCOUNT_PASSWORD_CHANGED" &&
    typeof value.message === "string" &&
    typeof value.changedAt === "string" &&
    typeof value.sessionsRevoked === "number" &&
    isAuthUser(value.user) &&
    isSessionSummary(value.session)
  );
}

async function readJsonResponse(
  response: Response,
): Promise<unknown> {
  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";

  if (
    !contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asErrorPayload(
  value: unknown,
): AuthErrorPayload {
  return isRecord(value)
    ? (value as AuthErrorPayload)
    : {};
}

async function requestAccountApi<T>(
  path: string,
  guard: PayloadGuard<T>,
  options: AccountRequestOptions = {},
): Promise<T> {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  if (options.csrfToken) {
    headers.set(
      "X-CSRF-Token",
      options.csrfToken,
    );
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        method:
          options.method ?? "GET",
        headers,
        body:
          options.body === undefined
            ? undefined
            : JSON.stringify(
                options.body,
              ),
        credentials: "include",
        cache: "no-store",
        signal: options.signal,
      },
    );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new AuthApiError(
      0,
      {},
      "FilmGeezer could not reach the account service.",
    );
  }

  const payload =
    await readJsonResponse(
      response,
    );

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      asErrorPayload(payload),
      "The account request could not be completed.",
    );
  }

  if (!guard(payload)) {
    throw new AuthApiError(
      response.status,
      {},
      "FilmGeezer received an invalid account response.",
    );
  }

  return payload;
}

export function getAccountDetails(
  signal?: AbortSignal,
): Promise<AccountDetailsResponse> {
  return requestAccountApi(
    "/api/account",
    isAccountDetailsResponse,
    {
      signal,
    },
  );
}

export function updateAccountProfile(
  input: {
    displayName: string;
  },
  csrfToken: string,
): Promise<AccountProfileUpdateResponse> {
  return requestAccountApi(
    "/api/account/profile",
    isAccountProfileUpdateResponse,
    {
      method: "PATCH",
      body: input,
      csrfToken,
    },
  );
}

export function confirmAccountPassword(
  input: {
    password: string;
  },
  csrfToken: string,
): Promise<RecentAuthenticationResponse> {
  return requestAccountApi(
    "/api/account/confirm-password",
    isRecentAuthenticationResponse,
    {
      method: "POST",
      body: input,
      csrfToken,
    },
  );
}

export function changeAccountPassword(
  input: {
    newPassword: string;
  },
  csrfToken: string,
): Promise<AccountPasswordChangeResponse> {
  return requestAccountApi(
    "/api/account/change-password",
    isAccountPasswordChangeResponse,
    {
      method: "POST",
      body: input,
      csrfToken,
    },
  );
}
