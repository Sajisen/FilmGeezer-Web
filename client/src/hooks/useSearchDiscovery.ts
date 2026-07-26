import { useCallback, useEffect, useState } from "react";
import { getHomeCollections } from "../services/homeService";
import type { HomeCollections } from "../types/home";
import type { MediaItem } from "../types/media";
import { removeDuplicateMedia } from "../utils/media";

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

function shuffled<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function createMixedDiscoveryItems(collections: HomeCollections) {
  const categoryPools = [
    shuffled(collections.trendingMovies),
    shuffled(collections.trendingTv),
    shuffled(collections.trendingAnime),
    shuffled(collections.trendingKDrama),
  ];

  const maximumPoolLength = Math.max(
    0,
    ...categoryPools.map((items) => items.length),
  );

  const mixedItems: MediaItem[] = [];

  for (let index = 0; index < maximumPoolLength; index += 1) {
    categoryPools.forEach((items) => {
      const item = items[index];

      if (item) {
        mixedItems.push(item);
      }
    });
  }

  return removeDuplicateMedia(mixedItems).slice(0, 32);
}

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
        const collections = await getHomeCollections(controller.signal);

        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          requestKey: reloadKey,
          items: createMixedDiscoveryItems(collections),
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
