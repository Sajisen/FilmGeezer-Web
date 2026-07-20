import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { getWatchAvailability } from '../services/watchAvailabilityService'
import type {
  MediaType,
} from '../types/media'
import type {
  WatchAvailability,
} from '../types/watchAvailability'

interface WatchAvailabilityState {
  requestKey: string
  availability:
    | WatchAvailability
    | null
  errorMessage: string
}

const initialState:
  WatchAvailabilityState = {
    requestKey: '',
    availability: null,
    errorMessage: '',
  }

export function useWatchAvailability(
  mediaType: MediaType,
  tmdbId: number,
  region: string,
) {
  const [reloadKey, setReloadKey] =
    useState(0)

  const [state, setState] =
    useState<WatchAvailabilityState>(
      initialState,
    )

  const requestKey =
    `${mediaType}:${tmdbId}:` +
    `${region}:${reloadKey}`

  useEffect(() => {
    const controller =
      new AbortController()

    async function loadAvailability() {
      try {
        const availability =
          await getWatchAvailability(
            mediaType,
            tmdbId,
            region,
            controller.signal,
          )

        if (
          controller.signal.aborted
        ) {
          return
        }

        setState({
          requestKey,
          availability,
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
          availability: null,

          errorMessage:
            error instanceof Error
              ? error.message
              : 'Streaming availability could not be loaded.',
        })
      }
    }

    void loadAvailability()

    return () => {
      controller.abort()
    }
  }, [
    mediaType,
    tmdbId,
    region,
    reloadKey,
    requestKey,
  ])

  const retry = useCallback(() => {
    setReloadKey(
      (currentKey) =>
        currentKey + 1,
    )
  }, [])

  const isLoading =
    state.requestKey !==
    requestKey

  return {
    availability:
      isLoading
        ? null
        : state.availability,

    isLoading,

    errorMessage:
      isLoading
        ? ''
        : state.errorMessage,

    retry,
  }
}