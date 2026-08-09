import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  EmailPreferencesPersistenceError,
  EmailPreferencesRevisionConflictError,
} from "../features/emailPreferences/emailPreferences.errors.js";
import {
  getUserEmailPreferences,
  updateUserEmailPreferences,
} from "../features/emailPreferences/emailPreferences.service.js";
import {
  getAuthenticatedSessionContext,
} from "../middleware/auth.middleware.js";

function serializeEmailPreferences(input: {
  recommendationsAndDiscoveryEmailsEnabled: boolean;
  productUpdatesEmailsEnabled: boolean;
  revision: number;
  updatedAt: Date | null;
}) {
  return {
    recommendationsAndDiscoveryEmailsEnabled:
      input.recommendationsAndDiscoveryEmailsEnabled,
    productUpdatesEmailsEnabled:
      input.productUpdatesEmailsEnabled,
    revision: input.revision,
    updatedAt: input.updatedAt?.toISOString() ?? null,
  };
}

function sendPersistenceError(response: Response): void {
  response.status(503).json({
    status: "error",
    code: "EMAIL_PREFERENCES_TEMPORARILY_UNAVAILABLE",
    message:
      "Your email preferences cannot be updated right now. Please try again shortly.",
  });
}

export async function getCurrentUserEmailPreferences(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const preferences =
      await getUserEmailPreferences(auth.userId);

    response.status(200).json({
      status: "success",
      code: "ACCOUNT_EMAIL_PREFERENCES_READY",
      preferences:
        serializeEmailPreferences(preferences),
    });
  } catch (error) {
    if (
      error instanceof
      EmailPreferencesPersistenceError
    ) {
      sendPersistenceError(response);
      return;
    }

    next(error);
  }
}

export async function updateCurrentUserEmailPreferences(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result =
      await updateUserEmailPreferences(
        auth.userId,
        request.body,
      );

    response.status(200).json({
      status: "success",
      code: "ACCOUNT_EMAIL_PREFERENCES_UPDATED",
      message: result.changed
        ? "Your optional email choices were saved."
        : "Your email choices are already up to date.",
      changed: result.changed,
      preferences:
        serializeEmailPreferences(result),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code: "EMAIL_PREFERENCES_INVALID_INPUT",
        message:
          "Check your email choices and try again.",
        errors: error.flatten(),
      });
      return;
    }

    if (
      error instanceof
      EmailPreferencesRevisionConflictError
    ) {
      response.status(409).json({
        status: "error",
        code: error.code,
        message:
          "Your email choices changed on another device. Reload the latest version and try again.",
      });
      return;
    }

    if (
      error instanceof
      EmailPreferencesPersistenceError
    ) {
      sendPersistenceError(response);
      return;
    }

    next(error);
  }
}
