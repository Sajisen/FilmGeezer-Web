import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { getMovieCollections } from '../services/movieCollectionsService'
import type { MovieCollections } from '../types/movieCollections'

const emptyCollections: MovieCollections = {
  trendingAndNowPlaying: [],
  essentials: [],
  actionAdventureCrimeThriller: [],
  comedy: [],
  dramaRomance: [],
  family: [],
}

interface MovieCollectionsRequestState {
  requestKey: number
  collections: MovieCollections
  errorMessage: string
}

const initialRequestState:
  MovieCollectionsRequestState = {
    requestKey: -1,
    collections: emptyCollections,
    errorMessage: '',
  }

export function useMovieCollections() {
  const [reloadKey, setReloadKey] =
    useState(0)

  const [requestState, setRequestState] =
    useState<MovieCollectionsRequestState>(
      initialRequestState,
    )

  useEffect(() => {
    const controller =
      new AbortController()

    async function loadCollections() {
      try {
        const collections =
          await getMovieCollections(
            controller.signal,
          )

        if (controller.signal.aborted) {
          return
        }

        setRequestState({
          requestKey: reloadKey,
          collections,
          errorMessage: '',
        })
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return
        }

        setRequestState({
          requestKey: reloadKey,
          collections:
            emptyCollections,

          errorMessage:
            error instanceof Error
              ? error.message
              : 'Something went wrong while loading movie collections.',
        })
      }
    }

    void loadCollections()

    return () => {
      controller.abort()
    }
  }, [reloadKey])

  const reload = useCallback(() => {
    setReloadKey(
      (currentKey) =>
        currentKey + 1,
    )
  }, [])

  const isLoading =
    requestState.requestKey !==
    reloadKey

  return {
    collections: isLoading
      ? emptyCollections
      : requestState.collections,

    isLoading,

    errorMessage: isLoading
      ? ''
      : requestState.errorMessage,

    reload,
  }
}