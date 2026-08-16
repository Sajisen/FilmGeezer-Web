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
  loginLocalAccount,
  registerLocalAccount,
  resendLocalEmailVerification,
  verifyLocalEmailAddress,
} from "../controllers/auth.controller.js";

import { authenticateGoogleAccount } from "../controllers/authGoogle.controller.js";

import {
  getCurrentAuthSession,
  logoutAllAuthSessions,
  logoutCurrentAuthSession,
} from "../controllers/authSession.controller.js";

import {
  requestLocalPasswordReset,
  resetLocalAccountPassword,
} from "../controllers/authPasswordRecovery.controller.js";

import {
  AUTH_EMAIL_VERIFICATION_HTTP_POLICY,
  AUTH_EMAIL_VERIFICATION_RESEND_HTTP_POLICY,
  AUTH_GOOGLE_HTTP_POLICY,
  AUTH_LOGIN_HTTP_POLICY,
  AUTH_LOGOUT_HTTP_POLICY,
  AUTH_PASSWORD_RESET_HTTP_POLICY,
  AUTH_PASSWORD_RESET_REQUEST_HTTP_POLICY,
  AUTH_REGISTRATION_POLICY,
  AUTH_SESSION_HTTP_POLICY,
} from "../features/auth/auth.constants.js";

import {
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  requireRecentAuthentication,
} from "../middleware/auth.middleware.js";

const router =
  Router();

function createAuthenticationRateLimit(
  input: {
    windowMs: number;
    limit: number;
    identifier: string;
    code: string;
    message: string;
  },
) {
  return rateLimit({
    windowMs:
      input.windowMs,

    limit:
      input.limit,

    standardHeaders:
      "draft-8",

    legacyHeaders:
      false,

    identifier:
      input.identifier,

    passOnStoreError:
      false,

    handler: (
      _request,
      response,
    ) => {
      response.setHeader(
        "Cache-Control",
        "no-store",
      );

      response
        .status(429)
        .json({
          status: "error",
          code:
            input.code,
          message:
            input.message,
        });
    },
  });
}

const registrationRateLimit =
  createAuthenticationRateLimit({
    windowMs:
      AUTH_REGISTRATION_POLICY
        .rateLimitWindowMilliseconds,

    limit:
      AUTH_REGISTRATION_POLICY
        .maximumRequestsPerWindow,

    identifier:
      "filmgeezer-auth-registration",

    code:
      "AUTH_REGISTRATION_RATE_LIMITED",

    message:
      "Too many registration attempts. Please wait before trying again.",
  });

const emailVerificationRateLimit =
  createAuthenticationRateLimit({
    windowMs:
      AUTH_EMAIL_VERIFICATION_HTTP_POLICY
        .rateLimitWindowMilliseconds,

    limit:
      AUTH_EMAIL_VERIFICATION_HTTP_POLICY
        .maximumRequestsPerWindow,

    identifier:
      "filmgeezer-auth-email-verification",

    code:
      "AUTH_VERIFICATION_RATE_LIMITED",

    message:
      "Too many verification attempts. Please wait before trying again.",
  });

const emailVerificationResendRateLimit =
  createAuthenticationRateLimit({
    windowMs:
      AUTH_EMAIL_VERIFICATION_RESEND_HTTP_POLICY
        .rateLimitWindowMilliseconds,

    limit:
      AUTH_EMAIL_VERIFICATION_RESEND_HTTP_POLICY
        .maximumRequestsPerWindow,

    identifier:
      "filmgeezer-auth-email-verification-resend",

    code:
      "AUTH_VERIFICATION_RESEND_RATE_LIMITED",

    message:
      "Too many resend requests. Please wait before trying again.",
  });

const loginRateLimit =
  createAuthenticationRateLimit({
    windowMs:
      AUTH_LOGIN_HTTP_POLICY
        .rateLimitWindowMilliseconds,

    limit:
      AUTH_LOGIN_HTTP_POLICY
        .maximumRequestsPerWindow,

    identifier:
      "filmgeezer-auth-login",

    code:
      "AUTH_LOGIN_RATE_LIMITED",

    message:
      "Too many sign-in attempts. Please wait before trying again.",
  });

const googleAuthRateLimit =
  createAuthenticationRateLimit({
    windowMs:
      AUTH_GOOGLE_HTTP_POLICY
        .rateLimitWindowMilliseconds,

    limit:
      AUTH_GOOGLE_HTTP_POLICY
        .maximumRequestsPerWindow,

    identifier:
      "filmgeezer-auth-google",

    code:
      "AUTH_GOOGLE_RATE_LIMITED",

    message:
      "Too many Google sign-in attempts. Please wait before trying again.",
  });

