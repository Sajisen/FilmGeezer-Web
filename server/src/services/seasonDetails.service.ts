import { getTmdbSeasonDetails } from "./tmdb.service.js";
import type {
  SeasonDetails,
} from "../types/season.js";

const CACHE_DURATION_MS =
  6 * 60 * 60 * 1000;

interface CachedSeason {
  data: SeasonDetails;
  expiresAt: number;
}

const seasonCache =
  new Map<
    string,
    CachedSeason
  >();

const pendingRequests =
  new Map<
    string,
    Promise<SeasonDetails>
  >();

export async function getSeasonDetails(
  tmdbId: number,
  seasonNumber: number,
) {
  const cacheKey =
    `${tmdbId}:${seasonNumber}`;

  const now = Date.now();

  const cachedSeason =
    seasonCache.get(cacheKey);

  if (
    cachedSeason &&
    cachedSeason.expiresAt > now
  ) {
    return cachedSeason.data;
  }

  const pendingRequest =
    pendingRequests.get(cacheKey);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request =
    getTmdbSeasonDetails(
      tmdbId,
      seasonNumber,
    );

  pendingRequests.set(
    cacheKey,
    request,
  );

  try {
    const seasonDetails =
      await request;

    seasonCache.set(
      cacheKey,
      {
        data: seasonDetails,

        expiresAt:
          Date.now() +
          CACHE_DURATION_MS,
      },
    );

    return seasonDetails;
  } finally {
    pendingRequests.delete(
      cacheKey,
    );
  }
}