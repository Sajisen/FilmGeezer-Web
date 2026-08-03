import { Router } from "express";
import { rateLimit } from "express-rate-limit";

import { getAdminDashboardOverview } from "../controllers/admin.controller.js";
import { ADMIN_HTTP_POLICY } from "../features/admin/admin.constants.js";
import { requireAdminSession } from "../middleware/admin.middleware.js";

const router = Router();

const overviewRateLimit = rateLimit({
  windowMs: ADMIN_HTTP_POLICY.overview.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.overview.maximumRequestsPerWindow,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  identifier: "filmgeezer-admin-overview",
  passOnStoreError: false,
  handler: (_request, response) => {
    response.status(429).json({
      status: "error",
      code: "ADMIN_OVERVIEW_RATE_LIMITED",
      message: "Too many administrator dashboard requests. Please wait.",
    });
  },
});

router.use(requireAdminSession);
router.get("/overview", overviewRateLimit, getAdminDashboardOverview);

export default router;
