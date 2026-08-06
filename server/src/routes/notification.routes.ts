import {
  Router,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";

import {
  getCurrentNotification,
  getCurrentNotifications,
  getCurrentNotificationSummary,
  markAllCurrentNotificationsRead,
  markCurrentNotificationRead,
} from "../controllers/notification.controller.js";
import { NOTIFICATION_HTTP_POLICY } from "../features/notifications/notification.constants.js";
import {
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
} from "../middleware/auth.middleware.js";

const router = Router();

function createNotificationRateLimit(input: {
  windowMs: number;
  limit: number;
  identifier: string;
}) {
  return rateLimit({
    windowMs: input.windowMs,
    limit: input.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    identifier: input.identifier,
    passOnStoreError: false,
    handler: (_request, response: Response) => {
      response.setHeader("Cache-Control", "no-store");
      response.status(429).json({
        status: "error",
        code: "NOTIFICATION_RATE_LIMITED",
        message:
          "Too many notification requests. Please wait before trying again.",
      });
    },
  });
}

const readRateLimit = createNotificationRateLimit({
  windowMs: NOTIFICATION_HTTP_POLICY.read.rateLimitWindowMilliseconds,
  limit: NOTIFICATION_HTTP_POLICY.read.maximumRequestsPerWindow,
  identifier: "filmgeezer-notifications-read",
});

const mutationRateLimit = createNotificationRateLimit({
  windowMs: NOTIFICATION_HTTP_POLICY.mutation.rateLimitWindowMilliseconds,
  limit: NOTIFICATION_HTTP_POLICY.mutation.maximumRequestsPerWindow,
  identifier: "filmgeezer-notifications-mutation",
});

router.get(
  "/summary",
  readRateLimit,
  requireAuthenticatedSession,
  getCurrentNotificationSummary,
);

router.get(
  "/:notificationId",
  readRateLimit,
  requireAuthenticatedSession,
  getCurrentNotification,
);

router.get(
  "/",
  readRateLimit,
  requireAuthenticatedSession,
  getCurrentNotifications,
);

router.patch(
  "/:notificationId/read",
  mutationRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  markCurrentNotificationRead,
);

router.post(
  "/read-all",
  mutationRateLimit,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
  markAllCurrentNotificationsRead,
);

export default router;
