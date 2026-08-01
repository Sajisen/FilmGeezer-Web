import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  AuthPersistenceError,
} from "../features/auth/auth.errors.js";

import {
  logoutAllSessions,
  logoutCurrentSession,
} from "../features/auth/auth.logout.service.js";

import {
  clearAuthSessionCookie,
} from "../features/auth/auth.session.js";

import {
  getAuthenticatedSessionContext,
} from "../middleware/auth.middleware.js";

function createRequestMetadata(
  request: Request,
) {
  return {
    ipAddress:
      request.ip ||
      request.socket
        .remoteAddress ||
      null,

    userAgent:
      request.get(
        "user-agent",
      ) ?? null,
  };
}

export function getCurrentAuthSession(
  request: Request,
  response: Response,
): void {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  const auth =
    getAuthenticatedSessionContext(
      request,
    );

  response
    .status(200)
    .json({
      status: "success",
      code:
        "AUTH_SESSION_ACTIVE",

      user: {
        userId:
          auth.userId
            .toHexString(),

        provider:
          auth.provider,

        email:
          auth.email,

        displayName:
          auth.displayName,

        roles:
          auth.roles,
      },

      session: {
        createdAt:
          auth.createdAt
            .toISOString(),

        lastSeenAt:
          auth.lastSeenAt
            .toISOString(),

        idleExpiresAt:
          auth.idleExpiresAt
            .toISOString(),

        expiresAt:
          auth.expiresAt
            .toISOString(),
      },

      /*
       * The frontend keeps this value in memory and sends it through the
       * X-CSRF-Token header for authenticated state-changing requests.
       * It is not the opaque HttpOnly session token.
       */
      csrfToken:
        auth.csrfToken,
    });
}

export async function logoutCurrentAuthSession(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  const auth =
    getAuthenticatedSessionContext(
      request,
    );

  try {
    const result =
      await logoutCurrentSession(
        auth,
        createRequestMetadata(
          request,
        ),
      );

    clearAuthSessionCookie(
      response,
    );

    response
      .status(200)
      .json({
        status: "success",
        code:
          "AUTH_LOGOUT_SUCCEEDED",

        message:
          "You have been signed out from this device.",

        sessionsRevoked:
          result.sessionsRevoked,
      });
  } catch (error) {
    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[auth-logout] Current-session logout failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response
        .status(503)
        .json({
          status: "error",
          code:
            "AUTH_TEMPORARILY_UNAVAILABLE",

          message:
            "Sign out is temporarily unavailable. Please try again shortly.",
        });

      return;
    }

    next(error);
  }
}

export async function logoutAllAuthSessions(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  const auth =
    getAuthenticatedSessionContext(
      request,
    );

  try {
    const result =
      await logoutAllSessions(
        auth,
        createRequestMetadata(
          request,
        ),
      );

    clearAuthSessionCookie(
      response,
    );

    response
      .status(200)
      .json({
        status: "success",
        code:
          "AUTH_LOGOUT_ALL_SUCCEEDED",

        message:
          "You have been signed out from every FilmGeezer session.",

        sessionsRevoked:
          result.sessionsRevoked,
      });
  } catch (error) {
    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[auth-logout] All-session logout failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response
        .status(503)
        .json({
          status: "error",
          code:
            "AUTH_TEMPORARILY_UNAVAILABLE",

          message:
            "Sign out from all devices is temporarily unavailable. Please try again shortly.",
        });

      return;
    }

    next(error);
  }
}