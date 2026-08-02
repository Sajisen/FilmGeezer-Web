import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "../features/auth/authContext";
import { useWatchlist } from "../features/watchlist/watchlistContext";
import { getPersonalRecommendations } from "../services/recommendationsService";
import type { MediaItem } from "../types/media";
import type {
  RecommendationBasis,
  RecommendationCategory,
} from "../types/recommendations";
import { createMediaIdentity } from "../utils/recommendations";

interface RecommendationState {
  requestKey: string;
  available: boolean;
  basis: RecommendationBasis | null;
  minimumResults: number;
  items: MediaItem[];
  errorMessage: string;
}

const INITIAL_STATE: RecommendationState = {
  requestKey: "",
  available: false,
  basis: null,
  minimumResults: 15,
  items: [],
  errorMessage: "",
};

export function usePersonalRecommendations(
  category: RecommendationCategory,
) {
  const { status, user } = useAuth();
  const {
    items: watchlistItems,
    storageMode,
    syncStatus,
    isMutationPending,
  } = useWatchlist();
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<RecommendationState>(INITIAL_STATE);

  const watchlistSignalKey = useMemo(
    () =>
      storageMode === "account"
        ? watchlistItems.map(createMediaIdentity).sort().join("|")
        : "guest",
    [storageMode, watchlistItems],
  );

  const isAuthenticated = status === "authenticated" && user !== null;
  const authenticatedUserId = isAuthenticated ? user.userId : null;
  const canRequest =
    authenticatedUserId !== null &&
    storageMode === "account" &&
    syncStatus !== "loading" &&
    !isMutationPending;
  const requestKey = canRequest
    ? `${authenticatedUserId}:${category}:${watchlistSignalKey}:${reloadKey}`
    : `paused:${category}:${reloadKey}`;

  useEffect(() => {
    if (!canRequest) {
      return;
    }

    const controller = new AbortController();

    async function loadRecommendations() {
      try {
        const result = await getPersonalRecommendations(
          category,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setState({
          requestKey,
          available: result.available,
          basis: result.basis,
          minimumResults: result.minimumResults,
          items: result.results,
          errorMessage: "",
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          requestKey,
          available: false,
          basis: null,
          minimumResults: 15,
          items: [],
          errorMessage:
            error instanceof Error
              ? error.message
              : "Personal recommendations could not be loaded.",
        });
      }
    }

    void loadRecommendations();

    return () => {
      controller.abort();
    };
  }, [canRequest, category, requestKey]);

  const retry = useCallback(() => {
    setReloadKey((currentKey) => currentKey + 1);
  }, []);

  const isLoading = canRequest && state.requestKey !== requestKey;
  const canShowResult = canRequest && !isLoading;

  return {
    available: canShowResult && state.available,
    basis: canShowResult ? state.basis : null,
    minimumResults: state.minimumResults,
    items: canShowResult ? state.items : [],
    isLoading,
    errorMessage: canShowResult ? state.errorMessage : "",
    retry,
  };
}
