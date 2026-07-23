import type {
  MediaDetails,
  MediaItem,
  SearchScope,
} from '../types/media'

import type { SearchFilterValues } from "../types/search";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
export interface SearchMediaResult {
  page: number;
  totalPages: number;
  totalResults: number;
  hasMore: boolean;
  results: MediaItem[];
}

interface SearchApiResponse {
  status: string;
  query: string;
  scope: SearchScope;

  filters: {
    genres: string[];
    genreMode: "all" | "any";
    language: string | null;
    minRating: number | null;
  };

  page: number;
  totalPages: number;
  totalResults: number;
  hasMore?: boolean;
  count: number;
  results: MediaItem[];
}

interface MediaDetailsApiResponse {
  status: string
  result: MediaDetails
}

interface ApiErrorResponse {
  status?: string;
  message?: string;
}

export async function searchMedia(
  query: string,
  scope: SearchScope = "all",
  filters: SearchFilterValues = {
    genres: [],
    genreMode: "all",
    language: "all",
    minRating: "all",
  },
  page = 1,
  signal?: AbortSignal,
): Promise<SearchMediaResult> {
  const searchParams = new URLSearchParams({
    scope,
    page: String(page),
    genreMode: filters.genreMode,
  });

  const trimmedQuery = query.trim();

  if (trimmedQuery) {
    searchParams.set("q", trimmedQuery);
  }

  filters.genres.forEach((genre) => {
    searchParams.append("genres", genre);
  });

  if (filters.language !== "all") {
    searchParams.set("language", filters.language);
  }

  if (filters.minRating !== "all") {
    searchParams.set("minRating", filters.minRating);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/search?${searchParams.toString()}`,
    {
      signal,
    },
  );

  const data: SearchApiResponse | ApiErrorResponse = await response.json();

  if (!response.ok) {
    const message =
      "message" in data && data.message
        ? data.message
        : "Search request failed.";

    throw new Error(message);
  }

  const searchData = data as SearchApiResponse;

  return {
    page: searchData.page,
    totalPages: searchData.totalPages,
    totalResults: searchData.totalResults,
    hasMore: searchData.hasMore ?? searchData.page < searchData.totalPages,
    results: searchData.results,
  };
}

export async function getMediaByTmdbId(
  mediaType: string | undefined,
  tmdbId: string | undefined,
  signal?: AbortSignal,
): Promise<MediaDetails | null> {
  if (!mediaType || !tmdbId) {
    return null;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/media/${encodeURIComponent(mediaType)}/${encodeURIComponent(tmdbId)}`,
    {
      signal,
    },
  );

  const data: MediaDetailsApiResponse | ApiErrorResponse =
    await response.json();

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const message =
      "message" in data && data.message
        ? data.message
        : "Media details request failed.";

    throw new Error(message);
  }

  return (data as MediaDetailsApiResponse).result;
}
