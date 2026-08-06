import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  z,
} from "zod";

import {
  deactivateAccount,
} from "../features/account/account.deactivation.service.js";

import {
  AuthAccountDeactivationError,
  AuthPersistenceError,
} from "../features/auth/auth.errors.js";

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
      request.socket.remoteAddress ||
      null,
    userAgent:
      request.get("user-agent") ??
      null,
  };
}

export async function deactivateCurrentAccount(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  try {
    const auth =
      getAuthenticatedSessionContext(
        request,
      );

    const result =
      await deactivateAccount(
        request.body,
        auth,
        createRequestMetadata(
          request,
        ),
      );

    clearAuthSessionCookie(response);

    response.status(200).json({
      status: "success",
      code: "ACCOUNT_DEACTIVATED",
      message:
        "Your FilmGeezer account has been deactivated and every device has been signed out.",
      deactivatedAt:
        result.deactivatedAt
          .toISOString(),
      sessionsRevoked:
        result.sessionsRevoked,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "ACCOUNT_INVALID_DEACTIVATION_INPUT",
        message:
          "Type DEACTIVATE exactly to confirm this account change.",
        errors: {
          form: [],
          fields: {
            confirmation:
              error.issues.map(
                (issue) =>
                  issue.message,
              ),
          },
        },
      });

      return;
    }

    if (
      error instanceof
      AuthAccountDeactivationError
    ) {
      const finalAdministratorProtected =
        error.reason ===
        "final-administrator-protected";

      response.status(409).json({
        status: "error",
        code: finalAdministratorProtected
          ? "FINAL_ADMINISTRATOR_DEACTIVATION_BLOCKED"
          : "ACCOUNT_DEACTIVATION_UNAVAILABLE",
        message: finalAdministratorProtected
          ? "This is the final active FilmGeezer administrator. Grant another trusted account administrator access before deactivating this account."
          : "This account can no longer be deactivated from the current session.",
      });

      return;
    }

    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[account-deactivation] Account deactivation failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "ACCOUNT_TEMPORARILY_UNAVAILABLE",
        message:
          "Your account cannot be deactivated right now. Please try again shortly.",
      });

      return;
    }

    next(error);
  }
}
