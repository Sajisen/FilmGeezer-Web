import {
  AuthApiError,
} from "./authService";

import type {
  AuthErrorPayload,
} from "../types/auth";
import type {
  EmailPreferences,
  EmailPreferencesResponse,
  EmailPreferencesUpdateResponse,
  EmailPreferencesValues,
} from "../types/emailPreferences";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null
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

function isEmailPreferences(
  value: unknown,
): value is EmailPreferences {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value
      .recommendationsAndDiscoveryEmailsEnabled ===
      "boolean" &&
    typeof value.productUpdatesEmailsEnabled ===
      "boolean" &&
    typeof value.revision === "number" &&
    Number.isInteger(value.revision) &&
    value.revision >= 0 &&
    isNullableString(value.updatedAt)
  );
}

function isEmailPreferencesResponse(
  value: unknown,
): value is EmailPreferencesResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code ===
      "ACCOUNT_EMAIL_PREFERENCES_READY" &&
    isEmailPreferences(value.preferences)
  );
}

function isEmailPreferencesUpdateResponse(
  value: unknown,
): value is EmailPreferencesUpdateResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code ===
      "ACCOUNT_EMAIL_PREFERENCES_UPDATED" &&
    typeof value.message === "string" &&
    typeof value.changed === "boolean" &&
    isEmailPreferences(value.preferences)
  );
}

function asErrorPayload(
  value: unknown,
): AuthErrorPayload {
  return isRecord(value)
    ? (value as AuthErrorPayload)
    : {};
}

async function readJsonResponse(
  response: Response,
): Promise<unknown> {
  const contentType =
    response.headers.get("content-type") ?? "";

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

export async function getEmailPreferences(
  signal?: AbortSignal,
): Promise<EmailPreferencesResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/account/email-preferences`,
      {
        credentials: "include",
        cache: "no-store",
        signal,
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
      "FilmGeezer could not reach the email preference service.",
    );
  }

  const payload =
    await readJsonResponse(response);

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      asErrorPayload(payload),
      "Your email preferences could not be loaded.",
    );
  }

  if (
    !isEmailPreferencesResponse(payload)
  ) {
    throw new AuthApiError(
      response.status,
      {},
      "FilmGeezer received an invalid email preference response.",
    );
  }

  return payload;
}

export async function updateEmailPreferences(
  input: EmailPreferencesValues & {
    revision: number;
  },
  csrfToken: string,
): Promise<EmailPreferencesUpdateResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/account/email-preferences`,
      {
        method: "PUT",
        credentials: "include",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(input),
      },
    );
  } catch {
    throw new AuthApiError(
      0,
      {},
      "FilmGeezer could not reach the email preference service.",
    );
  }

  const payload =
    await readJsonResponse(response);

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      asErrorPayload(payload),
      "Your email preferences could not be saved.",
    );
  }

  if (
    !isEmailPreferencesUpdateResponse(
      payload,
    )
  ) {
    throw new AuthApiError(
      response.status,
      {},
      "FilmGeezer received an invalid email preference response.",
    );
  }

  return payload;
}
