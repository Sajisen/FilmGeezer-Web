import {
  Router,
  json,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";

import { getAdminDashboardOverview } from "../controllers/admin.controller.js";
import {
  getAdminSupportInbox,
  getAdminSupportThread,
  patchAdminSupportStatus,
  postAdminSupportReply,
} from "../controllers/adminSupport.controller.js";
import { ADMIN_HTTP_POLICY } from "../features/admin/admin.constants.js";
import {
  requireAdminCsrfProtection,
  requireAdminSession,
  requireFullAdminSession,
} from "../middleware/admin.middleware.js";

const router = Router();

function requireJson(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!request.is("application/json")) {
    response.status(415).json({
      status: "error",
      code: "ADMIN_JSON_REQUIRED",
      message: "Administrator requests must use application/json.",
    });
    return;
  }

  next();
}

function createAdminRateLimit(input: {
  windowMs: number;
  limit: number;
  identifier: string;
  code: string;
  message: string;
}) {
  return rateLimit({
    windowMs: input.windowMs,
    limit: input.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    identifier: input.identifier,
    passOnStoreError: false,
    handler: (_request, response) => {
      response.setHeader("Cache-Control", "no-store");
      response.status(429).json({
        status: "error",
        code: input.code,
        message: input.message,
      });
    },
  });
}

const overviewRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.overview.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.overview.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-overview",
  code: "ADMIN_OVERVIEW_RATE_LIMITED",
  message: "Too many administrator dashboard requests. Please wait.",
});

const supportReadRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.supportRead.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.supportRead.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-support-read",
  code: "ADMIN_SUPPORT_READ_RATE_LIMITED",
  message: "Too many administrator support requests. Please wait.",
});

const supportWriteRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.supportWrite.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.supportWrite.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-support-write",
  code: "ADMIN_SUPPORT_WRITE_RATE_LIMITED",
  message: "Too many administrator support changes. Please wait.",
});

router.use(requireAdminSession);
router.use(requireFullAdminSession);

router.get("/overview", overviewRateLimit, getAdminDashboardOverview);
router.get("/support", supportReadRateLimit, getAdminSupportInbox);
router.get(
  "/support/:referenceId",
  supportReadRateLimit,
  getAdminSupportThread,
);

router.post(
  "/support/:referenceId/messages",
  supportWriteRateLimit,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.supportWrite.replyBodyLimit,
    strict: true,
  }),
  postAdminSupportReply,
);

router.patch(
  "/support/:referenceId/status",
  supportWriteRateLimit,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.supportWrite.statusBodyLimit,
    strict: true,
  }),
  patchAdminSupportStatus,
);

export default router;
