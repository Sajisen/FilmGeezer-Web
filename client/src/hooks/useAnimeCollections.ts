import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { getAnimeCollections } from '../services/animeCollectionsService'
import type { AnimeCollections } from '../types/animeCollections'

const emptyCollections: AnimeCollections = {
  trendingAnime: [],
  essentials: [],
  actionAdventureThriller: [],

  fantasyMysteryScienceFiction:
    [],

  romanceDrama: [],
  comedySliceOfLife: [],
}

interface AnimeCollectionsRequestState {
  requestKey: number
  collections: AnimeCollections
  errorMessage: string
}

const initialRequestState:
  AnimeCollectionsRequestState = {
    requestKey: -1,
    collections: emptyCollections,
    errorMessage: '',
  }

export function useAnimeCollections() {
  const [reloadKey, setReloadKey] =
    useState(0)

  const [requestState, setRequestState] =
    useState<AnimeCollectionsRequestState>(
      initialRequestState,
    )

  useEffect(() => {
    const controller =
      new AbortController()

    async function loadCollections() {
      try {
        const collections =
          await getAnimeCollections(
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
              : 'Something went wrong while loading Anime collections.',
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