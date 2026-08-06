export const RECOMMENDATION_CATEGORY_VALUES = [
  "movie",
  "tv",
  "anime",
  "kdrama",
] as const;

export const RECOMMENDATION_POLICY = {
  minimumWatchlistItems: 5,
  maximumWatchlistProfileItems: 8,
  maximumRelatedSeedsPerCategory: 3,
  minimumResults: 15,
  maximumResults: 30,
  cacheDurationMilliseconds: 15 * 60 * 1_000,
  maximumCacheEntries: 250,
  readRateLimitWindowMilliseconds: 15 * 60 * 1_000,
  maximumReadRequestsPerWindow: 120,
} as const;
