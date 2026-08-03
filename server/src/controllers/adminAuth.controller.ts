import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  AdminInvalidCredentialsError,
  AdminPersistenceError,
} from "../features/admin/admin.errors.js";
import {
  loginAdministrator,
} from "../features/admin/admin.auth.service.js";
import {
  clearAdminSessionCookie,
  setAdminSessionCookie,
} from "../features/admin/admin.session.js";
import {
  logoutAdministrator,
} from "../features/admin/admin.session.service.js";
import {
  getAdminContext,
} from "../middleware/admin.middleware.js";

function createRequestMetadata(request: Request) {
  return {
    ipAddress:
      request.ip || request.socket.remoteAddress || null,
    userAgent: request.get("user-agent") ?? null,
  };
}

function serializeSession(context: {
  createdAt: Date;
  lastSeenAt: Date;
  idleExpiresAt: Date;
  expiresAt: Date;
}) {
  return {
    createdAt: context.createdAt.toISOString(),
    lastSeenAt: context.lastSeenAt.toISOString(),
    idleExpiresAt: context.idleExpiresAt.toISOString(),
    expiresAt: context.expiresAt.toISOString(),
  };
}

export async function loginAdminAccount(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await loginAdministrator(
      request.body,
      createRequestMetadata(request),
    );

    setAdminSessionCookie(
      response,
      result.session.token,
      result.session.expiresAt,
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_LOGIN_SUCCEEDED",
      message: "Administrator access granted.",
      user: result.user,
      session: serializeSession(result.session),
      csrfToken: result.session.csrfToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code: "ADMIN_LOGIN_VALIDATION_FAILED",
        message: "Enter a valid email address and password.",
      });
      return;
    }

    if (error instanceof AdminInvalidCredentialsError) {
      clearAdminSessionCookie(response);
      response.status(401).json({
        status: "error",
        code: "ADMIN_LOGIN_FAILED",
        message:
          "Administrator access could not be granted with those credentials.",
      });
      return;
    }

    if (error instanceof AdminPersistenceError) {
      response.status(503).json({
        status: "error",
        code: "ADMIN_TEMPORARILY_UNAVAILABLE",
        message:
          "Administrator sign-in is temporarily unavailable. Please try again shortly.",
      });
      return;
    }

    next(error);
  }
}

export function getCurrentAdminSession(
  request: Request,
  response: Response,
): void {
  response.setHeader("Cache-Control", "no-store");
  const context = getAdminContext(request);

  response.status(200).json({
    status: "success",
    code: "ADMIN_SESSION_ACTIVE",
    user: {
      userId: context.userId.toHexString(),
      email: context.email,
      displayName: context.displayName,
      profileImagePath: context.profileImagePath,
      roles: context.roles,
    },
    session: serializeSession(context),
    csrfToken: context.csrfToken,
  });
}

export async function logoutAdminAccount(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    await logoutAdministrator(getAdminContext(request));
    clearAdminSessionCookie(response);

    response.status(200).json({
      status: "success",
      code: "ADMIN_LOGOUT_SUCCEEDED",
      message: "The administrator session has been closed.",
    });
  } catch (error) {
    if (error instanceof AdminPersistenceError) {
      response.status(503).json({
        status: "error",
        code: "ADMIN_TEMPORARILY_UNAVAILABLE",
        message: "Administrator sign-out is temporarily unavailable.",
      });
      return;
    }

    next(error);
  }
}
