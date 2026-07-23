import type { Request, Response } from "express";
import {
  getSearchResults,
  type GenreMatchMode,
} from "../services/searchResults.service.js";
import {
  TmdbRequestError,
  UnknownGenreError,
} from "../services/tmdb.service.js";
import type { SearchScope } from "../types/media.js";

const MAX_GENRES = 6;

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

export async function searchMedia(req: Request, res: Response) {
  const query = getQueryString(req.query.q) ?? "";
  const scopeText = getQueryString(req.query.scope) ?? "all";
  const pageText = getQueryString(req.query.page);
  const minRatingText = getQueryString(req.query.minRating);
  const language = getQueryString(req.query.language)?.toLowerCase();
  const genreModeText = getQueryString(req.query.genreMode) ?? "all";

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

  if (!Number.isInteger(page) || page <= 0) {
    res.status(400).json({
      status: "error",
      message: "Page must be a valid positive number.",
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

  if (genres.some((genre) => genre.length > 50)) {
    res.status(400).json({
      status: "error",
      message: "Each genre must not exceed 50 characters.",
    });
    return;
  }

  if (genres.some((genre) => !ALLOWED_GENRES.has(genre))) {
    res.status(400).json({
      status: "error",
      message: "One or more selected genres are not supported.",
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

  const scope = scopeText as SearchScope;
  const genreMode = genreModeText as GenreMatchMode;

  if (
    !query &&
    scope === "all" &&
    genres.length === 0 &&
    !language &&
    minRating === undefined
  ) {
    res.status(200).json({
      status: "success",
      query,
      scope,
      filters: {
        genres,
        genreMode,
        language: null,
        minRating: null,
      },
      page: 1,
      totalPages: 0,
      totalResults: 0,
      hasMore: false,
      count: 0,
      results: [],
    });
    return;
  }

  try {
    const data = await getSearchResults(query, scope, page, {
      genres,
      genreMode,
      language,
      minRating,
    });

    res.status(200).json({
      status: "success",
      query,
      scope,
      filters: {
        genres,
        genreMode,
        language: language ?? null,
        minRating: minRating ?? null,
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
