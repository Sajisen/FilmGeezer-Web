import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { z } from "zod";

import {
  AuthPasswordResetError,
  AuthPasswordReuseError,
  AuthPersistenceError,
  AuthWeakPasswordError,
} from "../features/auth/auth.errors.js";

import {
  requestPasswordReset,
} from "../features/auth/auth.password-reset-request.service.js";

import {
  resetLocalPassword,
} from "../features/auth/auth.password-reset.service.js";

import {
  clearAuthSessionCookie,
} from "../features/auth/auth.session.js";

function createAuthRequestMetadata(
  request: Request,
) {
  return {
    ipAddress:
      request.ip ||
      request.socket.remoteAddress ||
      null,

    userAgent:
      request.get("user-agent") ?? null,
  };
}

function createValidationDetails(
  error: z.ZodError,
  fieldNames: readonly string[],
) {
  const fields: Record<string, string[]> = {};

  for (const fieldName of fieldNames) {
    fields[fieldName] = [];
  }

  const form: string[] = [];

  for (const issue of error.issues) {
    const [fieldName] = issue.path;

    if (
      typeof fieldName === "string" &&
      fieldName in fields
    ) {
      fields[fieldName].push(issue.message);
      continue;
    }

    form.push(issue.message);
  }

  return {
    form,
    fields,
  };
}

export async function requestLocalPasswordReset(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await requestPasswordReset(
      request.body,
      createAuthRequestMetadata(request),
      request.get("origin"),
    );

    response.status(202).json({
      status: "success",
      code:
        "AUTH_PASSWORD_RESET_REQUEST_ACCEPTED",
      message:
        "If this email can receive a FilmGeezer password reset, a secure link will arrive shortly.",
      acceptedAt: result.acceptedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "AUTH_INVALID_PASSWORD_RESET_REQUEST_INPUT",
        message:
          "Check the email address and try again.",
        errors: createValidationDetails(
          error,
          ["email"],
        ),
      });

      return;
    }

    if (error instanceof AuthPersistenceError) {
      console.error(
        "[auth-password-reset-request] Persistence failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "AUTH_TEMPORARILY_UNAVAILABLE",
        message:
          "Password recovery is temporarily unavailable. Please try again shortly.",
      });

      return;
    }

    next(error);
  }
}

export async function resetLocalAccountPassword(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await resetLocalPassword(
      request.body,
    );

    clearAuthSessionCookie(response);

    response.status(200).json({
      status: "success",
      code:
        "AUTH_PASSWORD_RESET_COMPLETED",
      message:
        "Your password has been reset. Sign in again with the new password.",
      resetAt: result.resetAt.toISOString(),
      sessionsRevoked:
        result.sessionsRevoked,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "AUTH_INVALID_PASSWORD_RESET_INPUT",
        message:
          "Check the reset details and try again.",
        errors: createValidationDetails(
          error,
          ["challengeId", "token", "password"],
        ),
      });

      return;
    }

    if (error instanceof AuthWeakPasswordError) {
      response.status(422).json({
        status: "error",
        code: error.code,
        message: error.message,
        password: {
          reason: error.reason,
        },
      });

      return;
    }

    if (error instanceof AuthPasswordReuseError) {
      response.status(422).json({
        status: "error",
        code: error.code,
        message: error.message,
      });

      return;
    }

    if (error instanceof AuthPasswordResetError) {
      if (error.reason === "expired") {
        response.status(410).json({
          status: "error",
          code:
            "AUTH_PASSWORD_RESET_EXPIRED",
          message:
            "This password-reset link has expired. Request a new link.",
        });

        return;
      }

      if (error.reason === "already-used") {
        response.status(409).json({
          status: "error",
          code:
            "AUTH_PASSWORD_RESET_ALREADY_USED",
          message:
            "This password-reset link has already been used. Request a new link if needed.",
        });

        return;
      }

      if (error.reason === "attempts-exceeded") {
        response.status(429).json({
          status: "error",
          code:
            "AUTH_PASSWORD_RESET_ATTEMPTS_EXCEEDED",
          message:
            "This password-reset link can no longer be used. Request a new link.",
        });

        return;
      }

      response.status(400).json({
        status: "error",
        code:
          "AUTH_PASSWORD_RESET_INVALID",
        message:
          "This password-reset link is invalid or no longer available.",
      });

      return;
    }

    if (error instanceof AuthPersistenceError) {
      console.error(
        "[auth-password-reset] Persistence failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "AUTH_TEMPORARILY_UNAVAILABLE",
        message:
          "Your password cannot be reset right now. Please try again shortly.",
      });

      return;
    }

    next(error);
  }
}
