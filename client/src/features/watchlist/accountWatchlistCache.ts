import type {
  AccountWatchlistItem,
} from "../../types/watchlist";

const ACCOUNT_WATCHLIST_CACHE_VERSION = 1;
const ACCOUNT_WATCHLIST_CACHE_PREFIX =
  "filmgeezer.watchlist.cache";
const ACCOUNT_WATCHLIST_DEFAULT_MAX_ITEMS = 50;
const ACCOUNT_WATCHLIST_MAXIMUM_REASONABLE_ITEMS = 500;

interface StoredAccountWatchlistCache {
  version: number;
  userId: string;
  items: AccountWatchlistItem[];
  maximumItems: number;
  updatedAt: string | null;
  cachedAt: string;
}

export interface AccountWatchlistCacheSnapshot {
  items: AccountWatchlistItem[];
  maximumItems: number;
  updatedAt: string | null;
  cacheAvailable: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function createEmptySnapshot(
  cacheAvailable: boolean,
): AccountWatchlistCacheSnapshot {
  return {
    items: [],
    maximumItems: ACCOUNT_WATCHLIST_DEFAULT_MAX_ITEMS,
    updatedAt: null,
    cacheAvailable,
  };
}

function isValidMaximumItems(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= ACCOUNT_WATCHLIST_MAXIMUM_REASONABLE_ITEMS
  );
}

function normalizeNullableDate(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString()
    : undefined;
}

function parseItem(value: unknown): AccountWatchlistItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const year = typeof value.year === "string" ? value.year.trim() : "";
  const addedAtTime =
    typeof value.addedAt === "string" ? Date.parse(value.addedAt) : NaN;

  if (
    (value.mediaType !== "movie" && value.mediaType !== "tv") ||
    typeof value.tmdbId !== "number" ||
    !Number.isSafeInteger(value.tmdbId) ||
    value.tmdbId <= 0 ||
    !title ||
    title.length > 240 ||
    typeof value.posterUrl !== "string" ||
    value.posterUrl.length > 512 ||
    year.length > 32 ||
    !Number.isFinite(addedAtTime)
  ) {
    return null;
  }

  return {
    mediaType: value.mediaType,
    tmdbId: value.tmdbId,
    title,
    posterUrl: value.posterUrl,
    year,
    addedAt: new Date(addedAtTime).toISOString(),
  };
}

function normalizeItems(
  values: unknown[],
  maximumItems: number,
): AccountWatchlistItem[] {
  const uniqueItems = new Map<string, AccountWatchlistItem>();

  for (const value of values) {
    const item = parseItem(value);

    if (!item) {
      continue;
    }

    const key = `${item.mediaType}:${item.tmdbId}`;
    const existingItem = uniqueItems.get(key);

    if (
      !existingItem ||
      Date.parse(item.addedAt) > Date.parse(existingItem.addedAt)
    ) {
      uniqueItems.set(key, item);
    }
  }

  return Array.from(uniqueItems.values())
    .sort(
      (firstItem, secondItem) =>
        Date.parse(secondItem.addedAt) - Date.parse(firstItem.addedAt),
    )
    .slice(0, maximumItems);
}

export function getAccountWatchlistCacheKey(userId: string): string {
  return `${ACCOUNT_WATCHLIST_CACHE_PREFIX}.${userId}.v1`;
}

export function loadAccountWatchlistCache(
  userId: string,
): AccountWatchlistCacheSnapshot {
  const storage = getStorage();

  if (!storage) {
    return createEmptySnapshot(false);
  }

  const cacheKey = getAccountWatchlistCacheKey(userId);

  try {
    const rawValue = storage.getItem(cacheKey);

    if (!rawValue) {
      return createEmptySnapshot(true);
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!isRecord(parsedValue)) {
      storage.removeItem(cacheKey);
      return createEmptySnapshot(true);
    }

    const value = parsedValue as Partial<StoredAccountWatchlistCache>;
    const normalizedUpdatedAt = normalizeNullableDate(value.updatedAt);

    if (
      value.version !== ACCOUNT_WATCHLIST_CACHE_VERSION ||
      value.userId !== userId ||
      !Array.isArray(value.items) ||
      !isValidMaximumItems(value.maximumItems) ||
      normalizedUpdatedAt === undefined
    ) {
      storage.removeItem(cacheKey);
      return createEmptySnapshot(true);
    }

    return {
      items: normalizeItems(value.items, value.maximumItems),
      maximumItems: value.maximumItems,
      updatedAt: normalizedUpdatedAt,
      cacheAvailable: true,
    };
  } catch {
    return createEmptySnapshot(false);
  }
}

export function saveAccountWatchlistCache(input: {
  userId: string;
  items: AccountWatchlistItem[];
  maximumItems: number;
  updatedAt: string | null;
}): boolean {
  const storage = getStorage();

  if (!storage || !isValidMaximumItems(input.maximumItems)) {
    return false;
  }

  try {
    const payload: StoredAccountWatchlistCache = {
      version: ACCOUNT_WATCHLIST_CACHE_VERSION,
      userId: input.userId,
      items: normalizeItems(input.items, input.maximumItems),
      maximumItems: input.maximumItems,
      updatedAt: input.updatedAt,
      cachedAt: new Date().toISOString(),
    };

    storage.setItem(
      getAccountWatchlistCacheKey(input.userId),
      JSON.stringify(payload),
    );

    return true;
  } catch {
    return false;
  }
}
