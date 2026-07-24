import type { SearchScope } from "../types/media";
import type {
  SearchFilterValues,
  SearchFormat,
  SearchSort,
} from "../types/search";

export type FilterOptionGroup =
  | "Movies & series"
  | "Movies"
  | "Series";

export interface FilterOption {
  label: string;
  value: string;
  description?: string;
  group?: FilterOptionGroup;
}

export const MIN_RELEASE_YEAR = 1900;
export const MAX_RELEASE_YEAR = new Date().getFullYear() + 2;

export const movieGenreOptions: FilterOption[] = [
  { label: "Action", value: "Action" },
  { label: "Adventure", value: "Adventure" },
  { label: "Animation", value: "Animation" },
  { label: "Comedy", value: "Comedy" },
  { label: "Crime", value: "Crime" },
  { label: "Documentary", value: "Documentary" },
  { label: "Drama", value: "Drama" },
  { label: "Family", value: "Family" },
  { label: "Fantasy", value: "Fantasy" },
  { label: "History", value: "History" },
  { label: "Horror", value: "Horror" },
  { label: "Music", value: "Music" },
  { label: "Mystery", value: "Mystery" },
  { label: "Romance", value: "Romance" },
  { label: "Science Fiction", value: "Science Fiction" },
  { label: "TV Movie", value: "TV Movie" },
  { label: "Thriller", value: "Thriller" },
  { label: "War", value: "War" },
  { label: "Western", value: "Western" },
];

export const tvGenreOptions: FilterOption[] = [
  { label: "Action & Adventure", value: "Action & Adventure" },
  { label: "Animation", value: "Animation" },
  { label: "Comedy", value: "Comedy" },
  { label: "Crime", value: "Crime" },
  { label: "Documentary", value: "Documentary" },
  { label: "Drama", value: "Drama" },
  { label: "Family", value: "Family" },
  { label: "Kids", value: "Kids" },
  { label: "Mystery", value: "Mystery" },
  { label: "News", value: "News" },
  { label: "Reality", value: "Reality" },
  { label: "Sci-Fi & Fantasy", value: "Sci-Fi & Fantasy" },
  { label: "Soap", value: "Soap" },
  { label: "Talk", value: "Talk" },
  { label: "War & Politics", value: "War & Politics" },
  { label: "Western", value: "Western" },
];

const animeGenreOptions: FilterOption[] = [
  { label: "Comedy", value: "Comedy", group: "Movies & series" },
  { label: "Drama", value: "Drama", group: "Movies & series" },
  { label: "Family", value: "Family", group: "Movies & series" },
  { label: "Mystery", value: "Mystery", group: "Movies & series" },

  { label: "Action", value: "Action", group: "Movies" },
  { label: "Adventure", value: "Adventure", group: "Movies" },
  { label: "Fantasy", value: "Fantasy", group: "Movies" },
  { label: "Horror", value: "Horror", group: "Movies" },
  { label: "Romance", value: "Romance", group: "Movies" },
  {
    label: "Science Fiction",
    value: "Science Fiction",
    group: "Movies",
  },
  { label: "Thriller", value: "Thriller", group: "Movies" },

  {
    label: "Action & Adventure",
    value: "Action & Adventure",
    group: "Series",
  },
  {
    label: "Sci-Fi & Fantasy",
    value: "Sci-Fi & Fantasy",
    group: "Series",
  },
];

const kDramaGenreOptions: FilterOption[] = [
  { label: "Comedy", value: "Comedy", group: "Movies & series" },
  { label: "Crime", value: "Crime", group: "Movies & series" },
  { label: "Drama", value: "Drama", group: "Movies & series" },
  { label: "Family", value: "Family", group: "Movies & series" },
  { label: "Mystery", value: "Mystery", group: "Movies & series" },

  { label: "Action", value: "Action", group: "Movies" },
  { label: "History", value: "History", group: "Movies" },
  { label: "Romance", value: "Romance", group: "Movies" },
  { label: "Thriller", value: "Thriller", group: "Movies" },

  {
    label: "Action & Adventure",
    value: "Action & Adventure",
    group: "Series",
  },
  {
    label: "War & Politics",
    value: "War & Politics",
    group: "Series",
  },
];

const movieGenreValues = new Set(
  movieGenreOptions.map((option) => option.value),
);

const tvGenreValues = new Set(
  tvGenreOptions.map((option) => option.value),
);

const combinedGenreOptions: FilterOption[] = Array.from(
  new Set([
    ...movieGenreOptions.map((option) => option.value),
    ...tvGenreOptions.map((option) => option.value),
  ]),
)
  .map((value) => {
    const isMovieGenre = movieGenreValues.has(value);
    const isSeriesGenre = tvGenreValues.has(value);

    return {
      label: value,
      value,
      group:
        isMovieGenre && isSeriesGenre
          ? ("Movies & series" as const)
          : isMovieGenre
            ? ("Movies" as const)
            : ("Series" as const),
    };
  })
  .sort((firstOption, secondOption) => {
    const groupOrder = {
      "Movies & series": 0,
      Movies: 1,
      Series: 2,
    };

    const groupDifference =
      groupOrder[firstOption.group] - groupOrder[secondOption.group];

    return groupDifference !== 0
      ? groupDifference
      : firstOption.label.localeCompare(secondOption.label);
  });

