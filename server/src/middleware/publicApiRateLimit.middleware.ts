import {
  rateLimit,
} from "express-rate-limit";

const PUBLIC_API_WINDOW_MILLISECONDS =
  15 * 60 * 1_000;

/**
 * FilmGeezer's movie/TV discovery endpoints are intentionally public because
 * the browser must be able to request them without an account. They therefore
 * cannot be made secret or truly "frontend only". This limiter provides a
 * deliberately high server-side abuse ceiling without interfering with normal browsing.
 *
 * The default express-rate-limit IP key is appropriate for the current single
 * Railway API service. If FilmGeezer later runs multiple API replicas, move
 * this policy to a shared store or the edge so limits remain global.
 */
export const publicApiReadRateLimit = rateLimit({
  windowMs: PUBLIC_API_WINDOW_MILLISECONDS,
  limit: 2_400,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  identifier: "filmgeezer-public-api-read",
  passOnStoreError: false,
  handler: (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.status(429).json({
      status: "error",
      code: "PUBLIC_API_RATE_LIMITED",
      message:
        "Too many FilmGeezer requests. Please wait a moment and try again.",
    });
  },
});

/**
 * Search is more expensive and easier to automate than ordinary page reads,
 * so it receives a lower ceiling in addition to the broad public-read limit.
 * 300 requests per 15 minutes still leaves ample room for normal debounced
 * searching while reducing trivial scraping/hammering from a single client.
 */
export const publicSearchRateLimit = rateLimit({
  windowMs: PUBLIC_API_WINDOW_MILLISECONDS,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  identifier: "filmgeezer-public-search",
  passOnStoreError: false,
  handler: (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.status(429).json({
      status: "error",
      code: "SEARCH_RATE_LIMITED",
      message:
        "Too many search requests. Please wait a moment and try again.",
    });
  },
});
