import type {
  Request,
  Response,
} from "express";
import { getFeaturedCharacters } from "../services/featuredCharacters.service.js";
import {
  TmdbRequestError,
} from "../services/tmdb.service.js";
import type {
  MediaType,
} from "../types/media.js";

export async function getMediaFeaturedCharacters(
  req: Request,
  res: Response,
) {
  const mediaTypeText =
    req.params.mediaType;

  const tmdbId =
    Number(req.params.tmdbId);

  if (
    mediaTypeText !== "movie" &&
    mediaTypeText !== "tv"
  ) {
    res.status(400).json({
      status: "error",

      message:
        "Media type must be movie or tv.",
    });

    return;
  }

  if (
    !Number.isInteger(tmdbId) ||
    tmdbId <= 0
  ) {
    res.status(400).json({
      status: "error",

      message:
        "TMDB ID must be a positive integer.",
    });

    return;
  }

  try {
    const featuredCharacters =
      await getFeaturedCharacters(
        mediaTypeText as
          MediaType,

        tmdbId,
      );

    res.status(200).json({
      status: "success",
      featuredCharacters,
    });
  } catch (error) {
    console.error(
      "Featured characters error:",
      error,
    );

    if (
      error instanceof
        TmdbRequestError &&
      error.status === 404
    ) {
      res.status(404).json({
        status: "error",

        message:
          "Media item was not found.",
      });

      return;
    }

    if (
      error instanceof Error &&
      error.message.includes(
        "TMDB_READ_ACCESS_TOKEN",
      )
    ) {
      res.status(500).json({
        status: "error",

        message:
          "TMDB is not configured on the server.",
      });

      return;
    }

    res.status(502).json({
      status: "error",

      message:
        "Featured characters could not be retrieved.",
    });
  }
}