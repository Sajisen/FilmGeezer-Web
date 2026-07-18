import { useCallback, useEffect, useState } from "react";
import { getTvCollections } from "../services/tvCollectionsService";
import type { TvCollections } from "../types/tvCollections";

const emptyCollections: TvCollections = {
  trendingAndCurrentlyAiring: [],
  essentials: [],
  actionCrimeThriller: [],
  comedy: [],
  dramaRomance: [],
  mysteryScienceFiction: [],
};

interface TvCollectionsRequestState {
  requestKey: number;
  collections: TvCollections;
  errorMessage: string;
}

const initialRequestState: TvCollectionsRequestState = {
  requestKey: -1,
  collections: emptyCollections,
  errorMessage: "",
};

export function useTvCollections() {
  const [reloadKey, setReloadKey] = useState(0);

  const [requestState, setRequestState] =
    useState<TvCollectionsRequestState>(initialRequestState);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCollections() {
      try {
        const collections = await getTvCollections(controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          requestKey: reloadKey,
          collections,
          errorMessage: "",
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          requestKey: reloadKey,
          collections: emptyCollections,

          errorMessage:
            error instanceof Error
              ? error.message
              : "Something went wrong while loading TV collections.",
        });
      }
    }

    void loadCollections();

    return () => {
      controller.abort();
    };
  }, [reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((currentKey) => currentKey + 1);
  }, []);

  const isLoading = requestState.requestKey !== reloadKey;

  return {
    collections: isLoading ? emptyCollections : requestState.collections,

    isLoading,

    errorMessage: isLoading ? "" : requestState.errorMessage,

    reload,
  };
}