export const languageOptions: FilterOption[] = [
  { label: "English", value: "en" },
  { label: "Korean", value: "ko" },
  { label: "Japanese", value: "ja" },
  { label: "Hindi", value: "hi" },
  { label: "Tamil", value: "ta" },
  { label: "Telugu", value: "te" },
  { label: "Spanish", value: "es" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Italian", value: "it" },
  { label: "Portuguese", value: "pt" },
  { label: "Chinese", value: "zh" },
];

export const ratingOptions: FilterOption[] = [
  {
    label: "Any rating",
    value: "all",
    description: "Do not limit by score",
  },
  {
    label: "Worth a look",
    value: "6",
    description: "Rated 6.0 or higher",
  },
  {
    label: "Well rated",
    value: "7",
    description: "Rated 7.0 or higher",
  },
  {
    label: "Highly rated",
    value: "8",
    description: "Rated 8.0 or higher",
  },
];

export const formatOptions: Array<{
  label: string;
  value: SearchFormat;
  description: string;
}> = [
  {
    label: "All formats",
    value: "all",
    description: "Include Movies and Series",
  },
  {
    label: "Movies",
    value: "movie",
    description: "Show feature-length and film results",
  },
  {
    label: "Series",
    value: "tv",
    description: "Show episodic TV and streaming series",
  },
];

export const sortOptions: Array<{
  label: string;
  value: SearchSort;
  description: string;
}> = [
  {
    label: "Best match",
    value: "best-match",
    description: "Prioritize title relevance, then popularity",
  },
  {
    label: "Most popular",
    value: "popularity-desc",
    description: "Show widely watched and discussed titles first",
  },
  {
    label: "Highest rated",
    value: "rating-desc",
    description: "Show stronger audience scores first",
  },
  {
    label: "Newest first",
    value: "release-desc",
    description: "Show recent releases and first-air dates first",
  },
  {
    label: "Oldest first",
    value: "release-asc",
    description: "Show earlier releases and first-air dates first",
  },
];

export function createDefaultSearchFilters(
  scope: SearchScope = "all",
): SearchFilterValues {
  return {
    genres: [],
    genreMode: "all",
    language: "all",
    minRating: "all",
    format: getFixedFormat(scope) ?? "all",
    releaseYearFrom: null,
    releaseYearTo: null,
    sortBy: "best-match",
    establishedOnly: false,
  };
}

export function getGenreOptions(scope: SearchScope) {
  if (scope === "movie") {
    return movieGenreOptions;
  }

  if (scope === "tv") {
    return tvGenreOptions;
  }

  if (scope === "anime") {
    return animeGenreOptions;
  }

  if (scope === "k-drama") {
    return kDramaGenreOptions;
  }

  return combinedGenreOptions;
}

export function supportsLanguageFilter(scope: SearchScope) {
  return scope !== "anime" && scope !== "k-drama";
}

export function supportsFormatFilter(scope: SearchScope) {
  return scope === "all" || scope === "anime" || scope === "k-drama";
}

export function getFixedFormat(scope: SearchScope): SearchFormat | null {
  if (scope === "movie") {
    return "movie";
  }

  if (scope === "tv") {
    return "tv";
  }

  return null;
}

export function sanitizeFormat(
  scope: SearchScope,
  format: SearchFormat,
): SearchFormat {
  return getFixedFormat(scope) ?? format;
}

export function isGenreAllowed(scope: SearchScope, genre: string) {
  return getGenreOptions(scope).some((option) => option.value === genre);
}

export function sanitizeGenres(scope: SearchScope, genres: string[]) {
  const allowedGenres = new Set(
    getGenreOptions(scope).map((option) => option.value),
  );

  return Array.from(new Set(genres)).filter((genre) =>
    allowedGenres.has(genre),
  );
}

export function getLanguageLabel(language: string) {
  return (
    languageOptions.find((option) => option.value === language)?.label ??
    language.toUpperCase()
  );
}

export function getRatingLabel(value: string) {
  return (
    ratingOptions.find((option) => option.value === value)?.label ??
    `Rating ${value}+`
  );
}

export function getFormatLabel(format: SearchFormat) {
  return (
    formatOptions.find((option) => option.value === format)?.label ??
    "All formats"
  );
}

export function getSortLabel(sortBy: SearchSort) {
  return (
    sortOptions.find((option) => option.value === sortBy)?.label ??
    "Best match"
  );
}

export function getReleasePeriodLabel(
  releaseYearFrom: number | null,
  releaseYearTo: number | null,
) {
  if (releaseYearFrom === null && releaseYearTo === null) {
    return "Any release year";
  }

  if (releaseYearFrom !== null && releaseYearTo !== null) {
    return releaseYearFrom === releaseYearTo
      ? String(releaseYearFrom)
      : `${releaseYearFrom}–${releaseYearTo}`;
  }

  if (releaseYearFrom !== null) {
    return `From ${releaseYearFrom}`;
  }

  return `Up to ${releaseYearTo}`;
}
