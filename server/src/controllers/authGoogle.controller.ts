import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  AuthEmailConfigurationError,
  AuthGoogleAuthenticationError,
  AuthGoogleConfigurationError,
  AuthGoogleLinkConfirmationRequiredError,
  AuthPersistenceError,
} from "../features/auth/auth.errors.js";
import { authenticateWithGoogle } from "../features/auth/auth.google.service.js";
import { setAuthSessionCookie } from "../features/auth/auth.session.js";

function createRequestMetadata(request: Request) {
  return {
    ipAddress:
      request.ip ||
      request.socket.remoteAddress ||
      null,
    userAgent:
      request.get("user-agent") ?? null,
  };
}

export async function authenticateGoogleAccount(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await authenticateWithGoogle(
      request.body,
      createRequestMetadata(request),
    );

    if (result.outcome === "verification-required") {
      response.status(202).json({
        status: "success",
        code: "AUTH_GOOGLE_EMAIL_VERIFICATION_REQUIRED",
        message:
          "Verify your email address to finish setting up FilmGeezer.",
        email: result.email,
        verification: {
          challengeId: result.verification.challengeId,
          expiresAt: result.verification.expiresAt.toISOString(),
          resendAvailableAt:
            result.verification.resendAvailableAt.toISOString(),
        },
      });
      return;
    }

    setAuthSessionCookie(
      response,
      result.session.token,
      result.session.expiresAt,
    );

    response.status(200).json({
      status: "success",
      code: "AUTH_GOOGLE_AUTHENTICATION_SUCCEEDED",
      message: result.createdAccount
        ? "Your FilmGeezer account has been created and you are signed in."
        : result.linkedExistingAccount
          ? "Google has been connected to your FilmGeezer account and you are signed in."
          : "You are signed in with Google.",
      createdAccount: result.createdAccount,
      linkedExistingAccount: result.linkedExistingAccount,
      user: result.user,
      session: {
        expiresAt: result.session.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code: "AUTH_INVALID_GOOGLE_INPUT",
        message: "The Google sign-in response is invalid. Please try again.",
      });
      return;
    }

    if (error instanceof AuthGoogleLinkConfirmationRequiredError) {
      response.status(409).json({
        status: "error",
        code: error.code,
        message: error.message,
        errors: error.passwordWasInvalid
          ? { fields: { password: [error.message] } }
          : undefined,
      });
      return;
    }

    if (error instanceof AuthGoogleAuthenticationError) {
      response.status(401).json({
        status: "error",
        code: error.code,
        message:
          error.reason === "email-unverified"
            ? "Google did not provide a verified email address for this account."
            : error.reason === "different-google-account-connected"
              ? "A different Google account is already connected to this FilmGeezer account. Sign in with your FilmGeezer password and manage Google sign-in from Account Security."
              : error.reason === "google-email-mismatch"
                ? "This Google account no longer uses the same email as your FilmGeezer account. Sign in with your FilmGeezer email and password, then update the connection from Account Security."
                : "Google sign in could not be completed. Please try again.",
      });
      return;
    }

    if (
      error instanceof AuthGoogleConfigurationError ||
      error instanceof AuthEmailConfigurationError
    ) {
      console.error("[auth-google] Google authentication is not configured.", {
        name: error.name,
        code: error.code,
      });

      response.status(503).json({
        status: "error",
        code: "AUTH_GOOGLE_TEMPORARILY_UNAVAILABLE",
        message:
          "Google sign in is temporarily unavailable. Please use email and password or try again shortly.",
      });
      return;
    }

    if (error instanceof AuthPersistenceError) {
      console.error("[auth-google] Google authentication persistence failed.", {
        name: error.name,
        code: error.code,
      });

      response.status(503).json({
        status: "error",
        code: "AUTH_TEMPORARILY_UNAVAILABLE",
        message:
          "Google sign in is temporarily unavailable. Please try again shortly.",
      });
      return;
    }

    next(error);
  }
}
