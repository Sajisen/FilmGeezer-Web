import type { MediaItem, MediaType } from "../types/media";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface MoreLikeThisApiResponse {
  status: "success";
  count: number;
  results: MediaItem[];
}

interface ApiErrorResponse {
  status?: string;
  message?: string;
}

export async function getMoreLikeThis(
  mediaType: MediaType,
  tmdbId: number,
  signal?: AbortSignal,
): Promise<MediaItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/media/${mediaType}/${tmdbId}/more-like-this`,
    {
      signal,
    },
  );

  const data = (await response.json()) as
    | MoreLikeThisApiResponse
    | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      "message" in data && data.message
        ? data.message
        : "Related titles request failed.",
    );
  }

  return (data as MoreLikeThisApiResponse).results;
}
