import type {
  AuthEmailVerificationResponse,
  AuthErrorPayload,
  AuthFieldErrorPayload,
  AuthLoginResponse,
  AuthLogoutResponse,
  AuthPasswordResetRequestResponse,
  AuthPasswordResetResponse,
  AuthRegistrationResponse,
  AuthSessionResponse,
  AuthSessionSummary,
  AuthUser,
  AuthVerificationReceipt,
  AuthVerificationResendResponse,
} from "../types/auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly payload: AuthErrorPayload;

  constructor(
    status: number,
    payload: AuthErrorPayload,
    fallbackMessage: string,
  ) {
    super(
      payload.message?.trim() ||
        fallbackMessage,
    );

    this.name = "AuthApiError";
    this.status = status;
    this.code =
      typeof payload.code === "string"
        ? payload.code
        : null;
    this.payload = payload;
  }
}

interface AuthRequestOptions {
  method?: "GET" | "POST";
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
      (
        item,
      ) =>
        typeof item ===
        "string",
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

function isAuthUser(
  value: unknown,
): value is AuthUser {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.userId ===
      "string" &&
    (value.provider ===
      "local" ||
      value.provider ===
        "clerk") &&
    typeof value.email ===
      "string" &&
    typeof value.displayName ===
      "string" &&
    isNullableString(value.profileImagePath) &&
    isStringArray(value.roles) &&
    value.roles.every(
      (
        role,
      ) =>
        role === "user" ||
        role === "admin",
    )
  );
}

function isAuthSessionSummary(
  value: unknown,
): value is AuthSessionSummary {
  if (!isRecord(value)) {
    return false;
  }

  const optionalDateFields = [
    value.createdAt,
    value.lastSeenAt,
    value.idleExpiresAt,
  ];

  return (
    typeof value.expiresAt ===
      "string" &&
    optionalDateFields.every(
      (
        field,
      ) =>
        field === undefined ||
        typeof field ===
          "string",
    )
  );
}

function isFullAuthSessionSummary(
  value: unknown,
): value is Required<AuthSessionSummary> {
  return (
    isAuthSessionSummary(value) &&
    typeof value.createdAt ===
      "string" &&
    typeof value.lastSeenAt ===
      "string" &&
    typeof value.idleExpiresAt ===
      "string"
  );
}

function isVerificationReceipt(
  value: unknown,
): value is AuthVerificationReceipt {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.challengeId ===
      "string" &&
    isNullableString(
      value.expiresAt,
    ) &&
    isNullableString(
      value.resendAvailableAt,
    )
  );
}

function isRegistrationResponse(
  value: unknown,
): value is AuthRegistrationResponse {
  return (
    isRecord(value) &&
    value.status ===
      "success" &&
    value.code ===
      "AUTH_REGISTRATION_ACCEPTED" &&
    typeof value.message ===
      "string" &&
    isVerificationReceipt(
      value.verification,
    )
  );
}

function isLoginResponse(
  value: unknown,
): value is AuthLoginResponse {
  return (
    isRecord(value) &&
    value.status ===
      "success" &&
    value.code ===
      "AUTH_LOGIN_SUCCEEDED" &&
    typeof value.message ===
      "string" &&
    isAuthUser(value.user) &&
    isAuthSessionSummary(
      value.session,
    )
  );
}

function isEmailVerificationResponse(
  value: unknown,
): value is AuthEmailVerificationResponse {
  return (
    isRecord(value) &&
    value.status ===
      "success" &&
    value.code ===
      "AUTH_EMAIL_VERIFIED" &&
    typeof value.message ===
      "string" &&
    typeof value.verifiedAt ===
      "string" &&
    isAuthUser(value.user) &&
    isAuthSessionSummary(
      value.session,
    )
  );
}

function isVerificationResendResponse(
  value: unknown,
): value is AuthVerificationResendResponse {
  return (
    isRecord(value) &&
    value.status ===
      "success" &&
    value.code ===
      "AUTH_VERIFICATION_RESEND_ACCEPTED" &&
    typeof value.message ===
      "string" &&
    isVerificationReceipt(
      value.verification,
    )
  );
}

function isSessionResponse(
  value: unknown,
): value is AuthSessionResponse {
  return (
    isRecord(value) &&
    value.status ===
      "success" &&
    value.code ===
      "AUTH_SESSION_ACTIVE" &&
    isAuthUser(value.user) &&
    isFullAuthSessionSummary(
      value.session,
    ) &&
    typeof value.csrfToken ===
      "string"
  );
}

function isLogoutResponse(
  value: unknown,
): value is AuthLogoutResponse {
  return (
    isRecord(value) &&
    value.status ===
      "success" &&
    (value.code ===
      "AUTH_LOGOUT_SUCCEEDED" ||
      value.code ===
        "AUTH_LOGOUT_ALL_SUCCEEDED") &&
    typeof value.message ===
      "string" &&
    typeof value.sessionsRevoked ===
      "number"
  );
}

