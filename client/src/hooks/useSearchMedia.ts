import { useEffect, useMemo, useRef, useState } from "react";
import { searchMedia } from "../services/mediaService";
import type { MediaItem, SearchScope } from "../types/media";
import type { SearchFilterValues, SearchPreset } from "../types/search";
import { removeDuplicateMedia } from "../utils/media";

interface SearchRequestState {
  requestKey: string;
  items: MediaItem[];
  page: number;
  totalPages: number;
  totalResults: number;
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
  totalResults: 0,
  errorMessage: "",
  hasMore: false,
};

const initialLoadMoreState: LoadMoreState = {
  requestKey: "",
  isLoading: false,
  errorMessage: "",
};

function hasActiveFilters(filters: SearchFilterValues) {
  return (
    filters.genres.length > 0 ||
    filters.language !== "all" ||
    filters.minRating !== "all"
  );
}

function createRequestKey(
  query: string,
  scope: SearchScope,
  filters: SearchFilterValues,
  preset: SearchPreset,
  reloadKey: number,
) {
  return [
    query,
    scope,
    filters.genres.join("|"),
    filters.genreMode,
    filters.language,
    filters.minRating,
    preset,
    String(reloadKey),
  ].join("\u0000");
}

export function useSearchMedia(
  query: string,
  scope: SearchScope,
  filters: SearchFilterValues,
  preset: SearchPreset = "default",
) {
  const trimmedQuery = query.trim();
  const { genres, genreMode, language, minRating } = filters;

  const [reloadKey, setReloadKey] = useState(0);
  const [requestState, setRequestState] =
    useState<SearchRequestState>(initialRequestState);
  const [loadMoreState, setLoadMoreState] =
    useState<LoadMoreState>(initialLoadMoreState);

  const loadMoreControllerRef = useRef<AbortController | null>(null);

  const currentFilters = useMemo<SearchFilterValues>(
    () => ({
      genres,
      genreMode,
      language,
      minRating,
    }),
    [genreMode, genres, language, minRating],
  );

  const shouldSearch =
    trimmedQuery.length > 0 ||
    scope !== "all" ||
    preset !== "default" ||
    hasActiveFilters(currentFilters);

  const currentRequestKey = createRequestKey(
    trimmedQuery,
    scope,
    currentFilters,
    preset,
    reloadKey,
  );

  useEffect(() => {
    loadMoreControllerRef.current?.abort();

    if (!shouldSearch) {
      return;
    }

    const controller = new AbortController();

    async function runSearch() {
      try {
        const data = await searchMedia(
          trimmedQuery,
          scope,
          currentFilters,
          preset,
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
          totalResults: data.totalResults,
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
          totalResults: 0,
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
  }, [
    currentFilters,
    currentRequestKey,
    preset,
    scope,
    shouldSearch,
    trimmedQuery,
  ]);

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
  const totalResults = requestMatchesCurrentSearch
    ? requestState.totalResults
    : 0;
  const hasMore = requestMatchesCurrentSearch
    ? requestState.hasMore
    : false;
  const errorMessage = requestMatchesCurrentSearch
    ? requestState.errorMessage
    : "";

  const isLoading = shouldSearch && !requestMatchesCurrentSearch;
  const isLoadingMore =
    loadMoreMatchesCurrentSearch && loadMoreState.isLoading;
  const loadMoreErrorMessage = loadMoreMatchesCurrentSearch
    ? loadMoreState.errorMessage
    : "";

  async function loadMore() {
    if (!shouldSearch || isLoading || isLoadingMore || !hasMore) {
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
        preset,
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
          totalResults: data.totalResults,
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
    totalResults,
    isLoading,
    isLoadingMore,
    errorMessage,
    loadMoreErrorMessage,
    hasMore,
    loadMore,
    reload,
  };
}
