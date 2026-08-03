import {
  Router,
  json,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";

import {
  getCurrentAdminSession,
  loginAdminAccount,
  logoutAdminAccount,
} from "../controllers/adminAuth.controller.js";
import { ADMIN_HTTP_POLICY } from "../features/admin/admin.constants.js";
import {
  requireAdminCsrfProtection,
  requireAdminSession,
} from "../middleware/admin.middleware.js";

const router = Router();

function requireJson(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!request.is("application/json")) {
    response.status(415).json({
      status: "error",
      code: "ADMIN_JSON_REQUIRED",
      message: "Administrator requests must use application/json.",
    });
    return;
  }

  next();
}

function createAdminRateLimit(input: {
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

const loginRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.login.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.login.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-login",
  code: "ADMIN_LOGIN_RATE_LIMITED",
  message: "Too many administrator sign-in attempts. Please wait.",
});

const sessionRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.session.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.session.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-session",
  code: "ADMIN_SESSION_RATE_LIMITED",
  message: "Too many administrator session checks. Please wait.",
});

const logoutRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.logout.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.logout.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-logout",
  code: "ADMIN_LOGOUT_RATE_LIMITED",
  message: "Too many administrator sign-out requests. Please wait.",
});

router.post(
  "/login",
  loginRateLimit,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.login.requestBodyLimit,
    strict: true,
  }),
  loginAdminAccount,
);

router.get(
  "/session",
  sessionRateLimit,
  requireAdminSession,
  getCurrentAdminSession,
);

router.post(
  "/logout",
  logoutRateLimit,
  requireAdminSession,
  requireAdminCsrfProtection,
  logoutAdminAccount,
);

export default router;