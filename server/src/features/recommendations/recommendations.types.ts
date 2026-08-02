import type { MediaItem, MediaType } from "../../types/media.js";
import type { RECOMMENDATION_CATEGORY_VALUES } from "./recommendations.constants.js";

export type RecommendationCategory =
  (typeof RECOMMENDATION_CATEGORY_VALUES)[number];

export type RecommendationBasis =
  | "preferences"
  | "watchlist"
  | "combined";

export interface RecommendationResult {
  available: boolean;
  basis: RecommendationBasis | null;
  minimumResults: number;
  results: MediaItem[];
}

export interface RecommendationProfileMedia {
  tmdbId: number;
  mediaType: MediaType;
  genres: string[];
  language: string;
  category: RecommendationCategory;
  recencyWeight: number;
}
