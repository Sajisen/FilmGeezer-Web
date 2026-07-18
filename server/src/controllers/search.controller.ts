import type { Request, Response } from "express";
import {
  searchTmdbMedia,
  TmdbRequestError,
  UnknownGenreError,
} from "../services/tmdb.service.js";
import type { SearchScope } from "../types/media.js";

function getQueryString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue || undefined;
}

export async function searchMedia(req: Request, res: Response) {
  const query = getQueryString(req.query.q) ?? "";

  const scopeText = getQueryString(req.query.scope) ?? "all";

  const genre = getQueryString(req.query.genre);

  const language = getQueryString(req.query.language);

  const pageText = getQueryString(req.query.page);

  const minRatingText = getQueryString(req.query.minRating);

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

  if (query.length > 100) {
    res.status(400).json({
      status: "error",
      message: "Search text must not exceed 100 characters.",
    });
    return;
  }

  if (genre && genre.length > 50) {
    res.status(400).json({
      status: "error",
      message: "Genre must not exceed 50 characters.",
    });
    return;
  }

  if (language && !/^[a-zA-Z]{2}$/.test(language)) {
    res.status(400).json({
      status: "error",
      message: "Language must be a two-letter language code.",
    });
    return;
  }

  const scope = scopeText as SearchScope;

  if (!query) {
    res.status(200).json({
      status: "success",
      query,
      scope,
      filters: {
        genre: genre ?? null,
        language: language?.toLowerCase() ?? null,
        minRating: minRating ?? null,
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
    const data = await searchTmdbMedia(query, scope, page, {
      genre,
      language,
      minRating,
    });

    res.status(200).json({
      status: "success",
      query,
      scope,
      filters: {
        genre: genre ?? null,
        language: language?.toLowerCase() ?? null,
        minRating: minRating ?? null,
      },
      page: data.page,
      totalPages: data.totalPages,
      totalResults: data.totalResults,
      count: data.results.length,
      results: data.results,
      hasMore: data.hasMore ?? data.page < data.totalPages,
    });
  } catch (error) {
    console.error("TMDB search error:", error);

    if (error instanceof UnknownGenreError) {
      res.status(400).json({
        status: "error",
        message: "The selected genre is not valid for this search scope.",
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
