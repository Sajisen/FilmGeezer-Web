export type GenreMatchMode = "all" | "any";

export type SearchPreset =
  | "default"
  | "trending"
  | "essentials"
  | "sports"
  | "movie-drama"
  | "movie-drama-romance"
  | "tv-comedy-drama"
  | "anime-romance-drama-comedy";

export type SearchFormat = "all" | "movie" | "tv";

export type SearchSort =
  | "best-match"
  | "popularity-desc"
  | "rating-desc"
  | "release-desc"
  | "release-asc";

export interface SearchFilterValues {
  genres: string[];
  genreMode: GenreMatchMode;
  language: string;
  minRating: string;
  format: SearchFormat;
  releaseYearFrom: number | null;
  releaseYearTo: number | null;
  sortBy: SearchSort;
  establishedOnly: boolean;
}
