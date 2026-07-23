export type GenreMatchMode = "all" | "any";

export interface SearchFilterValues {
  genres: string[];
  genreMode: GenreMatchMode;
  language: string;
  minRating: string;
}
