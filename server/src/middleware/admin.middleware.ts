import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { isAllowedAdminOrigin } from "../config/cors.js";
import { ADMIN_SESSION_POLICY } from "../features/admin/admin.constants.js";
import {
  AdminAuthenticationRequiredError,
  AdminPersistenceError,
} from "../features/admin/admin.errors.js";
import {
  clearAdminSessionCookie,
  readAdminSessionToken,
  verifyAdminCsrfToken,
} from "../features/admin/admin.session.js";
import {
  resolveAdminSession,
} from "../features/admin/admin.session.service.js";
import type {
  AdminSessionContext,
} from "../features/admin/admin.types.js";

const ADMIN_CONTEXT_KEY = Symbol("filmgeezer-admin-context");

type RequestWithAdminContext = Request & {
  [ADMIN_CONTEXT_KEY]?: AdminSessionContext;
};

function setAdminContext(
  request: Request,
  context: AdminSessionContext,
): void {
  (request as RequestWithAdminContext)[ADMIN_CONTEXT_KEY] = context;
}

export function getAdminContext(request: Request): AdminSessionContext {
  const context = (request as RequestWithAdminContext)[ADMIN_CONTEXT_KEY];

  if (!context) {
    throw new Error(
      "Administrator middleware did not provide a request context.",
    );
  }

  return context;
}

function sendAdminAuthenticationRequired(response: Response): void {
  clearAdminSessionCookie(response);
  response.status(401).json({
    status: "error",
    code: "ADMIN_AUTHENTICATION_REQUIRED",
    message: "Administrator sign-in is required.",
  });
}

export async function requireAdminSession(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  const token = readAdminSessionToken(request);

  if (!token) {
    sendAdminAuthenticationRequired(response);
    return;
  }

  try {
    const context = await resolveAdminSession(token);
    setAdminContext(request, context);
    next();
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      sendAdminAuthenticationRequired(response);
      return;
    }

    if (error instanceof AdminPersistenceError) {
      console.error("[admin-session] Session validation failed.", {
        name: error.name,
        code: error.code,
      });

      response.status(503).json({
        status: "error",
        code: "ADMIN_TEMPORARILY_UNAVAILABLE",
        message:
          "Administrator access cannot be checked right now. Please try again shortly.",
      });
      return;
    }

    next(error);
  }
}

export function requireAdminCsrfProtection(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  response.setHeader("Cache-Control", "no-store");

  const origin = request.get("origin");
  const fetchSite = request.get("sec-fetch-site");

  if (
    !origin ||
    !isAllowedAdminOrigin(origin) ||
    fetchSite === "cross-site"
  ) {
    response.status(403).json({
      status: "error",
      code: "ADMIN_CSRF_REJECTED",
      message: "The administrator request could not be verified.",
    });
    return;
  }

  const context = getAdminContext(request);
  const csrfToken = request.get(ADMIN_SESSION_POLICY.csrfHeaderName);

  if (
    !csrfToken ||
    !verifyAdminCsrfToken(csrfToken, context.csrfSecretHash)
  ) {
    response.status(403).json({
      status: "error",
      code: "ADMIN_CSRF_REJECTED",
      message: "The administrator request could not be verified.",
    });
    return;
  }

  next();
}