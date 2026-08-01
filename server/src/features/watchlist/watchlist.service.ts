import type { ObjectId } from "mongodb";

import {
  WATCHLIST_MAX_ITEMS,
} from "./watchlist.constants.js";

import {
  WatchlistLimitError,
  WatchlistPersistenceError,
} from "./watchlist.errors.js";

import {
  addWatchlistItemAtomically,
  clearWatchlistAtomically,
  ensureWatchlistDocument,
  findWatchlistByUserId,
  removeWatchlistItemAtomically,
  replaceWatchlistItemsIfRevisionMatches,
} from "./watchlist.repository.js";

import {
  watchlistIdentitySchema,
  watchlistItemInputSchema,
  watchlistMergeInputSchema,
} from "./watchlist.validation.js";

import type {
  GuestWatchlistMergeItemInput,
  WatchlistDocument,
  WatchlistItemDocument,
  WatchlistItemDto,
  WatchlistItemInput,
  WatchlistSnapshot,
} from "./watchlist.types.js";

const MERGE_MAXIMUM_RETRIES = 5;
const MAXIMUM_GUEST_ITEM_AGE_MS = 8 * 24 * 60 * 60 * 1_000;
const MAXIMUM_CLOCK_SKEW_MS = 5 * 60 * 1_000;

function createIdentityKey(item: {
  mediaType: "movie" | "tv";
  tmdbId: number;
}): string {
  return `${item.mediaType}:${item.tmdbId}`;
}

function toWatchlistItemDto(
  item: WatchlistItemDocument,
): WatchlistItemDto {
  return {
    mediaType: item.mediaType,
    tmdbId: item.tmdbId,
    title: item.title,
    posterUrl: item.posterUrl,
    year: item.year,
    addedAt: item.addedAt,
  };
}

function toWatchlistSnapshot(
  document: WatchlistDocument | null,
): WatchlistSnapshot {
  return {
    items: document
      ? document.items
          .slice()
          .sort(
            (firstItem, secondItem) =>
              secondItem.addedAt.getTime() -
              firstItem.addedAt.getTime(),
          )
          .map(toWatchlistItemDto)
      : [],
    maximumItems: WATCHLIST_MAX_ITEMS,
    updatedAt: document?.updatedAt ?? null,
  };
}

function createWatchlistItemDocument(
  input: WatchlistItemInput,
  addedAt: Date,
): WatchlistItemDocument {
  return {
    mediaType: input.mediaType,
    tmdbId: input.tmdbId,
    title: input.title,
    posterUrl: input.posterUrl,
    year: input.year,
    addedAt,
  };
}

function normalizeGuestAddedAt(
  addedAt: Date,
  now: Date,
): Date {
  const minimumTime = now.getTime() - MAXIMUM_GUEST_ITEM_AGE_MS;
  const maximumTime = now.getTime() + MAXIMUM_CLOCK_SKEW_MS;
  const candidateTime = addedAt.getTime();

  if (candidateTime < minimumTime) {
    return new Date(minimumTime);
  }

  if (candidateTime > maximumTime) {
    return new Date(now);
  }

  return addedAt;
}

function normalizeGuestMergeItems(
  items: GuestWatchlistMergeItemInput[],
  now: Date,
): GuestWatchlistMergeItemInput[] {
  const uniqueItems = new Map<string, GuestWatchlistMergeItemInput>();

  for (const item of items) {
    const normalizedItem = {
      ...item,
      addedAt: normalizeGuestAddedAt(item.addedAt, now),
    };

    const key = createIdentityKey(normalizedItem);
    const existingItem = uniqueItems.get(key);

    if (
      !existingItem ||
      normalizedItem.addedAt.getTime() > existingItem.addedAt.getTime()
    ) {
      uniqueItems.set(key, normalizedItem);
    }
  }

  return Array.from(uniqueItems.values()).sort(
    (firstItem, secondItem) =>
      secondItem.addedAt.getTime() - firstItem.addedAt.getTime(),
  );
}

function buildMergedItems(input: {
  accountItems: WatchlistItemDocument[];
  guestItems: GuestWatchlistMergeItemInput[];
}): {
  items: WatchlistItemDocument[];
  addedCount: number;
  duplicateCount: number;
  skippedForLimitCount: number;
} {
  const accountIdentityKeys = new Set(
    input.accountItems.map(createIdentityKey),
  );

  const missingGuestItems = input.guestItems.filter(
    (item) => !accountIdentityKeys.has(createIdentityKey(item)),
  );

  const duplicateCount = input.guestItems.length - missingGuestItems.length;

  const availableSlots = Math.max(
    0,
    WATCHLIST_MAX_ITEMS - input.accountItems.length,
  );

  /*
   * Existing account items are authoritative. A browser merge may fill the
   * remaining capacity, but it must never evict an older account title merely
   * because a temporary guest item has a newer addedAt timestamp.
   */
  const guestItemsToAdd = missingGuestItems.slice(0, availableSlots);

  const items = [
    ...input.accountItems,
    ...guestItemsToAdd.map((item) =>
      createWatchlistItemDocument(item, item.addedAt),
    ),
  ].sort(
    (firstItem, secondItem) =>
      secondItem.addedAt.getTime() - firstItem.addedAt.getTime(),
  );

  return {
    items,
    addedCount: guestItemsToAdd.length,
    duplicateCount,
    skippedForLimitCount:
      missingGuestItems.length - guestItemsToAdd.length,
  };
}

