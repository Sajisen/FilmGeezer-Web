import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  PREFERENCE_LIMITS,
  PREFERENCE_OPTIONS,
} from "../features/preferences/preferences.constants.js";

import {
  PreferencesPersistenceError,
  PreferencesRevisionConflictError,
} from "../features/preferences/preferences.errors.js";

import {
  getUserPreferences,
  updateUserPreferences,
} from "../features/preferences/preferences.service.js";

import {
  getAuthenticatedSessionContext,
} from "../middleware/auth.middleware.js";

function serializePreferences(input: {
  personalizationEnabled: boolean;
  preferredCategories: string[];
  preferredGenres: string[];
  hiddenGenres: string[];
  preferredLanguages: string[];
  revision: number;
  updatedAt: Date | null;
}) {
  return {
    personalizationEnabled: input.personalizationEnabled,
    preferredCategories: input.preferredCategories,
    preferredGenres: input.preferredGenres,
    hiddenGenres: input.hiddenGenres,
    preferredLanguages: input.preferredLanguages,
    revision: input.revision,
    updatedAt: input.updatedAt?.toISOString() ?? null,
  };
}

function createPreferenceOptions() {
  return {
    limits: {
      maximumPreferredGenres: PREFERENCE_LIMITS.preferredGenres,
      maximumHiddenGenres: PREFERENCE_LIMITS.hiddenGenres,
      maximumPreferredLanguages: PREFERENCE_LIMITS.preferredLanguages,
    },
    categories: PREFERENCE_OPTIONS.categories,
    genres: PREFERENCE_OPTIONS.genres,
    languages: PREFERENCE_OPTIONS.languages,
  };
}

function sendValidationError(
  response: Response,
  error: z.ZodError,
): void {
  response.status(400).json({
    status: "error",
    code: "PREFERENCES_INVALID_INPUT",
    message: "Check your entertainment choices and try again.",
    errors: error.flatten(),
  });
}

function sendPersistenceError(response: Response): void {
  response.status(503).json({
    status: "error",
    code: "PREFERENCES_TEMPORARILY_UNAVAILABLE",
    message:
      "Your entertainment preferences cannot be updated right now. Please try again shortly.",
  });
}

export async function getCurrentUserPreferences(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const preferences = await getUserPreferences(auth.userId);

    response.status(200).json({
      status: "success",
      code: "ACCOUNT_PREFERENCES_READY",
      preferences: serializePreferences(preferences),
      options: createPreferenceOptions(),
    });
  } catch (error) {
    if (error instanceof PreferencesPersistenceError) {
      sendPersistenceError(response);
      return;
    }

    next(error);
  }
}

export async function updateCurrentUserPreferences(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result = await updateUserPreferences(auth.userId, request.body);

    response.status(200).json({
      status: "success",
      code: "ACCOUNT_PREFERENCES_UPDATED",
      message: result.changed
        ? "Your entertainment choices were saved."
        : "Your entertainment choices are already up to date.",
      changed: result.changed,
      preferences: serializePreferences(result),
      options: createPreferenceOptions(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response, error);
      return;
    }

    if (error instanceof PreferencesRevisionConflictError) {
      response.status(409).json({
        status: "error",
        code: error.code,
        message:
          "Your entertainment choices changed on another device. Reload the latest version and try again.",
      });
      return;
    }

    if (error instanceof PreferencesPersistenceError) {
      sendPersistenceError(response);
      return;
    }

    next(error);
  }
}
