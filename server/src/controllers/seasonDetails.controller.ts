import type {
  Request,
  Response,
} from "express";
import { getSeasonDetails } from "../services/seasonDetails.service.js";
import {
  TmdbRequestError,
} from "../services/tmdb.service.js";

export async function getTvSeasonDetails(
  req: Request,
  res: Response,
) {
  const tmdbId =
    Number(req.params.tmdbId);

  const seasonNumber =
    Number(
      req.params.seasonNumber,
    );

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

  if (
    !Number.isInteger(
      seasonNumber,
    ) ||
    seasonNumber <= 0
  ) {
    res.status(400).json({
      status: "error",

      message:
        "Season number must be a positive integer.",
    });

    return;
  }

  try {
    const season =
      await getSeasonDetails(
        tmdbId,
        seasonNumber,
      );

    res.status(200).json({
      status: "success",
      season,
    });
  } catch (error) {
    console.error(
      "TV season-details error:",
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
          "The requested season was not found.",
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
        "The selected season could not be retrieved.",
    });
  }
}