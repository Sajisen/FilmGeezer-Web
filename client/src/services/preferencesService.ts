import {
  AuthApiError,
} from "./authService";

import type {
  AuthErrorPayload,
} from "../types/auth";

import type {
  EntertainmentPreferenceOptions,
  EntertainmentPreferences,
  EntertainmentPreferencesResponse,
  EntertainmentPreferencesUpdateResponse,
  EntertainmentPreferencesValues,
  PreferenceCategory,
  PreferenceGenre,
  PreferenceLanguage,
  PreferenceOption,
} from "../types/preferences";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

const CATEGORY_VALUES = new Set<PreferenceCategory>([
  "movie",
  "tv",
  "anime",
  "kdrama",
]);

const GENRE_VALUES = new Set<PreferenceGenre>([
  "Action",
  "Action & Adventure",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Kids",
  "Music",
  "Mystery",
  "Reality",
  "Romance",
  "Sci-Fi & Fantasy",
  "Science Fiction",
  "Thriller",
  "War",
  "War & Politics",
  "Western",
]);

const LANGUAGE_VALUES = new Set<PreferenceLanguage>([
  "en",
  "ko",
  "ja",
  "hi",
  "ta",
  "te",
  "si",
  "zh",
  "es",
  "fr",
  "de",
  "it",
  "pt",
  "th",
  "tr",
  "id",
  "ml",
]);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableString(
  value: unknown,
): value is string | null {
  return value === null || typeof value === "string";
}

function isStringArray<T extends string>(
  value: unknown,
  allowedValues: Set<T>,
): value is T[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "string" &&
        allowedValues.has(item as T),
    )
  );
}

function isPreferences(
  value: unknown,
): value is EntertainmentPreferences {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.personalizationEnabled === "boolean" &&
    isStringArray(value.preferredCategories, CATEGORY_VALUES) &&
    isStringArray(value.preferredGenres, GENRE_VALUES) &&
    isStringArray(value.hiddenGenres, GENRE_VALUES) &&
    isStringArray(value.preferredLanguages, LANGUAGE_VALUES) &&
    typeof value.revision === "number" &&
    Number.isInteger(value.revision) &&
    value.revision >= 0 &&
    isNullableString(value.updatedAt)
  );
}

function isOption<T extends string>(
  value: unknown,
  allowedValues: Set<T>,
): value is PreferenceOption<T> {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.value === "string" &&
    allowedValues.has(value.value as T) &&
    typeof value.label === "string" &&
    (
      value.description === undefined ||
      typeof value.description === "string"
    )
  );
}

function isOptions(
  value: unknown,
): value is EntertainmentPreferenceOptions {
  if (!isRecord(value) || !isRecord(value.limits)) {
    return false;
  }

  return (
    typeof value.limits.maximumPreferredGenres === "number" &&
    typeof value.limits.maximumHiddenGenres === "number" &&
    typeof value.limits.maximumPreferredLanguages === "number" &&
    Array.isArray(value.categories) &&
    value.categories.every((item) => isOption(item, CATEGORY_VALUES)) &&
    Array.isArray(value.genres) &&
    value.genres.every((item) => isOption(item, GENRE_VALUES)) &&
    Array.isArray(value.languages) &&
    value.languages.every((item) => isOption(item, LANGUAGE_VALUES))
  );
}

function isPreferencesResponse(
  value: unknown,
): value is EntertainmentPreferencesResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ACCOUNT_PREFERENCES_READY" &&
    isPreferences(value.preferences) &&
    isOptions(value.options)
  );
}

function isPreferencesUpdateResponse(
  value: unknown,
): value is EntertainmentPreferencesUpdateResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ACCOUNT_PREFERENCES_UPDATED" &&
    typeof value.message === "string" &&
    typeof value.changed === "boolean" &&
    isPreferences(value.preferences) &&
    isOptions(value.options)
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

  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function getEntertainmentPreferences(
  signal?: AbortSignal,
): Promise<EntertainmentPreferencesResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/account/preferences`,
      {
        credentials: "include",
        cache: "no-store",
        signal,
      },
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new AuthApiError(
      0,
      {},
      "FilmGeezer could not reach the preference service.",
    );
  }

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      asErrorPayload(payload),
      "Your entertainment choices could not be loaded.",
    );
  }

  if (!isPreferencesResponse(payload)) {
    throw new AuthApiError(
      response.status,
      {},
      "FilmGeezer received an invalid preference response.",
    );
  }

  return payload;
}

export async function updateEntertainmentPreferences(
  input: EntertainmentPreferencesValues & { revision: number },
  csrfToken: string,
): Promise<EntertainmentPreferencesUpdateResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/account/preferences`,
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
      "FilmGeezer could not reach the preference service.",
    );
  }

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new AuthApiError(
      response.status,
      asErrorPayload(payload),
      "Your entertainment choices could not be saved.",
    );
  }

  if (!isPreferencesUpdateResponse(payload)) {
    throw new AuthApiError(
      response.status,
      {},
      "FilmGeezer received an invalid preference response.",
    );
  }

  return payload;
}
