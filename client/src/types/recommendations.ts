import type { MediaItem } from "./media";

export type RecommendationCategory =
  | "movie"
  | "tv"
  | "anime"
  | "kdrama";

export type RecommendationBasis =
  | "preferences"
  | "watchlist"
  | "combined";

export interface PersonalRecommendations {
  available: boolean;
  basis: RecommendationBasis | null;
  minimumResults: number;
  results: MediaItem[];
}
