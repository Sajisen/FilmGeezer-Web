import {
  Router,
  json,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";

import { getAdminDashboardOverview } from "../controllers/admin.controller.js";
import { getAdminAuditEvents } from "../controllers/adminAudit.controller.js";
import {
  getAdminContentEntries,
  getAdminContentEntry,
  getAdminContentTmdbSearch,
  patchAdminContentEntryStatus,
  putAdminContentEntry,
} from "../controllers/adminContent.controller.js";
import {
  deleteAdminUserSession,
  getAdminUserDetail,
  getAdminUsers,
  postAdminUserReactivation,
  postAdminUserSessionsRevocation,
  postAdminUserSuspension,
} from "../controllers/adminUser.controller.js";
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
  requireRecentAdminAuthentication,
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
    handler: (_request: Request, response: Response) => {
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


const userReadRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.userRead.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.userRead.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-user-read",
  code: "ADMIN_USER_READ_RATE_LIMITED",
  message: "Too many administrator user requests. Please wait.",
});

const userWriteRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.userWrite.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.userWrite.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-user-write",
  code: "ADMIN_USER_WRITE_RATE_LIMITED",
  message: "Too many administrator user changes. Please wait.",
});

const contentReadRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.contentRead.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.contentRead.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-content-read",
  code: "ADMIN_CONTENT_READ_RATE_LIMITED",
  message: "Too many administrator content requests. Please wait.",
});

const contentWriteRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.contentWrite.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.contentWrite.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-content-write",
  code: "ADMIN_CONTENT_WRITE_RATE_LIMITED",
  message: "Too many administrator content changes. Please wait.",
});

const auditReadRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.auditRead.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.auditRead.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-audit-read",
  code: "ADMIN_AUDIT_READ_RATE_LIMITED",
  message: "Too many administrator audit requests. Please wait.",
});

router.use(requireAdminSession);
router.use(requireFullAdminSession);

router.get("/overview", overviewRateLimit, getAdminDashboardOverview);
router.get("/audit", auditReadRateLimit, getAdminAuditEvents);
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


router.get("/users", userReadRateLimit, getAdminUsers);
router.get("/users/:userId", userReadRateLimit, getAdminUserDetail);

router.delete(
  "/users/:userId/sessions/:sessionId",
  userWriteRateLimit,
  requireRecentAdminAuthentication,
  requireAdminCsrfProtection,
  deleteAdminUserSession,
);

router.post(
  "/users/:userId/sessions/revoke-all",
  userWriteRateLimit,
  requireRecentAdminAuthentication,
  requireAdminCsrfProtection,
  postAdminUserSessionsRevocation,
);

router.post(
  "/users/:userId/suspend",
  userWriteRateLimit,
  requireRecentAdminAuthentication,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.userWrite.reasonBodyLimit,
    strict: true,
  }),
  postAdminUserSuspension,
);

router.post(
  "/users/:userId/reactivate",
  userWriteRateLimit,
  requireRecentAdminAuthentication,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.userWrite.reasonBodyLimit,
    strict: true,
  }),
  postAdminUserReactivation,
);

router.get("/content", contentReadRateLimit, getAdminContentEntries);
router.get(
  "/content/tmdb/search",
  contentReadRateLimit,
  getAdminContentTmdbSearch,
);
router.get(
  "/content/:mediaType/:tmdbId",
  contentReadRateLimit,
  getAdminContentEntry,
);

router.put(
  "/content/:mediaType/:tmdbId",
  contentWriteRateLimit,
  requireRecentAdminAuthentication,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.contentWrite.saveBodyLimit,
    strict: true,
  }),
  putAdminContentEntry,
);

router.patch(
  "/content/:mediaType/:tmdbId/status",
  contentWriteRateLimit,
  requireRecentAdminAuthentication,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.contentWrite.statusBodyLimit,
    strict: true,
  }),
  patchAdminContentEntryStatus,
);

export default router;
