import {
  WATCHLIST_MAX_ITEMS,
  WATCHLIST_SCHEMA_VERSION,
} from "./watchlist.constants.js";

import { getWatchlistCollection } from "./watchlist.collection.js";

let watchlistStoragePromise: Promise<void> | null = null;

async function prepareWatchlistStorage(): Promise<void> {
  const collection = await getWatchlistCollection();

  await collection.updateMany(
    { revision: { $exists: false } },
    {
      $set: {
        revision: 0,
      },
    },
  );

  await collection.updateMany(
    { schemaVersion: { $ne: WATCHLIST_SCHEMA_VERSION } },
    {
      $set: {
        schemaVersion: WATCHLIST_SCHEMA_VERSION,
      },
    },
  );

  await collection.updateMany(
    {
      $expr: {
        $gt: [{ $size: { $ifNull: ["$items", []] } }, WATCHLIST_MAX_ITEMS],
      },
    },
    [
      {
        $set: {
          items: {
            $slice: ["$items", WATCHLIST_MAX_ITEMS],
          },
        },
      },
    ],
  );

  await collection.createIndexes([
    {
      key: { userId: 1 },
      name: "watchlists_user_unique",
      unique: true,
    },
    {
      key: { updatedAt: -1 },
      name: "watchlists_updated_at",
    },
  ]);
}

export function initializeWatchlistStorage(): Promise<void> {
  if (!watchlistStoragePromise) {
    watchlistStoragePromise = prepareWatchlistStorage().catch((error) => {
      watchlistStoragePromise = null;
      throw error;
    });
  }

  return watchlistStoragePromise;
}