function isPasswordResetRequestResponse(
  value: unknown,
): value is AuthPasswordResetRequestResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code ===
      "AUTH_PASSWORD_RESET_REQUEST_ACCEPTED" &&
    typeof value.message === "string" &&
    typeof value.acceptedAt === "string"
  );
}

function isPasswordResetResponse(
  value: unknown,
): value is AuthPasswordResetResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code ===
      "AUTH_PASSWORD_RESET_COMPLETED" &&
    typeof value.message === "string" &&
    typeof value.resetAt === "string" &&
    typeof value.sessionsRevoked === "number"
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
      .includes(
        "application/json",
      )
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

async function requestAuthApi<T>(
  path: string,
  guard: PayloadGuard<T>,
  options: AuthRequestOptions = {},
): Promise<T> {
  const headers =
    new Headers();

  if (
    options.body !==
    undefined
  ) {
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
          options.method ??
          "GET",

        headers,

        body:
          options.body ===
          undefined
            ? undefined
            : JSON.stringify(
                options.body,
              ),

        credentials:
          "include",

        cache:
          "no-store",

        signal:
          options.signal,
      },
    );
  } catch (error) {
    if (
      error instanceof
        DOMException &&
      error.name === "AbortError"
    ) {
      throw error;
    }

    throw new AuthApiError(
      0,
      {},
      "FilmGeezer could not reach the authentication service.",
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
      "The authentication request could not be completed.",
    );
  }

  if (!guard(payload)) {
    throw new AuthApiError(
      response.status,
      {},
      "FilmGeezer received an invalid authentication response.",
    );
  }

  return payload;
}

export function getAuthFieldErrors(
  error: unknown,
  fieldName: string,
): string[] {
  if (
    !(error instanceof
      AuthApiError)
  ) {
    return [];
  }

  const details:
    AuthFieldErrorPayload | undefined =
      error.payload.errors;

  const messages =
    details?.fields?.[
      fieldName
    ];

  return Array.isArray(
    messages,
  )
    ? messages.filter(
        (
          message,
        ): message is string =>
          typeof message ===
            "string" &&
          message.trim()
            .length > 0,
      )
    : [];
}

export function getAuthFormErrors(
  error: unknown,
): string[] {
  if (
    !(error instanceof
      AuthApiError)
  ) {
    return [];
  }

  const messages =
    error.payload.errors
      ?.form;

  return Array.isArray(
    messages,
  )
    ? messages.filter(
        (
          message,
        ): message is string =>
          typeof message ===
            "string" &&
          message.trim()
            .length > 0,
      )
    : [];
}

export async function getCurrentAuthSession(
  signal?: AbortSignal,
): Promise<AuthSessionResponse> {
  return requestAuthApi(
    "/api/auth/session",
    isSessionResponse,
    {
      signal,
    },
  );
}

export async function registerLocalAccount(
  input: {
    email: string;
    displayName: string;
    password: string;
  },
): Promise<AuthRegistrationResponse> {
  return requestAuthApi(
    "/api/auth/register",
    isRegistrationResponse,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function loginLocalAccount(
  input: {
    email: string;
    password: string;
  },
): Promise<AuthLoginResponse> {
  return requestAuthApi(
    "/api/auth/login",
    isLoginResponse,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function verifyLocalEmail(
  input: {
    challengeId: string;
    code: string;
  },
): Promise<AuthEmailVerificationResponse> {
  return requestAuthApi(
    "/api/auth/verify-email",
    isEmailVerificationResponse,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function resendLocalEmailVerification(
  input: {
    challengeId: string;
  },
): Promise<AuthVerificationResendResponse> {
  return requestAuthApi(
    "/api/auth/resend-verification",
    isVerificationResendResponse,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function requestLocalPasswordReset(
  input: {
    email: string;
  },
): Promise<AuthPasswordResetRequestResponse> {
  return requestAuthApi(
    "/api/auth/forgot-password",
    isPasswordResetRequestResponse,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function resetLocalPassword(
  input: {
    challengeId: string;
    token: string;
    password: string;
  },
): Promise<AuthPasswordResetResponse> {
  return requestAuthApi(
    "/api/auth/reset-password",
    isPasswordResetResponse,
    {
      method: "POST",
      body: input,
    },
  );
}

export async function logoutCurrentSession(
  csrfToken: string,
): Promise<AuthLogoutResponse> {
  return requestAuthApi(
    "/api/auth/logout",
    isLogoutResponse,
    {
      method: "POST",
      csrfToken,
    },
  );
}

export async function logoutAllSessions(
  csrfToken: string,
): Promise<AuthLogoutResponse> {
  return requestAuthApi(
    "/api/auth/logout-all",
    isLogoutResponse,
    {
      method: "POST",
      csrfToken,
    },
  );
}
