import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import {
  getCurrentUserRecommendations,
} from "../controllers/recommendations.controller.js";
import {
  RECOMMENDATION_POLICY,
} from "../features/recommendations/recommendations.constants.js";
import {
  getAuthenticatedSessionContext,
  requireAuthenticatedSession,
} from "../middleware/auth.middleware.js";

const router = Router();

const recommendationReadRateLimit = rateLimit({
  windowMs: RECOMMENDATION_POLICY.readRateLimitWindowMilliseconds,
  limit: RECOMMENDATION_POLICY.maximumReadRequestsPerWindow,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  identifier: "filmgeezer-personal-recommendations",
  keyGenerator: (request) =>
    getAuthenticatedSessionContext(request).userId.toHexString(),
  passOnStoreError: false,
  handler: (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.status(429).json({
      status: "error",
      code: "RECOMMENDATIONS_RATE_LIMITED",
      message: "Too many recommendation requests. Please try again shortly.",
    });
  },
});

router.get(
  "/:category",
  requireAuthenticatedSession,
  recommendationReadRateLimit,
  getCurrentUserRecommendations,
);

export default router;
