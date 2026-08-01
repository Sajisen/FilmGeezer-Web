export const WATCHLIST_COLLECTION_NAME = "watchlists";

export const WATCHLIST_SCHEMA_VERSION = 1;
export const WATCHLIST_MAX_ITEMS = 50;
export const WATCHLIST_GUEST_MERGE_MAX_ITEMS = 20;

export const WATCHLIST_HTTP_POLICY = {
  read: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 180,
  },
  mutation: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 180,
    requestBodyLimit: "24kb",
  },
  merge: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 40,
    requestBodyLimit: "32kb",
  },
} as const;
