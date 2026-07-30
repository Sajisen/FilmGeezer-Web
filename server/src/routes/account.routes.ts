import {
  Router,
  json,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import {
  rateLimit,
} from "express-rate-limit";

import {
  changeCurrentAccountPassword,
  confirmCurrentAccountPassword,
  getCurrentAccountDetails,
  getCurrentAccountSessions,
  revokeCurrentAccountSession,
  updateCurrentAccountProfile,
} from "../controllers/account.controller.js";

import {
  AUTH_ACCOUNT_DETAILS_HTTP_POLICY,
  AUTH_ACCOUNT_PROFILE_HTTP_POLICY,
  AUTH_ACCOUNT_SESSION_LIST_HTTP_POLICY,
  AUTH_ACCOUNT_SESSION_REVOKE_HTTP_POLICY,
  AUTH_PASSWORD_CHANGE_HTTP_POLICY,
  AUTH_RECENT_AUTHENTICATION_HTTP_POLICY,
} from "../features/auth/auth.constants.js";

import {
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  requireRecentAuthentication,
} from "../middleware/auth.middleware.js";

const router = Router();

function createAccountRateLimit(
  input: {
    windowMs: number;
    limit: number;
    identifier: string;
    code: string;
    message: string;
  },
) {
  return rateLimit({
    windowMs: input.windowMs,
    limit: input.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    identifier: input.identifier,
    passOnStoreError: false,

    handler: (
      _request,
      response,
    ) => {
      response.setHeader(
        "Cache-Control",
        "no-store",
      );

      response.status(429).json({
        status: "error",
        code: input.code,
        message: input.message,
      });
    },
  });
}

const accountDetailsRateLimit =
  createAccountRateLimit({
    windowMs:
      AUTH_ACCOUNT_DETAILS_HTTP_POLICY
        .rateLimitWindowMilliseconds,
    limit:
      AUTH_ACCOUNT_DETAILS_HTTP_POLICY
        .maximumRequestsPerWindow,
    identifier:
      "filmgeezer-account-details",
    code:
      "ACCOUNT_DETAILS_RATE_LIMITED",
    message:
      "Too many account-detail requests. Please wait before trying again.",
  });

const accountProfileRateLimit =
  createAccountRateLimit({
    windowMs:
      AUTH_ACCOUNT_PROFILE_HTTP_POLICY
        .rateLimitWindowMilliseconds,
    limit:
      AUTH_ACCOUNT_PROFILE_HTTP_POLICY
        .maximumRequestsPerWindow,
    identifier:
      "filmgeezer-account-profile",
    code:
      "ACCOUNT_PROFILE_RATE_LIMITED",
    message:
      "Too many profile-update requests. Please wait before trying again.",
  });

const accountSessionListRateLimit =
  createAccountRateLimit({
    windowMs:
      AUTH_ACCOUNT_SESSION_LIST_HTTP_POLICY
        .rateLimitWindowMilliseconds,
    limit:
      AUTH_ACCOUNT_SESSION_LIST_HTTP_POLICY
        .maximumRequestsPerWindow,
    identifier:
      "filmgeezer-account-session-list",
    code:
      "ACCOUNT_SESSION_LIST_RATE_LIMITED",
    message:
      "Too many session-list requests. Please wait before trying again.",
  });

const accountSessionRevokeRateLimit =
  createAccountRateLimit({
    windowMs:
      AUTH_ACCOUNT_SESSION_REVOKE_HTTP_POLICY
        .rateLimitWindowMilliseconds,
    limit:
      AUTH_ACCOUNT_SESSION_REVOKE_HTTP_POLICY
        .maximumRequestsPerWindow,
    identifier:
      "filmgeezer-account-session-revoke",
    code:
      "ACCOUNT_SESSION_REVOKE_RATE_LIMITED",
    message:
      "Too many device sign-out requests. Please wait before trying again.",
  });

const recentAuthenticationRateLimit =
  createAccountRateLimit({
    windowMs:
      AUTH_RECENT_AUTHENTICATION_HTTP_POLICY
        .rateLimitWindowMilliseconds,
    limit:
      AUTH_RECENT_AUTHENTICATION_HTTP_POLICY
        .maximumRequestsPerWindow,
    identifier:
      "filmgeezer-account-reauthentication",
    code:
      "AUTH_RECENT_AUTHENTICATION_RATE_LIMITED",
    message:
      "Too many password-confirmation attempts. Please wait before trying again.",
  });

const passwordChangeRateLimit =
  createAccountRateLimit({
    windowMs:
      AUTH_PASSWORD_CHANGE_HTTP_POLICY
        .rateLimitWindowMilliseconds,
    limit:
      AUTH_PASSWORD_CHANGE_HTTP_POLICY
        .maximumRequestsPerWindow,
    identifier:
      "filmgeezer-account-password-change",
    code:
      "ACCOUNT_PASSWORD_CHANGE_RATE_LIMITED",
    message:
      "Too many password-change attempts. Please wait before trying again.",
  });

function requireJsonContentType(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!request.is("application/json")) {
    response.setHeader(
      "Cache-Control",
      "no-store",
    );

    response.status(415).json({
      status: "error",
      code: "ACCOUNT_JSON_REQUIRED",
      message:
        "Account changes must use application/json.",
    });

    return;
  }

  next();
}

router.get(
  "/",
  accountDetailsRateLimit,
  requireAuthenticatedSession,
  getCurrentAccountDetails,
);

router.get(
  "/sessions",
  accountSessionListRateLimit,
  requireAuthenticatedSession,
  getCurrentAccountSessions,
);

router.delete(
  "/sessions/:sessionReference",
  accountSessionRevokeRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  requireRecentAuthentication,
  revokeCurrentAccountSession,
);

router.patch(
  "/profile",
  accountProfileRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  requireJsonContentType,
  json({
    limit:
      AUTH_ACCOUNT_PROFILE_HTTP_POLICY
        .requestBodyLimit,
    strict: true,
  }),
  updateCurrentAccountProfile,
);

router.post(
  "/confirm-password",
  recentAuthenticationRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  requireJsonContentType,
  json({
    limit:
      AUTH_RECENT_AUTHENTICATION_HTTP_POLICY
        .requestBodyLimit,
    strict: true,
  }),
  confirmCurrentAccountPassword,
);

router.post(
  "/change-password",
  passwordChangeRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  requireRecentAuthentication,
  requireJsonContentType,
  json({
    limit:
      AUTH_PASSWORD_CHANGE_HTTP_POLICY
        .requestBodyLimit,
    strict: true,
  }),
  changeCurrentAccountPassword,
);

export default router;
