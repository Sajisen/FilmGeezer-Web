import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { z } from "zod";

import {
  cancelAccountEmailChange,
  getPendingAccountEmailChange,
  requestAccountEmailChange,
  resendAccountEmailChangeCode,
  verifyAccountEmailChange,
} from "../features/account/account.email-change.service.js";

import {
  AuthEmailChangeError,
  AuthEmailConfigurationError,
  AuthPersistenceError,
} from "../features/auth/auth.errors.js";

import {
  setAuthSessionCookie,
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

function createValidationDetails(
  error: z.ZodError,
  fieldNames: readonly string[],
) {
  const fields:
    Record<string, string[]> = {};

  for (const fieldName of fieldNames) {
    fields[fieldName] = [];
  }

  const form: string[] = [];

  for (const issue of error.issues) {
    const [fieldName] = issue.path;

    if (
      typeof fieldName === "string" &&
      Object.prototype.hasOwnProperty.call(
        fields,
        fieldName,
      )
    ) {
      fields[fieldName].push(issue.message);
    } else {
      form.push(issue.message);
    }
  }

  return { form, fields };
}

function sendEmailChangeError(
  error: AuthEmailChangeError,
  response: Response,
): void {
  const common = {
    status: "error",
    reason: error.reason,
    attemptsRemaining:
      error.attemptsRemaining,
    retryAt:
      error.retryAt?.toISOString() ??
      null,
  } as const;

  switch (error.reason) {
    case "same-email":
      response.status(409).json({
        ...common,
        code: "ACCOUNT_EMAIL_UNCHANGED",
        message:
          "Enter an email address different from your current address.",
      });
      return;

    case "email-in-use":
      response.status(409).json({
        ...common,
        code: "ACCOUNT_EMAIL_UNAVAILABLE",
        message:
          "That email address cannot be used. Try another address.",
      });
      return;

    case "incorrect-code":
      response.status(400).json({
        ...common,
        code:
          "ACCOUNT_EMAIL_CHANGE_CODE_INCORRECT",
        message:
          "The verification code is incorrect.",
      });
      return;

    case "expired":
      response.status(410).json({
        ...common,
        code:
          "ACCOUNT_EMAIL_CHANGE_EXPIRED",
        message:
          "This email-change code has expired. Start the change again.",
      });
      return;

    case "attempts-exceeded":
      response.status(429).json({
        ...common,
        code:
          "ACCOUNT_EMAIL_CHANGE_ATTEMPTS_EXCEEDED",
        message:
          "Too many incorrect codes were entered. Start the email change again.",
      });
      return;

    case "already-used":
      response.status(409).json({
        ...common,
        code:
          "ACCOUNT_EMAIL_CHANGE_ALREADY_USED",
        message:
          "This email-change request has already been completed.",
      });
      return;

    case "cooldown":
      response.status(429).json({
        ...common,
        code:
          "ACCOUNT_EMAIL_CHANGE_RESEND_COOLDOWN",
        message:
          "Please wait before requesting another verification code.",
      });
      return;

    case "send-limit":
      response.status(429).json({
        ...common,
        code:
          "ACCOUNT_EMAIL_CHANGE_SEND_LIMIT",
        message:
          "This email-change request has reached its send limit. Start again later.",
      });
      return;

    case "account-changed":
      response.status(409).json({
        ...common,
        code:
          "ACCOUNT_EMAIL_CHANGE_STALE",
        message:
          "Your account email changed after this request started. Begin a new email change.",
      });
      return;

    case "account-unavailable":
      response.status(409).json({
        ...common,
        code:
          "ACCOUNT_EMAIL_CHANGE_UNAVAILABLE",
        message:
          "Your account cannot change its email address right now.",
      });
      return;

    case "superseded":
    case "invalid-challenge":
    default:
      response.status(404).json({
        ...common,
        code:
          "ACCOUNT_EMAIL_CHANGE_NOT_FOUND",
        message:
          "This email-change request is no longer available.",
      });
  }
}

function sendTemporaryFailure(
  error: AuthPersistenceError | AuthEmailConfigurationError,
  response: Response,
): void {
  console.error(
    "[account-email-change] Request failed.",
    {
      name: error.name,
      code: error.code,
    },
  );

  response.status(503).json({
    status: "error",
    code:
      "ACCOUNT_EMAIL_CHANGE_TEMPORARILY_UNAVAILABLE",
    message:
      "Your email address cannot be changed right now. Please try again shortly.",
  });
}

function serializeReceipt(
  receipt: {
    challengeId: string;
    targetEmail: string;
    expiresAt: Date;
    resendAvailableAt: Date;
    attemptsRemaining: number;
  },
) {
  return {
    challengeId: receipt.challengeId,
    targetEmail: receipt.targetEmail,
    expiresAt:
      receipt.expiresAt.toISOString(),
    resendAvailableAt:
      receipt.resendAvailableAt
        .toISOString(),
    attemptsRemaining:
      receipt.attemptsRemaining,
  };
}

export async function getCurrentEmailChangeStatus(
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
      await getPendingAccountEmailChange(
        auth,
      );

    response.status(200).json({
      status: "success",
      code:
        "ACCOUNT_EMAIL_CHANGE_STATUS_READY",
      pending: result.pending
        ? serializeReceipt(
            result.pending,
          )
        : null,
    });
  } catch (error) {
    if (
      error instanceof
      AuthPersistenceError
    ) {
      sendTemporaryFailure(
        error,
        response,
      );
      return;
    }

    next(error);
  }
}

