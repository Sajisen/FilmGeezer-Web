import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  getAuthenticatedSessionContext,
} from "../middleware/auth.middleware.js";
import {
  RecommendationsPersistenceError,
} from "../features/recommendations/recommendations.errors.js";
import {
  getPersonalRecommendations,
} from "../features/recommendations/recommendations.service.js";
import {
  recommendationCategorySchema,
} from "../features/recommendations/recommendations.validation.js";
import { TmdbRequestError } from "../services/tmdb.service.js";

export async function getCurrentUserRecommendations(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const category = recommendationCategorySchema.parse(
      request.params.category,
    );
    const auth = getAuthenticatedSessionContext(request);
    const result = await getPersonalRecommendations(
      auth.userId,
      category,
    );

    response.status(200).json({
      status: "success",
      code: result.available
        ? "RECOMMENDATIONS_READY"
        : "RECOMMENDATIONS_NOT_ENOUGH_SIGNAL",
      category,
      ...result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code: "RECOMMENDATIONS_INVALID_CATEGORY",
        message: "Choose a supported recommendation category.",
      });
      return;
    }

    if (error instanceof RecommendationsPersistenceError) {
      response.status(503).json({
        status: "error",
        code: "RECOMMENDATIONS_TEMPORARILY_UNAVAILABLE",
        message: "Personal recommendations cannot be prepared right now.",
      });
      return;
    }

    if (error instanceof TmdbRequestError) {
      response.status(error.status === 401 ? 502 : 503).json({
        status: "error",
        code: "RECOMMENDATIONS_SOURCE_UNAVAILABLE",
        message: "Personal recommendations cannot be prepared right now.",
      });
      return;
    }

    next(error);
  }
}
