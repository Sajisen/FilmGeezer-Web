import {
  Router,
  json,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";

import {
  isAllowedClientOrigin,
} from "../config/cors.js";

import {
  createContactMessage,
  createCurrentContactConversationReply,
  getCurrentContactConversation,
  getCurrentContactConversations,
} from "../controllers/contact.controller.js";

import {
  CONTACT_HTTP_POLICY,
} from "../features/contact/contact.constants.js";

import {
  getAuthenticatedSessionContext,
  requireAuthenticatedSession,
  requireAuthCsrfProtection,
} from "../middleware/auth.middleware.js";

const router = Router();

function createRateLimit(input: {
  windowMs: number;
  limit: number;
  identifier: string;
  code: string;
  message: string;
  useAuthenticatedUser?: boolean;
}) {
  return rateLimit({
    windowMs: input.windowMs,
    limit: input.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    identifier: input.identifier,
    passOnStoreError: false,
    ...(input.useAuthenticatedUser
      ? {
          keyGenerator: (request: Request) =>
            getAuthenticatedSessionContext(request).userId.toHexString(),
        }
      : {}),
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

const contactSubmissionRateLimit = createRateLimit({
  windowMs:
    CONTACT_HTTP_POLICY.submission.rateLimitWindowMilliseconds,
  limit: CONTACT_HTTP_POLICY.submission.maximumRequestsPerWindow,
  identifier: "filmgeezer-contact-submission",
  code: "CONTACT_RATE_LIMITED",
  message:
    "Too many messages were sent from this connection. Please wait before trying again.",
});

const contactHistoryReadRateLimit = createRateLimit({
  windowMs:
    CONTACT_HTTP_POLICY.historyRead.rateLimitWindowMilliseconds,
  limit: CONTACT_HTTP_POLICY.historyRead.maximumRequestsPerWindow,
  identifier: "filmgeezer-contact-history-read",
  code: "CONTACT_HISTORY_RATE_LIMITED",
  message:
    "Too many support-history requests. Please wait before trying again.",
  useAuthenticatedUser: true,
});

const contactReplyRateLimit = createRateLimit({
  windowMs: CONTACT_HTTP_POLICY.reply.rateLimitWindowMilliseconds,
  limit: CONTACT_HTTP_POLICY.reply.maximumRequestsPerWindow,
  identifier: "filmgeezer-contact-reply",
  code: "CONTACT_REPLY_RATE_LIMITED",
  message:
    "Too many support replies were sent. Please wait before trying again.",
  useAuthenticatedUser: true,
});

function requireTrustedClientOrigin(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const origin = request.get("origin");
  const fetchSite = request.get("sec-fetch-site");

  if (
    !origin ||
    !isAllowedClientOrigin(origin) ||
    fetchSite === "cross-site"
  ) {
    response.setHeader("Cache-Control", "no-store");
    response.status(403).json({
      status: "error",
      code: "CONTACT_ORIGIN_REJECTED",
      message: "The message request could not be verified.",
    });
    return;
  }

  next();
}

function requireJsonContentType(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  if (!request.is("application/json")) {
    response.setHeader("Cache-Control", "no-store");
    response.status(415).json({
      status: "error",
      code: "CONTACT_JSON_REQUIRED",
      message: "Contact messages must use application/json.",
    });
    return;
  }

  next();
}

router.post(
  "/messages",
  contactSubmissionRateLimit,
  requireTrustedClientOrigin,
  requireJsonContentType,
  json({
    limit: CONTACT_HTTP_POLICY.submission.requestBodyLimit,
    strict: true,
  }),
  createContactMessage,
);

router.get(
  "/conversations",
  requireAuthenticatedSession,
  contactHistoryReadRateLimit,
  getCurrentContactConversations,
);

router.get(
  "/conversations/:referenceId",
  requireAuthenticatedSession,
  contactHistoryReadRateLimit,
  getCurrentContactConversation,
);

router.post(
  "/conversations/:referenceId/messages",
  requireAuthenticatedSession,
  contactReplyRateLimit,
  requireAuthCsrfProtection,
  requireJsonContentType,
  json({
    limit: CONTACT_HTTP_POLICY.reply.requestBodyLimit,
    strict: true,
  }),
  createCurrentContactConversationReply,
);

export default router;
