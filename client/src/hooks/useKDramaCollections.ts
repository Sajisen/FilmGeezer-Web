import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { getKDramaCollections } from '../services/kDramaCollectionsService'
import type { KDramaCollections } from '../types/kDramaCollections'

const emptyCollections: KDramaCollections = {
  trendingKDramas: [],
  essentials: [],
  romance: [],
  actionCrimeThriller: [],
  mysterySuspense: [],
  comedyFeelGood: [],
}

interface KDramaCollectionsRequestState {
  requestKey: number
  collections: KDramaCollections
  errorMessage: string
}

const initialRequestState:
  KDramaCollectionsRequestState = {
    requestKey: -1,
    collections: emptyCollections,
    errorMessage: '',
  }

export function useKDramaCollections() {
  const [reloadKey, setReloadKey] =
    useState(0)

  const [requestState, setRequestState] =
    useState<KDramaCollectionsRequestState>(
      initialRequestState,
    )

  useEffect(() => {
    const controller =
      new AbortController()

    async function loadCollections() {
      try {
        const collections =
          await getKDramaCollections(
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
              : 'Something went wrong while loading K-Drama collections.',
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