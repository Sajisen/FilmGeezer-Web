import type { Request, Response } from "express";
import {
  getSearchResults,
  type GenreMatchMode,
  type SearchFormat,
  type SearchPreset,
  type SearchSort,
} from "../services/searchResults.service.js";
import {
  TmdbRequestError,
  UnknownGenreError,
} from "../services/tmdb.service.js";
import type { SearchScope } from "../types/media.js";

const MAX_GENRES = 6;
const MIN_RELEASE_YEAR = 1870;
const MAX_RELEASE_YEAR = new Date().getUTCFullYear() + 1;

const ALLOWED_GENRES = new Set([
  "Action",
  "Action & Adventure",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Kids",
  "Music",
  "Mystery",
  "News",
  "Reality",
  "Romance",
  "Science Fiction",
  "Sci-Fi & Fantasy",
  "Soap",
  "Talk",
  "Thriller",
  "TV Movie",
  "War",
  "War & Politics",
  "Western",
]);

const ALLOWED_SORTS = new Set<SearchSort>([
  "best-match",
  "popularity-desc",
  "rating-desc",
  "release-desc",
  "release-asc",
]);

function getQueryString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue || undefined;
}

function getQueryStrings(value: unknown) {
  const values = Array.isArray(value) ? value : value ? [value] : [];

  return Array.from(
    new Set(
      values
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function parseYear(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const year = Number(value);

  return Number.isInteger(year) ? year : Number.NaN;
}

export async function searchMedia(req: Request, res: Response) {
  const query = getQueryString(req.query.q) ?? "";
  const scopeText = getQueryString(req.query.scope) ?? "all";
  const pageText = getQueryString(req.query.page);
  const minRatingText = getQueryString(req.query.minRating);
  const language = getQueryString(req.query.language)?.toLowerCase();
  const genreModeText = getQueryString(req.query.genreMode) ?? "all";
  const presetText = getQueryString(req.query.preset) ?? "default";
  const formatText = getQueryString(req.query.format) ?? "all";
  const fromYearText = getQueryString(req.query.fromYear);
  const toYearText = getQueryString(req.query.toYear);
  const sortText = getQueryString(req.query.sort) ?? "best-match";
  const establishedText = getQueryString(req.query.established) ?? "false";

  const legacyGenre = getQueryString(req.query.genre);
  const genres = getQueryStrings(req.query.genres);

  if (legacyGenre && !genres.includes(legacyGenre)) {
    genres.push(legacyGenre);
  }

  const page = pageText ? Number(pageText) : 1;
  const allowedScopes: SearchScope[] = [
    "all",
    "movie",
    "tv",
    "anime",
    "k-drama",
  ];

  if (!allowedScopes.includes(scopeText as SearchScope)) {
    res.status(400).json({
      status: "error",
      message: "Search scope must be all, movie, tv, anime, or k-drama.",
    });
    return;
  }

  if (!Number.isInteger(page) || page <= 0 || page > 100) {
    res.status(400).json({
      status: "error",
      message: "Page must be a whole number between 1 and 100.",
    });
    return;
  }

  if (query.length > 100) {
    res.status(400).json({
      status: "error",
      message: "Search text must not exceed 100 characters.",
    });
    return;
  }

  if (genres.length > MAX_GENRES) {
    res.status(400).json({
      status: "error",
      message: `Select no more than ${MAX_GENRES} genres.`,
    });
    return;
  }

  if (
    genres.some(
      (genre) => genre.length > 50 || !ALLOWED_GENRES.has(genre),
    )
  ) {
    res.status(400).json({
      status: "error",
      message: "One or more selected genres are not supported.",
    });
    return;
  }

  const allowedPresets = new Set<SearchPreset>([
    "default",
    "trending",
    "essentials",
    "sports",
    "movie-drama",
    "movie-drama-romance",
    "tv-comedy-drama",
    "anime-romance-drama-comedy",
  ]);

  if (!allowedPresets.has(presetText as SearchPreset)) {
    res.status(400).json({
      status: "error",
      message: "The selected collection preset is not supported.",
    });
    return;
  }

  const presetScopeRequirements: Partial<
    Record<SearchPreset, SearchScope>
  > = {
    sports: "anime",
    "movie-drama": "movie",
    "movie-drama-romance": "movie",
    "tv-comedy-drama": "tv",
    "anime-romance-drama-comedy": "anime",
  };
  const requiredPresetScope =
    presetScopeRequirements[presetText as SearchPreset];

  if (requiredPresetScope && scopeText !== requiredPresetScope) {
    res.status(400).json({
      status: "error",
      message: "This collection preset is not available for the selected category.",
    });
    return;
  }

  if (genreModeText !== "all" && genreModeText !== "any") {
    res.status(400).json({
      status: "error",
      message: "Genre matching mode must be all or any.",
    });
    return;
  }

  if (formatText !== "all" && formatText !== "movie" && formatText !== "tv") {
    res.status(400).json({
      status: "error",
      message: "Format must be all, movie, or tv.",
    });
    return;
  }

  if (!ALLOWED_SORTS.has(sortText as SearchSort)) {
    res.status(400).json({
      status: "error",
      message: "The selected sort order is not supported.",
    });
    return;
  }

  if (establishedText !== "true" && establishedText !== "false") {
    res.status(400).json({
      status: "error",
      message: "Established titles must be true or false.",
    });
    return;
  }

  if (language && !/^[a-z]{2}$/.test(language)) {
    res.status(400).json({
      status: "error",
      message: "Language must be a two-letter language code.",
    });
    return;
  }

  let minRating: number | undefined;

  if (minRatingText) {
    minRating = Number(minRatingText);

    if (Number.isNaN(minRating) || minRating < 0 || minRating > 10) {
      res.status(400).json({
        status: "error",
        message: "Minimum rating must be between 0 and 10.",
      });
      return;
    }
  }

  const releaseYearFrom = parseYear(fromYearText);
  const releaseYearTo = parseYear(toYearText);

  if (
    Number.isNaN(releaseYearFrom) ||
    Number.isNaN(releaseYearTo) ||
    (releaseYearFrom !== undefined &&
      (releaseYearFrom < MIN_RELEASE_YEAR ||
        releaseYearFrom > MAX_RELEASE_YEAR)) ||
    (releaseYearTo !== undefined &&
      (releaseYearTo < MIN_RELEASE_YEAR ||
        releaseYearTo > MAX_RELEASE_YEAR)) ||
    (releaseYearFrom !== undefined &&
      releaseYearTo !== undefined &&
      releaseYearFrom > releaseYearTo)
  ) {
    res.status(400).json({
      status: "error",
      message: `Release years must be between ${MIN_RELEASE_YEAR} and ${MAX_RELEASE_YEAR}, with the start year before the end year.`,
    });
    return;
  }

  const scope = scopeText as SearchScope;
  const genreMode = genreModeText as GenreMatchMode;
  const preset = presetText as SearchPreset;
  const sortBy = sortText as SearchSort;
  const requestedFormat = formatText as SearchFormat;
  const format: SearchFormat =
    scope === "movie" ? "movie" : scope === "tv" ? "tv" : requestedFormat;
  const establishedOnly = establishedText === "true";


  try {
    const data = await getSearchResults(query, scope, preset, page, {
      genres,
      genreMode,
      language,
      minRating,
      format,
      releaseYearFrom,
      releaseYearTo,
      sortBy,
      establishedOnly,
    });

    res.status(200).json({
      status: "success",
      query,
      scope,
      preset,
      filters: {
        genres,
        genreMode,
        language: language ?? null,
        minRating: minRating ?? null,
        format,
        releaseYearFrom: releaseYearFrom ?? null,
        releaseYearTo: releaseYearTo ?? null,
        sortBy,
        establishedOnly,
      },
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults,
      count: data.results.length,
      results: data.results,
      hasMore: data.hasMore,
    });
  } catch (error) {
    console.error("TMDB search error:", error);

    if (error instanceof UnknownGenreError) {
      res.status(400).json({
        status: "error",
        message: "One or more selected genres are not valid for this search.",
      });
      return;
    }

    if (
      error instanceof Error &&
      error.message.includes("TMDB_READ_ACCESS_TOKEN")
    ) {
      res.status(500).json({
        status: "error",
        message: "TMDB is not configured on the server.",
      });
      return;
    }

    if (error instanceof TmdbRequestError && error.status === 401) {
      res.status(502).json({
        status: "error",
        message: "TMDB authentication failed. Check the server token.",
      });
      return;
    }

    res.status(502).json({
      status: "error",
      message: "Unable to retrieve search results from TMDB.",
    });
  }
}
