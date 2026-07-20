import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { getFeaturedCharacters } from "../services/featuredCharactersService";
import type {
  FeaturedCharacters,
} from "../types/featuredCharacter";
import type {
  MediaType,
} from "../types/media";

interface FeaturedCharactersState {
  requestKey: string;

  featuredCharacters:
    | FeaturedCharacters
    | null;

  errorMessage: string;
}

const initialState:
  FeaturedCharactersState = {
    requestKey: "",
    featuredCharacters: null,
    errorMessage: "",
  };

export function useFeaturedCharacters(
  mediaType: MediaType,
  tmdbId: number,
) {
  const [reloadKey, setReloadKey] =
    useState(0);

  const [state, setState] =
    useState<FeaturedCharactersState>(
      initialState,
    );

  const requestKey =
    `${mediaType}:${tmdbId}:` +
    reloadKey;

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadCharacters() {
      try {
        const featuredCharacters =
          await getFeaturedCharacters(
            mediaType,
            tmdbId,
            controller.signal,
          );

        if (
          controller.signal.aborted
        ) {
          return;
        }

        setState({
          requestKey,
          featuredCharacters,
          errorMessage: "",
        });
      } catch (error: unknown) {
        if (
          controller.signal.aborted
        ) {
          return;
        }

        setState({
          requestKey,
          featuredCharacters: null,

          errorMessage:
            error instanceof Error
              ? error.message
              : "Featured characters could not be loaded.",
        });
      }
    }

    void loadCharacters();

    return () => {
      controller.abort();
    };
  }, [
    mediaType,
    tmdbId,
    reloadKey,
    requestKey,
  ]);

  const retry = useCallback(() => {
    setReloadKey(
      (currentKey) =>
        currentKey + 1,
    );
  }, []);

  const isLoading =
    state.requestKey !==
    requestKey;

  return {
    featuredCharacters:
      isLoading
        ? null
        : state.featuredCharacters,

    isLoading,

    errorMessage:
      isLoading
        ? ""
        : state.errorMessage,

    retry,
  };
}