import type {
  WatchlistCandidate,
  WatchlistItem,
} from "../../types/watchlist";

export const GUEST_WATCHLIST_STORAGE_KEY =
  "filmgeezer.watchlist.guest.v1";

export const GUEST_WATCHLIST_MAX_ITEMS = 20;
export const GUEST_WATCHLIST_EXPIRY_DAYS = 7;

const GUEST_WATCHLIST_VERSION = 1;
const GUEST_WATCHLIST_TTL_MS =
  GUEST_WATCHLIST_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

interface StoredGuestWatchlist {
  version: number;
  items: WatchlistItem[];
}

export interface GuestWatchlistSnapshot {
  items: WatchlistItem[];
  storageAvailable: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createIdentityKey(
  mediaType: WatchlistItem["mediaType"],
  tmdbId: number,
): string {
  return `${mediaType}:${tmdbId}`;
}

function parseStoredItem(
  value: unknown,
  now: number,
): WatchlistItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    mediaType,
    tmdbId,
    title,
    posterUrl,
    year,
    addedAt,
    expiresAt,
  } = value;

  if (
    (mediaType !== "movie" && mediaType !== "tv") ||
    typeof tmdbId !== "number" ||
    !Number.isSafeInteger(tmdbId) ||
    tmdbId <= 0 ||
    typeof title !== "string" ||
    typeof posterUrl !== "string" ||
    typeof year !== "string" ||
    typeof addedAt !== "string" ||
    typeof expiresAt !== "string"
  ) {
    return null;
  }

  const trimmedTitle = title.trim();
  const addedAtTime = Date.parse(addedAt);
  const expiresAtTime = Date.parse(expiresAt);

  if (
    !trimmedTitle ||
    trimmedTitle.length > 240 ||
    posterUrl.length > 2_048 ||
    year.length > 32 ||
    !Number.isFinite(addedAtTime) ||
    !Number.isFinite(expiresAtTime) ||
    expiresAtTime <= addedAtTime ||
    expiresAtTime <= now
  ) {
    return null;
  }

  return {
    mediaType,
    tmdbId,
    title: trimmedTitle,
    posterUrl,
    year: year.trim(),
    addedAt: new Date(addedAtTime).toISOString(),
    expiresAt: new Date(expiresAtTime).toISOString(),
  };
}

function normalizeItems(
  values: unknown[],
  now: number,
): WatchlistItem[] {
  const uniqueItems = new Map<string, WatchlistItem>();

  for (const value of values) {
    const item = parseStoredItem(value, now);

    if (!item) {
      continue;
    }

    const identityKey = createIdentityKey(
      item.mediaType,
      item.tmdbId,
    );

    const existingItem = uniqueItems.get(identityKey);

    if (
      !existingItem ||
      Date.parse(item.addedAt) > Date.parse(existingItem.addedAt)
    ) {
      uniqueItems.set(identityKey, item);
    }
  }

  return Array.from(uniqueItems.values())
    .sort(
      (firstItem, secondItem) =>
        Date.parse(secondItem.addedAt) -
        Date.parse(firstItem.addedAt),
    )
    .slice(0, GUEST_WATCHLIST_MAX_ITEMS);
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadGuestWatchlist(
  now: number = Date.now(),
): GuestWatchlistSnapshot {
  const storage = getBrowserStorage();

  if (!storage) {
    return {
      items: [],
      storageAvailable: false,
    };
  }

  try {
    const rawValue = storage.getItem(
      GUEST_WATCHLIST_STORAGE_KEY,
    );

    if (!rawValue) {
      return {
        items: [],
        storageAvailable: true,
      };
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!isRecord(parsedValue)) {
      storage.removeItem(GUEST_WATCHLIST_STORAGE_KEY);

      return {
        items: [],
        storageAvailable: true,
      };
    }

    const storedWatchlist = parsedValue as Partial<StoredGuestWatchlist>;

    if (
      storedWatchlist.version !== GUEST_WATCHLIST_VERSION ||
      !Array.isArray(storedWatchlist.items)
    ) {
      storage.removeItem(GUEST_WATCHLIST_STORAGE_KEY);

      return {
        items: [],
        storageAvailable: true,
      };
    }

    const items = normalizeItems(storedWatchlist.items, now);

    if (items.length !== storedWatchlist.items.length) {
      saveGuestWatchlist(items);
    }

    return {
      items,
      storageAvailable: true,
    };
  } catch {
    return {
      items: [],
      storageAvailable: false,
    };
  }
}

export function saveGuestWatchlist(items: WatchlistItem[]): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  try {
    const normalizedItems = normalizeItems(items, Date.now());

    if (normalizedItems.length === 0) {
      storage.removeItem(GUEST_WATCHLIST_STORAGE_KEY);
      return true;
    }

    const payload: StoredGuestWatchlist = {
      version: GUEST_WATCHLIST_VERSION,
      items: normalizedItems,
    };

    storage.setItem(
      GUEST_WATCHLIST_STORAGE_KEY,
      JSON.stringify(payload),
    );

    return true;
  } catch {
    return false;
  }
}

export function createGuestWatchlistItem(
  candidate: WatchlistCandidate,
  now: number = Date.now(),
): WatchlistItem {
  return {
    mediaType: candidate.mediaType,
    tmdbId: candidate.tmdbId,
    title: candidate.title.trim(),
    posterUrl: candidate.posterUrl,
    year: candidate.year.trim(),
    addedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + GUEST_WATCHLIST_TTL_MS).toISOString(),
  };
}
