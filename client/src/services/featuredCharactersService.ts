import type {
  FeaturedCharacters,
} from "../types/featuredCharacter";
import type {
  MediaType,
} from "../types/media";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;

interface FeaturedCharactersApiResponse {
  status: "success";
  featuredCharacters:
    FeaturedCharacters;
}

interface ApiErrorResponse {
  status?: string;
  message?: string;
}

export async function getFeaturedCharacters(
  mediaType: MediaType,
  tmdbId: number,
  signal?: AbortSignal,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/media/` +
      `${mediaType}/${tmdbId}/` +
      "featured-characters",
    {
      signal,
    },
  );

  const data =
    (await response.json()) as
      | FeaturedCharactersApiResponse
      | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(
      "message" in data &&
        data.message
        ? data.message
        : "Featured characters request failed.",
    );
  }

  return (
    data as
      FeaturedCharactersApiResponse
  ).featuredCharacters;
}