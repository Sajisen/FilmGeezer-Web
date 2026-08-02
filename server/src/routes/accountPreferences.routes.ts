import {
  Router,
  json,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";

import {
  getCurrentUserPreferences,
  updateCurrentUserPreferences,
} from "../controllers/accountPreferences.controller.js";

import {
  PREFERENCES_HTTP_POLICY,
} from "../features/preferences/preferences.constants.js";

import {
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
} from "../middleware/auth.middleware.js";

const router = Router();

function createPreferencesRateLimit(input: {
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

const readRateLimit = createPreferencesRateLimit({
  windowMs:
    PREFERENCES_HTTP_POLICY.read.rateLimitWindowMilliseconds,
  limit: PREFERENCES_HTTP_POLICY.read.maximumRequestsPerWindow,
  identifier: "filmgeezer-preferences-read",
  code: "PREFERENCES_READ_RATE_LIMITED",
  message:
    "Too many preference requests. Please wait before trying again.",
});

const mutationRateLimit = createPreferencesRateLimit({
  windowMs:
    PREFERENCES_HTTP_POLICY.mutation.rateLimitWindowMilliseconds,
  limit: PREFERENCES_HTTP_POLICY.mutation.maximumRequestsPerWindow,
  identifier: "filmgeezer-preferences-mutation",
  code: "PREFERENCES_MUTATION_RATE_LIMITED",
  message:
    "Too many preference changes. Please wait before trying again.",
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
      code: "PREFERENCES_JSON_REQUIRED",
      message:
        "Entertainment preference changes must use application/json.",
    });
    return;
  }

  next();
}

router.get(
  "/",
  readRateLimit,
  requireAuthenticatedSession,
  getCurrentUserPreferences,
);

router.put(
  "/",
  mutationRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  requireJsonContentType,
  json({
    limit: PREFERENCES_HTTP_POLICY.jsonBodyLimit,
    strict: true,
  }),
  updateCurrentUserPreferences,
);

export default router;
