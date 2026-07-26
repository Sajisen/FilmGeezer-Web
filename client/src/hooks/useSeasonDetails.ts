import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { getSeasonDetails } from '../services/seasonDetailsService'
import type { SeasonDetails } from '../types/season'

interface SeasonRequestState {
  requestKey: string
  season: SeasonDetails | null
  errorMessage: string
}

const initialState: SeasonRequestState = {
  requestKey: '',
  season: null,
  errorMessage: '',
}

const seasonDetailsCache =
  new Map<string, SeasonDetails>()

export function useSeasonDetails(
  tmdbId: number,
  seasonNumber: number,
  enabled = true,
) {
  const [reloadKey, setReloadKey] =
    useState(0)

  const [state, setState] =
    useState<SeasonRequestState>(
      initialState,
    )

  const cacheKey =
    `${tmdbId}:${seasonNumber}`

  const requestKey =
    `${cacheKey}:${reloadKey}`

  const cachedSeason =
    reloadKey === 0
      ? (seasonDetailsCache.get(
          cacheKey,
        ) ?? null)
      : null

  useEffect(() => {
    if (!enabled || cachedSeason) {
      return
    }

    const controller =
      new AbortController()

    async function loadSeason() {
      try {
        const season =
          await getSeasonDetails(
            tmdbId,
            seasonNumber,
            controller.signal,
          )

        if (
          controller.signal.aborted
        ) {
          return
        }

        seasonDetailsCache.set(
          cacheKey,
          season,
        )

        setState({
          requestKey,
          season,
          errorMessage: '',
        })
      } catch (error: unknown) {
        if (
          controller.signal.aborted
        ) {
          return
        }

        setState({
          requestKey,
          season: null,
          errorMessage:
            error instanceof Error
              ? error.message
              : 'The selected season could not be loaded.',
        })
      }
    }

    void loadSeason()

    return () => {
      controller.abort()
    }
  }, [
    enabled,
    cachedSeason,
    tmdbId,
    seasonNumber,
    cacheKey,
    requestKey,
  ])

  const retry = useCallback(() => {
    seasonDetailsCache.delete(
      cacheKey,
    )

    setReloadKey(
      (currentKey) =>
        currentKey + 1,
    )
  }, [cacheKey])

  const hasCurrentResponse =
    state.requestKey === requestKey

  const season =
    enabled
      ? cachedSeason ??
        (hasCurrentResponse
          ? state.season
          : null)
      : null

  const isLoading =
    enabled &&
    !cachedSeason &&
    !hasCurrentResponse

  const errorMessage =
    enabled &&
    !cachedSeason &&
    hasCurrentResponse
      ? state.errorMessage
      : ''

  return {
    season,
    isLoading,
    errorMessage,
    retry,
  }
}