async function safelyReadCurrentWatchlist(
  userId: ObjectId,
): Promise<WatchlistDocument | null> {
  try {
    return await findWatchlistByUserId(userId);
  } catch (error) {
    throw new WatchlistPersistenceError(
      "The Watchlist could not be loaded.",
      { cause: error },
    );
  }
}

export async function getWatchlist(
  userId: ObjectId,
): Promise<WatchlistSnapshot> {
  return toWatchlistSnapshot(await safelyReadCurrentWatchlist(userId));
}

export async function addWatchlistItem(
  userId: ObjectId,
  input: unknown,
): Promise<WatchlistSnapshot & { changed: boolean }> {
  const parsedInput = watchlistItemInputSchema.parse(input);
  const now = new Date();

  try {
    await ensureWatchlistDocument(userId, now);

    const updatedDocument = await addWatchlistItemAtomically({
      userId,
      item: createWatchlistItemDocument(parsedInput, now),
      updatedAt: now,
    });

    if (updatedDocument) {
      return {
        ...toWatchlistSnapshot(updatedDocument),
        changed: true,
      };
    }

    const currentDocument = await findWatchlistByUserId(userId);

    if (!currentDocument) {
      throw new WatchlistPersistenceError();
    }

    const alreadyExists = currentDocument.items.some(
      (item) =>
        item.mediaType === parsedInput.mediaType &&
        item.tmdbId === parsedInput.tmdbId,
    );

    if (alreadyExists) {
      return {
        ...toWatchlistSnapshot(currentDocument),
        changed: false,
      };
    }

    if (currentDocument.items.length >= WATCHLIST_MAX_ITEMS) {
      throw new WatchlistLimitError(WATCHLIST_MAX_ITEMS);
    }

    throw new WatchlistPersistenceError();
  } catch (error) {
    if (
      error instanceof WatchlistLimitError ||
      error instanceof WatchlistPersistenceError
    ) {
      throw error;
    }

    throw new WatchlistPersistenceError(undefined, { cause: error });
  }
}

export async function removeWatchlistItem(
  userId: ObjectId,
  input: unknown,
): Promise<WatchlistSnapshot & { changed: boolean }> {
  const parsedInput = watchlistIdentitySchema.parse(input);
  const now = new Date();

  try {
    const updatedDocument = await removeWatchlistItemAtomically({
      userId,
      mediaType: parsedInput.mediaType,
      tmdbId: parsedInput.tmdbId,
      updatedAt: now,
    });

    if (updatedDocument) {
      return {
        ...toWatchlistSnapshot(updatedDocument),
        changed: true,
      };
    }

    return {
      ...toWatchlistSnapshot(await findWatchlistByUserId(userId)),
      changed: false,
    };
  } catch (error) {
    if (error instanceof WatchlistPersistenceError) {
      throw error;
    }

    throw new WatchlistPersistenceError(undefined, { cause: error });
  }
}

export async function clearWatchlist(
  userId: ObjectId,
): Promise<WatchlistSnapshot & { changed: boolean }> {
  const now = new Date();

  try {
    const updatedDocument = await clearWatchlistAtomically({
      userId,
      updatedAt: now,
    });

    if (updatedDocument) {
      return {
        ...toWatchlistSnapshot(updatedDocument),
        changed: true,
      };
    }

    return {
      ...toWatchlistSnapshot(await findWatchlistByUserId(userId)),
      changed: false,
    };
  } catch (error) {
    throw new WatchlistPersistenceError(undefined, { cause: error });
  }
}

export async function mergeGuestWatchlist(
  userId: ObjectId,
  input: unknown,
): Promise<
  WatchlistSnapshot & {
    addedCount: number;
    duplicateCount: number;
    skippedForLimitCount: number;
  }
> {
  const parsedInput = watchlistMergeInputSchema.parse(input);
  const now = new Date();

  const guestItems = normalizeGuestMergeItems(
    parsedInput.items.map((item) => ({
      ...item,
      addedAt: new Date(item.addedAt),
    })),
    now,
  );

  try {
    await ensureWatchlistDocument(userId, now);

    for (let attempt = 0; attempt < MERGE_MAXIMUM_RETRIES; attempt += 1) {
      const currentDocument = await findWatchlistByUserId(userId);

      if (!currentDocument) {
        throw new WatchlistPersistenceError();
      }

      const mergeResult = buildMergedItems({
        accountItems: currentDocument.items,
        guestItems,
      });

      const currentKeys = currentDocument.items.map(createIdentityKey);
      const mergedKeys = mergeResult.items.map(createIdentityKey);
      const changed =
        currentKeys.length !== mergedKeys.length ||
        currentKeys.some((key, index) => key !== mergedKeys[index]);

      if (!changed) {
        return {
          ...toWatchlistSnapshot(currentDocument),
          addedCount: 0,
          duplicateCount: mergeResult.duplicateCount,
          skippedForLimitCount: mergeResult.skippedForLimitCount,
        };
      }

      const updatedDocument = await replaceWatchlistItemsIfRevisionMatches({
        watchlistId: currentDocument._id,
        revision: currentDocument.revision,
        items: mergeResult.items,
        updatedAt: now,
      });

      if (updatedDocument) {
        return {
          ...toWatchlistSnapshot(updatedDocument),
          addedCount: mergeResult.addedCount,
          duplicateCount: mergeResult.duplicateCount,
          skippedForLimitCount: mergeResult.skippedForLimitCount,
        };
      }
    }

    throw new WatchlistPersistenceError(
      "The Watchlist changed repeatedly while guest titles were being merged.",
    );
  } catch (error) {
    if (error instanceof WatchlistPersistenceError) {
      throw error;
    }

    throw new WatchlistPersistenceError(undefined, { cause: error });
  }
}
