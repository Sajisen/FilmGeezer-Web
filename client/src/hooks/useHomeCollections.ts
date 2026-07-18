import { useCallback, useEffect, useState } from "react";
import { getHomeCollections } from "../services/homeService";
import type { HomeCollections } from "../types/home";

const emptyCollections: HomeCollections = {
  trendingMovies: [],
  trendingTv: [],
  trendingAnime: [],
  trendingKDrama: [],
};

interface HomeRequestState {
  requestKey: number;
  collections: HomeCollections;
  errorMessage: string;
}

const initialRequestState: HomeRequestState = {
  requestKey: -1,
  collections: emptyCollections,
  errorMessage: "",
};

export function useHomeCollections() {
  const [reloadKey, setReloadKey] = useState(0);

  const [requestState, setRequestState] =
    useState<HomeRequestState>(initialRequestState);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCollections() {
      try {
        const collections = await getHomeCollections(controller.signal);

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
              : "Something went wrong while loading the Home page.",
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
