import type {
  SeasonDetails,
} from "../types/season";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

interface SeasonDetailsApiResponse {
  status: "success";
  season: SeasonDetails;
}

interface ApiErrorResponse {
  status?: string;
  message?: string;
}

export async function getSeasonDetails(
  tmdbId: number,
  seasonNumber: number,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/media/tv/` +
      `${tmdbId}/seasons/` +
      seasonNumber,
    {
      signal,
    },
  );

  const data =
    (await response.json()) as
      | SeasonDetailsApiResponse
      | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      "message" in data &&
        data.message
        ? data.message
        : "Season-details request failed.",
    );
  }

  return (
    data as
      SeasonDetailsApiResponse
  ).season;
}