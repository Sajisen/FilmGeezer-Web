import type {
  PersonalRecommendations,
  RecommendationBasis,
  RecommendationCategory,
} from "../types/recommendations";
import type { MediaItem } from "../types/media";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface RecommendationsApiResponse {
  status: "success";
  code:
    | "RECOMMENDATIONS_READY"
    | "RECOMMENDATIONS_NOT_ENOUGH_SIGNAL";
  category: RecommendationCategory;
  available: boolean;
  basis: RecommendationBasis | null;
  minimumResults: number;
  results: MediaItem[];
}

interface RecommendationsErrorResponse {
  status?: "error";
  code?: string;
  message?: string;
}

export async function getPersonalRecommendations(
  category: RecommendationCategory,
  signal?: AbortSignal,
): Promise<PersonalRecommendations> {
  const response = await fetch(
    `${API_BASE_URL}/api/recommendations/${category}`,
    {
      credentials: "include",
      signal,
    },
  );

  const data = (await response.json()) as
    | RecommendationsApiResponse
    | RecommendationsErrorResponse;

  if (!response.ok) {
    throw new Error(
      "message" in data && data.message
        ? data.message
        : "Personal recommendations could not be loaded.",
    );
  }

  const result = data as RecommendationsApiResponse;

  return {
    available: result.available,
    basis: result.basis,
    minimumResults: result.minimumResults,
    results: result.results,
  };
}
