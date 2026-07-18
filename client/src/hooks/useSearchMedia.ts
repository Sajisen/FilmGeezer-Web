import { useEffect, useMemo, useRef, useState } from "react";
import { searchMedia } from "../services/mediaService";
import type { MediaItem, SearchScope } from "../types/media";
import type { SearchFilterValues } from "../types/search";
import { removeDuplicateMedia } from "../utils/media";

interface SearchRequestState {
  requestKey: string;
  items: MediaItem[];
  page: number;
  totalPages: number;
  errorMessage: string;
  hasMore: boolean;
}

interface LoadMoreState {
  requestKey: string;
  isLoading: boolean;
  errorMessage: string;
}

const initialRequestState: SearchRequestState = {
  requestKey: "",
  items: [],
  page: 1,
  totalPages: 0,
  errorMessage: "",
  hasMore: false,
};

const initialLoadMoreState: LoadMoreState = {
  requestKey: "",
  isLoading: false,
  errorMessage: "",
};

function createRequestKey(
  query: string,
  scope: SearchScope,
  filters: SearchFilterValues,
  reloadKey: number,
) {
  return [
    query,
    scope,
    filters.genre,
    filters.language,
    filters.minRating,
    String(reloadKey),
  ].join("\u0000");
}

export function useSearchMedia(
  query: string,
  scope: SearchScope,
  filters: SearchFilterValues,
) {
  const trimmedQuery = query.trim();
  const { genre, language, minRating } = filters;

  const [reloadKey, setReloadKey] = useState(0);

  const [requestState, setRequestState] =
    useState<SearchRequestState>(initialRequestState);

  const [loadMoreState, setLoadMoreState] =
    useState<LoadMoreState>(initialLoadMoreState);

  const loadMoreControllerRef = useRef<AbortController | null>(null);

  const currentFilters = useMemo<SearchFilterValues>(
    () => ({
      genre,
      language,
      minRating,
    }),
    [genre, language, minRating],
  );

  const currentRequestKey = createRequestKey(
    trimmedQuery,
    scope,
    currentFilters,
    reloadKey,
  );

  useEffect(() => {
    loadMoreControllerRef.current?.abort();

    if (!trimmedQuery) {
      return;
    }

    const controller = new AbortController();

    async function runSearch() {
      try {
        const data = await searchMedia(
          trimmedQuery,
          scope,
          currentFilters,
          1,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          requestKey: currentRequestKey,

          items: data.results,
          page: data.page,
          totalPages: data.totalPages,

          hasMore: data.hasMore,

          errorMessage: "",
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          requestKey: currentRequestKey,

          items: [],
          page: 1,
          totalPages: 0,
          hasMore: false,

          errorMessage:
            error instanceof Error
              ? error.message
              : "Something went wrong while searching.",
        });
      }
    }

    void runSearch();

    return () => {
      controller.abort();
    };
  }, [currentFilters, currentRequestKey, scope, trimmedQuery]);

  useEffect(() => {
    return () => {
      loadMoreControllerRef.current?.abort();
    };
  }, []);

  const requestMatchesCurrentSearch =
    requestState.requestKey === currentRequestKey;

  const loadMoreMatchesCurrentSearch =
    loadMoreState.requestKey === currentRequestKey;

  const items = requestMatchesCurrentSearch ? requestState.items : [];

  const page = requestMatchesCurrentSearch ? requestState.page : 1;

  const hasMore = requestMatchesCurrentSearch ? requestState.hasMore : false;

  const errorMessage = requestMatchesCurrentSearch
    ? requestState.errorMessage
    : "";

  const isLoading = trimmedQuery.length > 0 && !requestMatchesCurrentSearch;

  const isLoadingMore = loadMoreMatchesCurrentSearch && loadMoreState.isLoading;

  const loadMoreErrorMessage = loadMoreMatchesCurrentSearch
    ? loadMoreState.errorMessage
    : "";

  async function loadMore() {
    if (!trimmedQuery || isLoading || isLoadingMore || !hasMore) {
      return;
    }

    const controller = new AbortController();

    loadMoreControllerRef.current?.abort();
    loadMoreControllerRef.current = controller;

    setLoadMoreState({
      requestKey: currentRequestKey,
      isLoading: true,
      errorMessage: "",
    });

    try {
      const data = await searchMedia(
        trimmedQuery,
        scope,
        currentFilters,
        page + 1,
        controller.signal,
      );

      if (controller.signal.aborted) {
        return;
      }

      setRequestState((currentState) => {
        if (currentState.requestKey !== currentRequestKey) {
          return currentState;
        }

        return {
          ...currentState,

          items: removeDuplicateMedia([...currentState.items, ...data.results]),

          page: data.page,

          totalPages: data.totalPages,

          hasMore: data.hasMore,
        };
      });

      setLoadMoreState({
        requestKey: currentRequestKey,
        isLoading: false,
        errorMessage: "",
      });
    } catch (error: unknown) {
      if (controller.signal.aborted) {
        return;
      }

      setLoadMoreState({
        requestKey: currentRequestKey,
        isLoading: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "Something went wrong while loading more results.",
      });
    }
  }

  function reload() {
    setReloadKey((currentKey) => currentKey + 1);
  }

  return {
    items,
    isLoading,
    isLoadingMore,
    errorMessage,
    loadMoreErrorMessage,
    hasMore,
    loadMore,
    reload,
  };
}
