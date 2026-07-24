import type { Request, Response } from "express";
import { DatabaseConfigurationError } from "../config/database.js";
import { ContentLinksDataSourceError } from "../features/contentLinks/contentLinks.repository.js";
import { getContentLinksByMedia } from "../features/contentLinks/contentLinks.service.js";
import type { ContentLinkMediaType } from "../features/contentLinks/contentLinks.types.js";

export async function getProviderLinksByMedia(req: Request, res: Response) {
  const { mediaType, tmdbId } = req.params;

  if (mediaType !== "movie" && mediaType !== "tv") {
    res.status(400).json({
      status: "error",
      message: "Media type must be either movie or tv.",
    });
    return;
  }

  const numericTmdbId = Number(tmdbId);

  if (!Number.isInteger(numericTmdbId) || numericTmdbId <= 0) {
    res.status(400).json({
      status: "error",
      message: "TMDB ID must be a valid positive number.",
    });
    return;
  }

  try {
    const result = await getContentLinksByMedia(
      mediaType as ContentLinkMediaType,
      numericTmdbId,
    );

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(result);
  } catch (error) {
    const isUnavailableError =
      error instanceof DatabaseConfigurationError ||
      error instanceof ContentLinksDataSourceError;

    console.error("[content-links] Request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message:
        error instanceof Error
          ? error.message
          : "Unknown content-links error",
    });

    res.status(isUnavailableError ? 503 : 500).json({
      status: "error",
      message: isUnavailableError
        ? "FilmGeezer links are temporarily unavailable."
        : "FilmGeezer links could not be loaded.",
    });
  }
}