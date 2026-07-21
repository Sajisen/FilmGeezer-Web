import { useCallback, useEffect, useState } from "react";
import { getMoreLikeThis } from "../services/moreLikeThisService";
import type { MediaItem, MediaType } from "../types/media";

interface MoreLikeThisState {
  requestKey: string;
  items: MediaItem[];
  errorMessage: string;
}

const initialState: MoreLikeThisState = {
  requestKey: "",
  items: [],
  errorMessage: "",
};

export function useMoreLikeThis(mediaType: MediaType, tmdbId: number) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<MoreLikeThisState>(initialState);

  const requestKey = `${mediaType}:${tmdbId}:${reloadKey}`;

  useEffect(() => {
    const controller = new AbortController();

    async function loadMoreLikeThis() {
      try {
        const items = await getMoreLikeThis(
          mediaType,
          tmdbId,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setState({
          requestKey,
          items,
          errorMessage: "",
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          requestKey,
          items: [],
          errorMessage:
            error instanceof Error
              ? error.message
              : "Related titles could not be loaded.",
        });
      }
    }

    void loadMoreLikeThis();

    return () => {
      controller.abort();
    };
  }, [mediaType, tmdbId, reloadKey, requestKey]);

  const retry = useCallback(() => {
    setReloadKey((currentKey) => currentKey + 1);
  }, []);

  const isLoading = state.requestKey !== requestKey;

  return {
    items: isLoading ? [] : state.items,
    isLoading,
    errorMessage: isLoading ? "" : state.errorMessage,
    retry,
  };
}
