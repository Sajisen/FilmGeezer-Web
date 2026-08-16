import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  isAllowedClientOrigin,
} from "../config/cors.js";

import {
  AUTH_RECENT_AUTHENTICATION_POLICY,
  AUTH_SESSION_POLICY,
} from "../features/auth/auth.constants.js";

import {
  AuthPersistenceError,
  AuthSessionRequiredError,
} from "../features/auth/auth.errors.js";

import {
  clearAuthSessionCookie,
  readAuthSessionToken,
  verifyAuthCsrfToken,
} from "../features/auth/auth.session.js";

import {
  resolveAuthenticatedSession,
  type AuthenticatedSessionContext,
} from "../features/auth/auth.session.service.js";

const AUTH_CONTEXT_KEY =
  Symbol("filmgeezer-auth-context");

type RequestWithAuthContext =
  Request & {
    [AUTH_CONTEXT_KEY]?:
      AuthenticatedSessionContext;
  };

function setAuthenticatedSessionContext(
  request: Request,
  context:
    AuthenticatedSessionContext,
): void {
  (
    request as
      RequestWithAuthContext
  )[AUTH_CONTEXT_KEY] =
    context;
}

export function getAuthenticatedSessionContext(
  request: Request,
): AuthenticatedSessionContext {
  const context =
    (
      request as
        RequestWithAuthContext
    )[AUTH_CONTEXT_KEY];

  if (!context) {
    throw new Error(
      "Authenticated session middleware did not provide a request context.",
    );
  }

  return context;
}

function sendSessionRequiredResponse(
  response: Response,
): void {
  clearAuthSessionCookie(
    response,
  );

  response
    .status(401)
    .json({
      status: "error",
      code:
        "AUTH_SESSION_REQUIRED",

      message:
        "Sign in to continue.",
    });
}

export async function requireAuthenticatedSession(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  const sessionToken =
    readAuthSessionToken(
      request,
    );

  if (!sessionToken) {
    sendSessionRequiredResponse(
      response,
    );

    return;
  }

  try {
    const context =
      await resolveAuthenticatedSession(
        sessionToken,
      );

    setAuthenticatedSessionContext(
      request,
      context,
    );

    next();
  } catch (error) {
    if (
      error instanceof
      AuthSessionRequiredError
    ) {
      sendSessionRequiredResponse(
        response,
      );

      return;
    }

    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[auth-session] Session validation failed.",
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
            "Your session cannot be checked right now. Please try again shortly.",
        });

      return;
    }

    next(error);
  }
}

function sendCsrfRejectedResponse(
  response: Response,
): void {
  response
    .status(403)
    .json({
      status: "error",
      code:
        "AUTH_CSRF_REJECTED",

      message:
        "The authenticated request could not be verified.",
    });
}

export function requireAuthCsrfProtection(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  const origin =
    request.get("origin");

  /*
   * Cookie-authenticated state-changing browser requests must come from
   * one of FilmGeezer's exact frontend origins. Missing Origin is also
   * rejected so command-line tests must state which trusted browser
   * origin they are simulating.
   */
  if (
    !origin ||
    !isAllowedClientOrigin(
      origin,
    )
  ) {
    sendCsrfRejectedResponse(
      response,
    );

    return;
  }

  const fetchSite =
    request.get(
      "sec-fetch-site",
    );

  if (fetchSite === "cross-site") {
    sendCsrfRejectedResponse(
      response,
    );

    return;
  }

  const context =
    getAuthenticatedSessionContext(
      request,
    );

  const csrfToken =
    request.get(
      AUTH_SESSION_POLICY
        .csrfHeaderName,
    );

  if (
    !csrfToken ||
    !verifyAuthCsrfToken(
      csrfToken,
      context.csrfSecretHash,
    )
  ) {
    sendCsrfRejectedResponse(
      response,
    );

    return;
  }

  next();
}

export function requireRecentAuthentication(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  const context =
    getAuthenticatedSessionContext(
      request,
    );

  const confirmedAt =
    context.recentAuthenticationAt;

  const isRecent =
    confirmedAt !== null &&
    context.recentAuthenticationMethod === "password" &&
    confirmedAt.getTime() +
      AUTH_RECENT_AUTHENTICATION_POLICY
        .validForMilliseconds >
      Date.now();

  if (!isRecent) {
    response
      .status(403)
      .json({
        status: "error",
        code:
          "AUTH_RECENT_AUTHENTICATION_REQUIRED",
        message:
          "Confirm your password before continuing.",
      });

    return;
  }

  next();
}
