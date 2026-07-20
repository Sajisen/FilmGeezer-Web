import type { MediaType } from '../types/media.js'
import type { WatchAvailability } from '../types/watchAvailability.js'
import { getTmdbWatchAvailability } from './tmdb.service.js'

const CACHE_DURATION_MS =
  60 * 60 * 1000

interface CachedAvailability {
  expiresAt: number
  data: WatchAvailability
}

const availabilityCache =
  new Map<
    string,
    CachedAvailability
  >()

const pendingRequests =
  new Map<
    string,
    Promise<WatchAvailability>
  >()

export async function getWatchAvailability(
  mediaType: MediaType,
  tmdbId: number,
  region: string,
) {
  const normalizedRegion =
    region.toUpperCase()

  const cacheKey =
    `${mediaType}:${tmdbId}:` +
    normalizedRegion

  const now = Date.now()

  const cached =
    availabilityCache.get(
      cacheKey,
    )

  if (
    cached &&
    cached.expiresAt > now
  ) {
    return cached.data
  }

  const pending =
    pendingRequests.get(cacheKey)

  if (pending) {
    return pending
  }

  const request =
    getTmdbWatchAvailability(
      mediaType,
      tmdbId,
      normalizedRegion,
    )

  pendingRequests.set(
    cacheKey,
    request,
  )

  try {
    const data = await request

    availabilityCache.set(
      cacheKey,
      {
        data,

        expiresAt:
          Date.now() +
          CACHE_DURATION_MS,
      },
    )

    return data
  } finally {
    pendingRequests.delete(
      cacheKey,
    )
  }
}