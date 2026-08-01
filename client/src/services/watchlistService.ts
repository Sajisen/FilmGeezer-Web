import type {
  AccountWatchlistItem,
  GuestWatchlistItem,
  WatchlistCandidate,
  WatchlistMergeResponse,
  WatchlistMutationResponse,
  WatchlistSnapshotResponse,
} from "../types/watchlist";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface WatchlistErrorPayload {
  code?: unknown;
  message?: unknown;
  maximumItems?: unknown;
}

interface WatchlistRequestOptions {
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  csrfToken?: string | null;
  signal?: AbortSignal;
}

type PayloadGuard<T> = (value: unknown) => value is T;

export class WatchlistApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly maximumItems: number | null;

  constructor(
    status: number,
    payload: WatchlistErrorPayload,
    fallbackMessage: string,
  ) {
    super(
      typeof payload.message === "string" && payload.message.trim()
        ? payload.message
        : fallbackMessage,
    );

    this.name = "WatchlistApiError";
    this.status = status;
    this.code =
      typeof payload.code === "string" ? payload.code : null;
    this.maximumItems =
      typeof payload.maximumItems === "number"
        ? payload.maximumItems
        : null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableIsoDate(value: unknown): value is string | null {
  return (
    value === null ||
    (typeof value === "string" && Number.isFinite(Date.parse(value)))
  );
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

function isAccountWatchlistItem(
  value: unknown,
): value is AccountWatchlistItem {
  if (!isRecord(value)) {
    return false;
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";

  return (
    (value.mediaType === "movie" || value.mediaType === "tv") &&
    typeof value.tmdbId === "number" &&
    Number.isSafeInteger(value.tmdbId) &&
    value.tmdbId > 0 &&
    title.length > 0 &&
    title.length <= 240 &&
    typeof value.posterUrl === "string" &&
    value.posterUrl.length <= 512 &&
    typeof value.year === "string" &&
    value.year.length <= 32 &&
    typeof value.addedAt === "string" &&
    Number.isFinite(Date.parse(value.addedAt))
  );
}

function isSnapshotResponse(
  value: unknown,
): value is WatchlistSnapshotResponse {
  if (
    !isRecord(value) ||
    value.status !== "success" ||
    typeof value.code !== "string" ||
    !Array.isArray(value.items) ||
    !value.items.every(isAccountWatchlistItem) ||
    typeof value.maximumItems !== "number" ||
    !Number.isSafeInteger(value.maximumItems) ||
    value.maximumItems <= 0 ||
    value.maximumItems > 500 ||
    value.items.length > value.maximumItems ||
    !isNullableIsoDate(value.updatedAt)
  ) {
    return false;
  }

  const identities = new Set<string>();

  for (const item of value.items) {
    const key = `${item.mediaType}:${item.tmdbId}`;

    if (identities.has(key)) {
      return false;
    }

    identities.add(key);
  }

  return true;
}

function isMutationResponse(
  value: unknown,
): value is WatchlistMutationResponse {
  if (!isSnapshotResponse(value) || !isRecord(value)) {
    return false;
  }

  return (
    typeof value.message === "string" &&
    typeof value.changed === "boolean"
  );
}

function isMergeResponse(value: unknown): value is WatchlistMergeResponse {
  if (!isSnapshotResponse(value) || !isRecord(value)) {
    return false;
  }

  return (
    value.code === "WATCHLIST_GUEST_ITEMS_MERGED" &&
    typeof value.message === "string" &&
    isNonNegativeSafeInteger(value.addedCount) &&
    isNonNegativeSafeInteger(value.duplicateCount) &&
    isNonNegativeSafeInteger(value.skippedForLimitCount)
  );
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asErrorPayload(value: unknown): WatchlistErrorPayload {
  return isRecord(value) ? value : {};
}

async function requestWatchlistApi<T>(
  path: string,
  guard: PayloadGuard<T>,
  options: WatchlistRequestOptions = {},
): Promise<T> {
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.csrfToken) {
    headers.set("X-CSRF-Token", options.csrfToken);
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body === undefined
          ? undefined
          : JSON.stringify(options.body),
      credentials: "include",
      cache: "no-store",
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw error;
    }

    throw new WatchlistApiError(
      0,
      {},
      "FilmGeezer could not reach the Watchlist service.",
    );
  }

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new WatchlistApiError(
      response.status,
      asErrorPayload(payload),
      "The Watchlist request could not be completed.",
    );
  }

  if (!guard(payload)) {
    throw new WatchlistApiError(
      response.status,
      {},
      "FilmGeezer received an invalid Watchlist response.",
    );
  }

  return payload;
}

export function getAccountWatchlist(
  signal?: AbortSignal,
): Promise<WatchlistSnapshotResponse> {
  return requestWatchlistApi(
    "/api/watchlist",
    isSnapshotResponse,
    { signal },
  );
}

export function addAccountWatchlistItem(
  item: WatchlistCandidate,
  csrfToken: string,
): Promise<WatchlistMutationResponse> {
  return requestWatchlistApi(
    "/api/watchlist/items",
    isMutationResponse,
    {
      method: "POST",
      body: item,
      csrfToken,
    },
  );
}

export function removeAccountWatchlistItem(
  mediaType: WatchlistCandidate["mediaType"],
  tmdbId: number,
  csrfToken: string,
): Promise<WatchlistMutationResponse> {
  return requestWatchlistApi(
    `/api/watchlist/items/${encodeURIComponent(mediaType)}/${encodeURIComponent(String(tmdbId))}`,
    isMutationResponse,
    {
      method: "DELETE",
      csrfToken,
    },
  );
}

export function clearAccountWatchlist(
  csrfToken: string,
): Promise<WatchlistMutationResponse> {
  return requestWatchlistApi(
    "/api/watchlist",
    isMutationResponse,
    {
      method: "DELETE",
      csrfToken,
    },
  );
}

export function mergeGuestWatchlistIntoAccount(
  items: GuestWatchlistItem[],
  csrfToken: string,
  signal?: AbortSignal,
): Promise<WatchlistMergeResponse> {
  return requestWatchlistApi(
    "/api/watchlist/merge",
    isMergeResponse,
    {
      method: "POST",
      body: {
        items: items.map((item) => ({
          mediaType: item.mediaType,
          tmdbId: item.tmdbId,
          title: item.title,
          posterUrl: item.posterUrl,
          year: item.year,
          addedAt: item.addedAt,
        })),
      },
      csrfToken,
      signal,
    },
  );
}
