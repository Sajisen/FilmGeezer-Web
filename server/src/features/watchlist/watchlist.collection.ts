import type { Collection } from "mongodb";

import { getWebDatabase } from "../../config/database.js";

import { WATCHLIST_COLLECTION_NAME } from "./watchlist.constants.js";
import type { WatchlistDocument } from "./watchlist.types.js";

export async function getWatchlistCollection(): Promise<
  Collection<WatchlistDocument>
> {
  const database = await getWebDatabase();

  return database.collection<WatchlistDocument>(
    WATCHLIST_COLLECTION_NAME,
  );
}
