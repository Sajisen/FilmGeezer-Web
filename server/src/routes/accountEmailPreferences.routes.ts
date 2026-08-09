import {
  Router,
  json,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";

import {
  getCurrentUserEmailPreferences,
  updateCurrentUserEmailPreferences,
} from "../controllers/accountEmailPreferences.controller.js";
import {
  EMAIL_PREFERENCES_HTTP_POLICY,
} from "../features/emailPreferences/emailPreferences.constants.js";
import {
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
} from "../middleware/auth.middleware.js";

const router = Router();

function createEmailPreferencesRateLimit(input: {
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

const readRateLimit =
  createEmailPreferencesRateLimit({
    windowMs:
      EMAIL_PREFERENCES_HTTP_POLICY.read
        .rateLimitWindowMilliseconds,
    limit:
      EMAIL_PREFERENCES_HTTP_POLICY.read
        .maximumRequestsPerWindow,
    identifier:
      "filmgeezer-email-preferences-read",
    code:
      "EMAIL_PREFERENCES_READ_RATE_LIMITED",
    message:
      "Too many email-preference requests. Please wait before trying again.",
  });

const mutationRateLimit =
  createEmailPreferencesRateLimit({
    windowMs:
      EMAIL_PREFERENCES_HTTP_POLICY.mutation
        .rateLimitWindowMilliseconds,
    limit:
      EMAIL_PREFERENCES_HTTP_POLICY.mutation
        .maximumRequestsPerWindow,
    identifier:
      "filmgeezer-email-preferences-mutation",
    code:
      "EMAIL_PREFERENCES_MUTATION_RATE_LIMITED",
    message:
      "Too many email-preference changes. Please wait before trying again.",
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
      code: "EMAIL_PREFERENCES_JSON_REQUIRED",
      message:
        "Email preference changes must use application/json.",
    });
    return;
  }

  next();
}

router.get(
  "/",
  readRateLimit,
  requireAuthenticatedSession,
  getCurrentUserEmailPreferences,
);

router.put(
  "/",
  mutationRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  requireJsonContentType,
  json({
    limit: EMAIL_PREFERENCES_HTTP_POLICY.jsonBodyLimit,
    strict: true,
  }),
  updateCurrentUserEmailPreferences,
);

export default router;