export async function requestCurrentEmailChange(
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
      await requestAccountEmailChange(
        request.body,
        auth,
        createRequestMetadata(request),
      );

    response.status(202).json({
      status: "success",
      code:
        "ACCOUNT_EMAIL_CHANGE_VERIFICATION_REQUIRED",
      message:
        "A verification code was sent to the new email address.",
      verification:
        serializeReceipt(result),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "ACCOUNT_INVALID_EMAIL_CHANGE_INPUT",
        message:
          "Check the new email address and try again.",
        errors:
          createValidationDetails(
            error,
            ["newEmail"],
          ),
      });
      return;
    }

    if (
      error instanceof
      AuthEmailChangeError
    ) {
      sendEmailChangeError(
        error,
        response,
      );
      return;
    }

    if (
      error instanceof
        AuthPersistenceError ||
      error instanceof
        AuthEmailConfigurationError
    ) {
      sendTemporaryFailure(
        error,
        response,
      );
      return;
    }

    next(error);
  }
}

export async function resendCurrentEmailChangeCode(
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
      await resendAccountEmailChangeCode(
        request.body,
        auth,
        createRequestMetadata(request),
      );

    response.status(200).json({
      status: "success",
      code:
        "ACCOUNT_EMAIL_CHANGE_CODE_RESENT",
      message:
        "A new verification code was sent.",
      verification:
        serializeReceipt(result),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "ACCOUNT_INVALID_EMAIL_CHANGE_RESEND_INPUT",
        message:
          "The email-change request is invalid.",
        errors:
          createValidationDetails(
            error,
            ["challengeId"],
          ),
      });
      return;
    }

    if (
      error instanceof
      AuthEmailChangeError
    ) {
      sendEmailChangeError(
        error,
        response,
      );
      return;
    }

    if (
      error instanceof
        AuthPersistenceError ||
      error instanceof
        AuthEmailConfigurationError
    ) {
      sendTemporaryFailure(
        error,
        response,
      );
      return;
    }

    next(error);
  }
}

export async function verifyCurrentEmailChange(
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
      await verifyAccountEmailChange(
        request.body,
        auth,
        createRequestMetadata(request),
      );

    setAuthSessionCookie(
      response,
      result.session.token,
      result.session.expiresAt,
    );

    response.status(200).json({
      status: "success",
      code:
        "ACCOUNT_EMAIL_CHANGED",
      message: result.googleDisconnected
        ? "Your email address has been updated. Google sign-in was disconnected because FilmGeezer keeps one account email, and your other devices were signed out."
        : "Your email address has been updated. Your other devices were signed out.",
      previousEmail:
        result.previousEmail,
      changedAt:
        result.changedAt.toISOString(),
      sessionsRevoked:
        result.sessionsRevoked,
      googleDisconnected:
        result.googleDisconnected,
      user: result.user,
      session: {
        expiresAt:
          result.session.expiresAt
            .toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "ACCOUNT_INVALID_EMAIL_CHANGE_VERIFICATION_INPUT",
        message:
          "Check the verification code and try again.",
        errors:
          createValidationDetails(
            error,
            ["challengeId", "code"],
          ),
      });
      return;
    }

    if (
      error instanceof
      AuthEmailChangeError
    ) {
      sendEmailChangeError(
        error,
        response,
      );
      return;
    }

    if (
      error instanceof
      AuthPersistenceError
    ) {
      sendTemporaryFailure(
        error,
        response,
      );
      return;
    }

    next(error);
  }
}

export async function cancelCurrentEmailChange(
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
      await cancelAccountEmailChange(
        request.params.challengeId,
        auth,
        createRequestMetadata(request),
      );

    response.status(200).json({
      status: "success",
      code:
        "ACCOUNT_EMAIL_CHANGE_CANCELLED",
      message:
        "The pending email change was cancelled.",
      challengeId:
        result.challengeId,
      cancelledAt:
        result.cancelledAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "ACCOUNT_INVALID_EMAIL_CHANGE_CHALLENGE",
        message:
          "The email-change request is invalid.",
      });
      return;
    }

    if (
      error instanceof
      AuthEmailChangeError
    ) {
      sendEmailChangeError(
        error,
        response,
      );
      return;
    }

    if (
      error instanceof
      AuthPersistenceError
    ) {
      sendTemporaryFailure(
        error,
        response,
      );
      return;
    }

    next(error);
  }
}
