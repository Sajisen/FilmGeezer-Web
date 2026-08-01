import {
  Router,
  json,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";

import {
  addCurrentWatchlistItem,
  clearCurrentWatchlist,
  getCurrentWatchlist,
  mergeCurrentGuestWatchlist,
  removeCurrentWatchlistItem,
} from "../controllers/watchlist.controller.js";

import {
  WATCHLIST_HTTP_POLICY,
} from "../features/watchlist/watchlist.constants.js";

import {
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
} from "../middleware/auth.middleware.js";

const router = Router();

function createWatchlistRateLimit(input: {
  windowMs: number;
  limit: number;
  identifier: string;
  code: string;
  message: string;
}) {
  return rateLimit({
    windowMs: input.windowMs,
    limit: input.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    identifier: input.identifier,
    passOnStoreError: false,
    handler: (_request, response) => {
      response.setHeader("Cache-Control", "no-store");
      response.status(429).json({
        status: "error",
        code: input.code,
        message: input.message,
      });
    },
  });
}

const readRateLimit = createWatchlistRateLimit({
  windowMs: WATCHLIST_HTTP_POLICY.read.rateLimitWindowMilliseconds,
  limit: WATCHLIST_HTTP_POLICY.read.maximumRequestsPerWindow,
  identifier: "filmgeezer-watchlist-read",
  code: "WATCHLIST_READ_RATE_LIMITED",
  message: "Too many Watchlist requests. Please wait before trying again.",
});

const mutationRateLimit = createWatchlistRateLimit({
  windowMs: WATCHLIST_HTTP_POLICY.mutation.rateLimitWindowMilliseconds,
  limit: WATCHLIST_HTTP_POLICY.mutation.maximumRequestsPerWindow,
  identifier: "filmgeezer-watchlist-mutation",
  code: "WATCHLIST_MUTATION_RATE_LIMITED",
  message: "Too many Watchlist changes. Please wait before trying again.",
});

const mergeRateLimit = createWatchlistRateLimit({
  windowMs: WATCHLIST_HTTP_POLICY.merge.rateLimitWindowMilliseconds,
  limit: WATCHLIST_HTTP_POLICY.merge.maximumRequestsPerWindow,
  identifier: "filmgeezer-watchlist-merge",
  code: "WATCHLIST_MERGE_RATE_LIMITED",
  message: "Too many Watchlist merge attempts. Please wait before trying again.",
});

function requireJsonContentType(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!request.is("application/json")) {
    response.setHeader("Cache-Control", "no-store");
    response.status(415).json({
      status: "error",
      code: "WATCHLIST_JSON_REQUIRED",
      message: "Watchlist changes must use application/json.",
    });
    return;
  }

  next();
}

router.get(
  "/",
  readRateLimit,
  requireAuthenticatedSession,
  getCurrentWatchlist,
);

router.post(
  "/items",
  mutationRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  requireJsonContentType,
  json({
    limit: WATCHLIST_HTTP_POLICY.mutation.requestBodyLimit,
    strict: true,
  }),
  addCurrentWatchlistItem,
);

router.delete(
  "/items/:mediaType/:tmdbId",
  mutationRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  removeCurrentWatchlistItem,
);

router.post(
  "/merge",
  mergeRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  requireJsonContentType,
  json({
    limit: WATCHLIST_HTTP_POLICY.merge.requestBodyLimit,
    strict: true,
  }),
  mergeCurrentGuestWatchlist,
);

router.delete(
  "/",
  mutationRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  clearCurrentWatchlist,
);

export default router;
