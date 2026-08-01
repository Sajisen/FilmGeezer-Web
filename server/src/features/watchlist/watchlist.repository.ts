import {
  MongoServerError,
  ObjectId,
  type Filter,
  type UpdateFilter,
} from "mongodb";

import {
  WATCHLIST_MAX_ITEMS,
  WATCHLIST_SCHEMA_VERSION,
} from "./watchlist.constants.js";

import { getWatchlistCollection } from "./watchlist.collection.js";

import type {
  WatchlistDocument,
  WatchlistItemDocument,
  WatchlistMediaType,
} from "./watchlist.types.js";

export async function ensureWatchlistDocument(
  userId: ObjectId,
  now: Date,
): Promise<void> {
  const collection = await getWatchlistCollection();

  try {
    await collection.updateOne(
      { userId },
      {
        $setOnInsert: {
          _id: new ObjectId(),
          schemaVersion: WATCHLIST_SCHEMA_VERSION,
          userId,
          revision: 0,
          items: [],
          createdAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    /*
     * Two first-time requests can race on the unique userId index. If the
     * other request created the document first, the desired state already
     * exists and this request can continue safely.
     */
    if (error instanceof MongoServerError && error.code === 11_000) {
      return;
    }

    throw error;
  }
}

export async function findWatchlistByUserId(
  userId: ObjectId,
): Promise<WatchlistDocument | null> {
  const collection = await getWatchlistCollection();

  return collection.findOne({ userId });
}

export async function addWatchlistItemAtomically(input: {
  userId: ObjectId;
  item: WatchlistItemDocument;
  updatedAt: Date;
}): Promise<WatchlistDocument | null> {
  const collection = await getWatchlistCollection();

  const filter: Filter<WatchlistDocument> = {
    userId: input.userId,
    items: {
      $not: {
        $elemMatch: {
          mediaType: input.item.mediaType,
          tmdbId: input.item.tmdbId,
        },
      },
    },
    $expr: {
      $lt: [
        {
          $size: {
            $ifNull: ["$items", []],
          },
        },
        WATCHLIST_MAX_ITEMS,
      ],
    },
  };

  const update: UpdateFilter<WatchlistDocument> = {
    $push: {
      items: {
        $each: [input.item],
        $position: 0,
      },
    },
    $set: {
      updatedAt: input.updatedAt,
    },
    $inc: {
      revision: 1,
    },
  };

  return collection.findOneAndUpdate(filter, update, {
    returnDocument: "after",
  });
}

export async function removeWatchlistItemAtomically(input: {
  userId: ObjectId;
  mediaType: WatchlistMediaType;
  tmdbId: number;
  updatedAt: Date;
}): Promise<WatchlistDocument | null> {
  const collection = await getWatchlistCollection();

  return collection.findOneAndUpdate(
    {
      userId: input.userId,
      items: {
        $elemMatch: {
          mediaType: input.mediaType,
          tmdbId: input.tmdbId,
        },
      },
    },
    {
      $pull: {
        items: {
          mediaType: input.mediaType,
          tmdbId: input.tmdbId,
        },
      },
      $set: {
        updatedAt: input.updatedAt,
      },
      $inc: {
        revision: 1,
      },
    },
    {
      returnDocument: "after",
    },
  );
}

export async function clearWatchlistAtomically(input: {
  userId: ObjectId;
  updatedAt: Date;
}): Promise<WatchlistDocument | null> {
  const collection = await getWatchlistCollection();

  return collection.findOneAndUpdate(
    {
      userId: input.userId,
      "items.0": { $exists: true },
    },
    {
      $set: {
        items: [],
        updatedAt: input.updatedAt,
      },
      $inc: {
        revision: 1,
      },
    },
    {
      returnDocument: "after",
    },
  );
}

export async function replaceWatchlistItemsIfRevisionMatches(input: {
  watchlistId: ObjectId;
  revision: number;
  items: WatchlistItemDocument[];
  updatedAt: Date;
}): Promise<WatchlistDocument | null> {
  const collection = await getWatchlistCollection();

  return collection.findOneAndUpdate(
    {
      _id: input.watchlistId,
      revision: input.revision,
    },
    {
      $set: {
        items: input.items,
        updatedAt: input.updatedAt,
      },
      $inc: {
        revision: 1,
      },
    },
    {
      returnDocument: "after",
    },
  );
}
