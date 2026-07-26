
import type { SearchScope } from "../types/media";
import type {
  GenreMatchMode,
  SearchPreset,
} from "../types/search";


interface SearchLinkOptions {
  scope?: SearchScope;
  genres?: string[];
  genreMode?: GenreMatchMode;
  minRating?: string;
  preset?: SearchPreset;
}

export function buildSearchHref({
  scope = "all",
  genres = [],
  genreMode = "all",
  minRating = "all",
  preset = "default",
}: SearchLinkOptions) {
  const searchParams = new URLSearchParams();

  if (scope !== "all") {
    searchParams.set("scope", scope);
  }

  genres.forEach((genre) => {
    searchParams.append("genres", genre);
  });

  if (genres.length > 1 && genreMode === "any") {
    searchParams.set("genreMode", "any");
  }

  if (minRating !== "all") {
    searchParams.set("rating", minRating);
  }

  if (preset !== "default") {
    searchParams.set("preset", preset);
  }

  const queryString = searchParams.toString();
  return queryString ? `/search?${queryString}` : "/search";
}
