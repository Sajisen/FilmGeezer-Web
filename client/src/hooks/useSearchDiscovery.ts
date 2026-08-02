import { useCallback, useEffect, useState } from "react";
import { searchMedia } from "../services/mediaService";
import type { MediaItem } from "../types/media";
import { createDefaultSearchFilters } from "../config/searchFilters";

interface DiscoveryRequestState {
  requestKey: number;
  items: MediaItem[];
  errorMessage: string;
}

const initialRequestState: DiscoveryRequestState = {
  requestKey: -1,
  items: [],
  errorMessage: "",
};

export function useSearchDiscovery(enabled: boolean) {
  const [reloadKey, setReloadKey] = useState(0);
  const [requestState, setRequestState] =
    useState<DiscoveryRequestState>(initialRequestState);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const controller = new AbortController();

    async function loadDiscoveryItems() {
      try {
        const response = await searchMedia(
          "",
          "all",
          createDefaultSearchFilters("all"),
          "default",
          1,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          requestKey: reloadKey,
          items: response.results,
          errorMessage: "",
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          requestKey: reloadKey,
          items: [],
          errorMessage:
            error instanceof Error
              ? error.message
              : "Something went wrong while loading discovery titles.",
        });
      }
    }

    void loadDiscoveryItems();

    return () => {
      controller.abort();
    };
  }, [enabled, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((currentKey) => currentKey + 1);
  }, []);

  const requestMatches = enabled && requestState.requestKey === reloadKey;

  return {
    items: requestMatches ? requestState.items : [],
    isLoading: enabled && !requestMatches,
    errorMessage: requestMatches ? requestState.errorMessage : "",
    reload,
  };
}
