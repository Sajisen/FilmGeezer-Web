import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  AdminContentNotFoundError,
  AdminContentPersistenceError,
  AdminContentStateConflictError,
  AdminContentTmdbNotFoundError,
} from "../features/admin/admin.content.errors.js";
import {
  changeAdminContentStatus,
  getAdminContent,
  listAdminContent,
  saveAdminContent,
  searchAdminContentTmdb,
} from "../features/admin/admin.content.service.js";
import type {
  AdminContentDetail,
  AdminContentSummary,
} from "../features/admin/admin.content.types.js";
import { TmdbRequestError } from "../services/tmdb.service.js";
import { getAdminContext } from "../middleware/admin.middleware.js";

function createRequestMetadata(request: Request) {
  return {
    ipAddress: request.ip || request.socket.remoteAddress || null,
    userAgent: request.get("user-agent") ?? null,
  };
}

function serializeSummary(summary: AdminContentSummary) {
  return {
    ...summary,
    updatedAt: summary.updatedAt?.toISOString() ?? null,
  };
}

function serializeDetail(detail: AdminContentDetail) {
  return {
    ...detail,
    updatedAt: detail.updatedAt?.toISOString() ?? null,
  };
}

function sendAdminContentError(
  error: unknown,
  response: Response,
): boolean {
  if (error instanceof z.ZodError) {
    response.status(400).json({
      status: "error",
      code: "ADMIN_CONTENT_VALIDATION_FAILED",
      message:
        error.issues[0]?.message ??
        "The administrator content request is invalid.",
    });
    return true;
  }

  if (error instanceof AdminContentTmdbNotFoundError) {
    response.status(404).json({
      status: "error",
      code: "ADMIN_CONTENT_TMDB_TITLE_NOT_FOUND",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminContentNotFoundError) {
    response.status(404).json({
      status: "error",
      code: "ADMIN_CONTENT_ENTRY_NOT_FOUND",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminContentStateConflictError) {
    response.status(409).json({
      status: "error",
      code: "ADMIN_CONTENT_STATE_CONFLICT",
      message: error.message,
    });
    return true;
  }

  if (error instanceof TmdbRequestError) {
    response.status(error.status === 404 ? 404 : 503).json({
      status: "error",
      code:
        error.status === 404
          ? "ADMIN_CONTENT_TMDB_TITLE_NOT_FOUND"
          : "ADMIN_CONTENT_TMDB_TEMPORARILY_UNAVAILABLE",
      message:
        error.status === 404
          ? "The selected TMDB title could not be found."
          : "TMDB title information is temporarily unavailable.",
    });
    return true;
  }

  if (error instanceof AdminContentPersistenceError) {
    response.status(503).json({
      status: "error",
      code: "ADMIN_CONTENT_TEMPORARILY_UNAVAILABLE",
      message: error.message,
    });
    return true;
  }

  return false;
}

export async function getAdminContentEntries(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listAdminContent({
      page:
        typeof request.query.page === "string"
          ? request.query.page
          : undefined,
      pageSize:
        typeof request.query.pageSize === "string"
          ? request.query.pageSize
          : undefined,
      mediaType:
        typeof request.query.mediaType === "string"
          ? request.query.mediaType
          : undefined,
      status:
        typeof request.query.status === "string"
          ? request.query.status
          : undefined,
      search:
        typeof request.query.search === "string"
          ? request.query.search
          : undefined,
    });

    response.status(200).json({
      status: "success",
      code: "ADMIN_CONTENT_ENTRIES_READY",
      items: result.items.map(serializeSummary),
      pagination: result.pagination,
    });
  } catch (error) {
    if (!sendAdminContentError(error, response)) {
      next(error);
    }
  }
}

export async function getAdminContentTmdbSearch(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await searchAdminContentTmdb({
      mediaType:
        typeof request.query.mediaType === "string"
          ? request.query.mediaType
          : undefined,
      query:
        typeof request.query.query === "string"
          ? request.query.query
          : undefined,
      page:
        typeof request.query.page === "string"
          ? request.query.page
          : undefined,
    });

    response.status(200).json({
      status: "success",
      code: "ADMIN_CONTENT_TMDB_RESULTS_READY",
      items: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    if (!sendAdminContentError(error, response)) {
      next(error);
    }
  }
}

export async function getAdminContentEntry(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await getAdminContent(
      request.params.mediaType,
      request.params.tmdbId,
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_CONTENT_ENTRY_READY",
      detail: serializeDetail(detail),
    });
  } catch (error) {
    if (!sendAdminContentError(error, response)) {
      next(error);
    }
  }
}

export async function putAdminContentEntry(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await saveAdminContent({
      administrator: getAdminContext(request),
      mediaType: request.params.mediaType,
      tmdbId: request.params.tmdbId,
      body: request.body,
      requestMetadata: createRequestMetadata(request),
    });

    response.status(200).json({
      status: "success",
      code: "ADMIN_CONTENT_ENTRY_SAVED",
      message: "The FilmGeezer content links were saved.",
      detail: serializeDetail(detail),
    });
  } catch (error) {
    if (!sendAdminContentError(error, response)) {
      next(error);
    }
  }
}

export async function patchAdminContentEntryStatus(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await changeAdminContentStatus({
      administrator: getAdminContext(request),
      mediaType: request.params.mediaType,
      tmdbId: request.params.tmdbId,
      body: request.body,
      requestMetadata: createRequestMetadata(request),
    });

    response.status(200).json({
      status: "success",
      code: "ADMIN_CONTENT_STATUS_UPDATED",
      message: detail.active
        ? "The FilmGeezer content entry is active."
        : "The FilmGeezer content entry is disabled.",
      detail: serializeDetail(detail),
    });
  } catch (error) {
    if (!sendAdminContentError(error, response)) {
      next(error);
    }
  }
}
