import type { MediaType } from "../types/media";
import type { WatchAvailability } from "../types/watchAvailability";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface WatchAvailabilityApiResponse {
  status: "success";
  availability: WatchAvailability;
}

interface ApiErrorResponse {
  status?: string;
  message?: string;
}

export async function getWatchAvailability(
  mediaType: MediaType,
  tmdbId: number,
  region: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({
    region,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/media/` +
      `${mediaType}/${tmdbId}/` +
      `watch-availability?${params}`,
    {
      signal,
    },
  );

  const data = (await response.json()) as
    | WatchAvailabilityApiResponse
    | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      "message" in data && data.message
        ? data.message
        : "Streaming availability request failed.",
    );
  }

  return (data as WatchAvailabilityApiResponse).availability;
}
