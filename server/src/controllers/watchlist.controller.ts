import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  getAuthenticatedSessionContext,
} from "../middleware/auth.middleware.js";

import {
  WatchlistLimitError,
  WatchlistPersistenceError,
} from "../features/watchlist/watchlist.errors.js";

import {
  addWatchlistItem,
  clearWatchlist,
  getWatchlist,
  mergeGuestWatchlist,
  removeWatchlistItem,
} from "../features/watchlist/watchlist.service.js";

function serializeSnapshot(input: {
  items: Array<{
    mediaType: "movie" | "tv";
    tmdbId: number;
    title: string;
    posterUrl: string;
    year: string;
    addedAt: Date;
  }>;
  maximumItems: number;
  updatedAt: Date | null;
}) {
  return {
    items: input.items.map((item) => ({
      ...item,
      addedAt: item.addedAt.toISOString(),
    })),
    maximumItems: input.maximumItems,
    updatedAt: input.updatedAt?.toISOString() ?? null,
  };
}

function sendValidationError(
  response: Response,
  error: z.ZodError,
): void {
  response.status(400).json({
    status: "error",
    code: "WATCHLIST_INVALID_INPUT",
    message: "Check the Watchlist details and try again.",
    errors: error.flatten(),
  });
}

function sendPersistenceError(response: Response): void {
  response.status(503).json({
    status: "error",
    code: "WATCHLIST_TEMPORARILY_UNAVAILABLE",
    message: "Your Watchlist cannot be updated right now. Please try again shortly.",
  });
}

export async function getCurrentWatchlist(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result = await getWatchlist(auth.userId);

    response.status(200).json({
      status: "success",
      code: "WATCHLIST_READY",
      ...serializeSnapshot(result),
    });
  } catch (error) {
    if (error instanceof WatchlistPersistenceError) {
      sendPersistenceError(response);
      return;
    }

    next(error);
  }
}

export async function addCurrentWatchlistItem(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result = await addWatchlistItem(auth.userId, request.body);

    response.status(200).json({
      status: "success",
      code: result.changed
        ? "WATCHLIST_ITEM_ADDED"
        : "WATCHLIST_ITEM_ALREADY_SAVED",
      message: result.changed
        ? "The title was added to your Watchlist."
        : "The title is already in your Watchlist.",
      changed: result.changed,
      ...serializeSnapshot(result),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response, error);
      return;
    }

    if (error instanceof WatchlistLimitError) {
      response.status(409).json({
        status: "error",
        code: error.code,
        message: `Your account Watchlist can keep up to ${error.maximumItems} titles. Remove one before adding another.`,
        maximumItems: error.maximumItems,
      });
      return;
    }

    if (error instanceof WatchlistPersistenceError) {
      sendPersistenceError(response);
      return;
    }

    next(error);
  }
}

export async function removeCurrentWatchlistItem(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result = await removeWatchlistItem(auth.userId, request.params);

    response.status(200).json({
      status: "success",
      code: "WATCHLIST_ITEM_REMOVED",
      message: result.changed
        ? "The title was removed from your Watchlist."
        : "The title was not in your Watchlist.",
      changed: result.changed,
      ...serializeSnapshot(result),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response, error);
      return;
    }

    if (error instanceof WatchlistPersistenceError) {
      sendPersistenceError(response);
      return;
    }

    next(error);
  }
}

export async function mergeCurrentGuestWatchlist(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result = await mergeGuestWatchlist(auth.userId, request.body);

    response.status(200).json({
      status: "success",
      code: "WATCHLIST_GUEST_ITEMS_MERGED",
      message: "The browser Watchlist was merged with your account.",
      addedCount: result.addedCount,
      duplicateCount: result.duplicateCount,
      skippedForLimitCount: result.skippedForLimitCount,
      ...serializeSnapshot(result),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response, error);
      return;
    }

    if (error instanceof WatchlistPersistenceError) {
      sendPersistenceError(response);
      return;
    }

    next(error);
  }
}

export async function clearCurrentWatchlist(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result = await clearWatchlist(auth.userId);

    response.status(200).json({
      status: "success",
      code: "WATCHLIST_CLEARED",
      message: result.changed
        ? "Your Watchlist was cleared."
        : "Your Watchlist is already empty.",
      changed: result.changed,
      ...serializeSnapshot(result),
    });
  } catch (error) {
    if (error instanceof WatchlistPersistenceError) {
      sendPersistenceError(response);
      return;
    }

    next(error);
  }
}
