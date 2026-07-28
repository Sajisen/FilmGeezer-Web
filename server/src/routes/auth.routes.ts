import {
  Router,
  json,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";
import {
  registerLocalAccount,
  verifyLocalEmailAddress,
} from "../controllers/auth.controller.js";
import {
  AUTH_EMAIL_VERIFICATION_HTTP_POLICY,
  AUTH_REGISTRATION_POLICY,
} from "../features/auth/auth.constants.js";

const router = Router();

const registrationRateLimit = rateLimit({
  windowMs:
    AUTH_REGISTRATION_POLICY
      .rateLimitWindowMilliseconds,

  limit:
    AUTH_REGISTRATION_POLICY
      .maximumRequestsPerWindow,

  /*
   * Send modern RateLimit response headers and omit the old
   * X-RateLimit-* header family.
   */
  standardHeaders: "draft-8",
  legacyHeaders: false,

  identifier:
    "filmgeezer-auth-registration",

  /*
   * Authentication protection should fail closed if a future shared
   * rate-limit store becomes unavailable.
   */
  passOnStoreError: false,

  handler: (_req, res) => {
    res.setHeader(
      "Cache-Control",
      "no-store",
    );

    res.status(429).json({
      status: "error",
      code:
        "AUTH_REGISTRATION_RATE_LIMITED",

      message:
        "Too many registration attempts. Please wait before trying again.",
    });
  },
});

const emailVerificationRateLimit =
  rateLimit({
    windowMs:
      AUTH_EMAIL_VERIFICATION_HTTP_POLICY
        .rateLimitWindowMilliseconds,

    limit:
      AUTH_EMAIL_VERIFICATION_HTTP_POLICY
        .maximumRequestsPerWindow,

    standardHeaders: "draft-8",
    legacyHeaders: false,

    identifier:
      "filmgeezer-auth-email-verification",

    passOnStoreError: false,

    handler: (_req, res) => {
      res.setHeader(
        "Cache-Control",
        "no-store",
      );

      res.status(429).json({
        status: "error",

        code:
          "AUTH_VERIFICATION_RATE_LIMITED",

        message:
          "Too many verification attempts. Please wait before trying again.",
      });
    },
  });

function requireJsonContentType(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.is("application/json")) {
    res.setHeader(
      "Cache-Control",
      "no-store",
    );

    res.status(415).json({
      status: "error",
      code: "AUTH_JSON_REQUIRED",

      message:
        "Registration requests must use application/json.",
    });

    return;
  }

  next();
}

router.post(
  "/register",

  /*
   * Rate limiting happens before JSON parsing so an abusive client
   * cannot repeatedly consume parser resources with oversized bodies.
   */
  registrationRateLimit,

  requireJsonContentType,

  json({
    limit:
      AUTH_REGISTRATION_POLICY
        .requestBodyLimit,

    strict: true,
  }),

  registerLocalAccount,
);

router.post(
  "/verify-email",

  emailVerificationRateLimit,

  requireJsonContentType,

  json({
    limit:
      AUTH_EMAIL_VERIFICATION_HTTP_POLICY
        .requestBodyLimit,

    strict: true,
  }),

  verifyLocalEmailAddress,
);

export default router;