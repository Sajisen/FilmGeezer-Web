export type GenreMatchMode = "all" | "any";

export type SearchPreset = "default" | "trending" | "essentials";

export interface SearchFilterValues {
  genres: string[];
  genreMode: GenreMatchMode;
  language: string;
  minRating: string;
}