const passwordResetRequestRateLimit =
  createAuthenticationRateLimit({
    windowMs:
      AUTH_PASSWORD_RESET_REQUEST_HTTP_POLICY
        .rateLimitWindowMilliseconds,

    limit:
      AUTH_PASSWORD_RESET_REQUEST_HTTP_POLICY
        .maximumRequestsPerWindow,

    identifier:
      "filmgeezer-auth-password-reset-request",

    code:
      "AUTH_PASSWORD_RESET_REQUEST_RATE_LIMITED",

    message:
      "Too many password-reset requests. Please wait before trying again.",
  });

const passwordResetRateLimit =
  createAuthenticationRateLimit({
    windowMs:
      AUTH_PASSWORD_RESET_HTTP_POLICY
        .rateLimitWindowMilliseconds,

    limit:
      AUTH_PASSWORD_RESET_HTTP_POLICY
        .maximumRequestsPerWindow,

    identifier:
      "filmgeezer-auth-password-reset",

    code:
      "AUTH_PASSWORD_RESET_RATE_LIMITED",

    message:
      "Too many password-reset attempts. Please wait before trying again.",
  });

const sessionStateRateLimit =
  createAuthenticationRateLimit({
    windowMs:
      AUTH_SESSION_HTTP_POLICY
        .rateLimitWindowMilliseconds,

    limit:
      AUTH_SESSION_HTTP_POLICY
        .maximumRequestsPerWindow,

    identifier:
      "filmgeezer-auth-session-state",

    code:
      "AUTH_SESSION_RATE_LIMITED",

    message:
      "Too many session checks. Please wait before trying again.",
  });

const logoutRateLimit =
  createAuthenticationRateLimit({
    windowMs:
      AUTH_LOGOUT_HTTP_POLICY
        .rateLimitWindowMilliseconds,

    limit:
      AUTH_LOGOUT_HTTP_POLICY
        .maximumRequestsPerWindow,

    identifier:
      "filmgeezer-auth-logout",

    code:
      "AUTH_LOGOUT_RATE_LIMITED",

    message:
      "Too many sign-out requests. Please wait before trying again.",
  });

function requireJsonContentType(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (
    !request.is(
      "application/json",
    )
  ) {
    response.setHeader(
      "Cache-Control",
      "no-store",
    );

    response
      .status(415)
      .json({
        status: "error",
        code:
          "AUTH_JSON_REQUIRED",

        message:
          "Authentication requests must use application/json.",
      });

    return;
  }

  next();
}

router.post(
  "/register",

  registrationRateLimit,

  requireJsonContentType,

  json({
    limit:
      AUTH_REGISTRATION_POLICY
        .requestBodyLimit,

    strict:
      true,
  }),

  registerLocalAccount,
);

router.post(
  "/verify-email",

  emailVerificationRateLimit,

  requireJsonContentType,

  json({
    limit:
      AUTH_EMAIL_VERIFICATION_HTTP_POLICY
        .requestBodyLimit,

    strict:
      true,
  }),

  verifyLocalEmailAddress,
);

router.post(
  "/resend-verification",

  emailVerificationResendRateLimit,

  requireJsonContentType,

  json({
    limit:
      AUTH_EMAIL_VERIFICATION_RESEND_HTTP_POLICY
        .requestBodyLimit,

    strict:
      true,
  }),

  resendLocalEmailVerification,
);

router.post(
  "/google",

  googleAuthRateLimit,

  requireJsonContentType,

  json({
    limit:
      AUTH_GOOGLE_HTTP_POLICY
        .requestBodyLimit,

    strict:
      true,
  }),

  authenticateGoogleAccount,
);

router.post(
  "/login",

  loginRateLimit,

  requireJsonContentType,

  json({
    limit:
      AUTH_LOGIN_HTTP_POLICY
        .requestBodyLimit,

    strict:
      true,
  }),

  loginLocalAccount,
);

router.post(
  "/forgot-password",

  passwordResetRequestRateLimit,

  requireJsonContentType,

  json({
    limit:
      AUTH_PASSWORD_RESET_REQUEST_HTTP_POLICY
        .requestBodyLimit,

    strict:
      true,
  }),

  requestLocalPasswordReset,
);

router.post(
  "/reset-password",

  passwordResetRateLimit,

  requireJsonContentType,

  json({
    limit:
      AUTH_PASSWORD_RESET_HTTP_POLICY
        .requestBodyLimit,

    strict:
      true,
  }),

  resetLocalAccountPassword,
);

router.get(
  "/session",

  sessionStateRateLimit,

  requireAuthenticatedSession,

  getCurrentAuthSession,
);

router.post(
  "/logout",

  logoutRateLimit,

  requireAuthenticatedSession,

  requireAuthCsrfProtection,

  logoutCurrentAuthSession,
);

router.post(
  "/logout-all",

  logoutRateLimit,

  requireAuthenticatedSession,

  requireAuthCsrfProtection,

  requireRecentAuthentication,

  logoutAllAuthSessions,
);

export default router;
