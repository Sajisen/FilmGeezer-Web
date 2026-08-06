import {
  Router,
  json,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { rateLimit } from "express-rate-limit";

import { isAllowedAdminOrigin } from "../config/cors.js";
import {
  beginAdminMfaSetup,
  beginAdminPasskeyLogin,
  beginAdminPasskeyReauthentication,
  beginAdminPasskeyRegistration,
  cancelAdminMfaChallenge,
  completeAdminMfaSetup,
  completeAdminPasskeyLogin,
  completeAdminPasskeyReauthentication,
  completeAdminPasskeyRegistration,
  getAdminMfaSecurityStatus,
  getAdminPasskeys,
  getCurrentAdminSession,
  loginAdminAccount,
  logoutAdminAccount,
  reauthenticateAdminAccount,
  regenerateAdminMfaRecoveryCodes,
  regenerateAdminMfaRecoveryCodesWithRecentAuthentication,
  removeAdminMfa,
  removeAdminPasskey,
  verifyAdminMfaChallenge,
} from "../controllers/adminAuth.controller.js";
import { ADMIN_HTTP_POLICY } from "../features/admin/admin.constants.js";
import {
  requireAdminCsrfProtection,
  requireAdminSession,
  requireFullAdminSession,
  requireRecentAdminAuthentication,
  requireRecentAdminAuthenticationUnlessEnrollment,
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

function requireAdminOrigin(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const origin = request.get("origin");
  const fetchSite = request.get("sec-fetch-site");

  if (!origin || !isAllowedAdminOrigin(origin) || fetchSite === "cross-site") {
    response.status(403).json({
      status: "error",
      code: "ADMIN_ORIGIN_REJECTED",
      message: "The administrator request origin could not be verified.",
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

const loginRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.login.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.login.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-login",
  code: "ADMIN_LOGIN_RATE_LIMITED",
  message: "Too many administrator sign-in attempts. Please wait.",
});

const mfaChallengeRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.mfaChallenge.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.mfaChallenge.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-mfa-challenge",
  code: "ADMIN_MFA_RATE_LIMITED",
  message: "Too many administrator MFA attempts. Please wait.",
});

const mfaManagementRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.mfaManagement.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.mfaManagement.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-mfa-management",
  code: "ADMIN_MFA_MANAGEMENT_RATE_LIMITED",
  message: "Too many administrator security changes. Please wait.",
});

const passkeyRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.passkey.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.passkey.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-passkey",
  code: "ADMIN_PASSKEY_RATE_LIMITED",
  message: "Too many administrator passkey attempts. Please wait.",
});

const sessionRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.session.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.session.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-session",
  code: "ADMIN_SESSION_RATE_LIMITED",
  message: "Too many administrator session checks. Please wait.",
});

const logoutRateLimit = createAdminRateLimit({
  windowMs: ADMIN_HTTP_POLICY.logout.rateLimitWindowMilliseconds,
  limit: ADMIN_HTTP_POLICY.logout.maximumRequestsPerWindow,
  identifier: "filmgeezer-admin-logout",
  code: "ADMIN_LOGOUT_RATE_LIMITED",
  message: "Too many administrator sign-out requests. Please wait.",
});

router.post(
  "/login",
  loginRateLimit,
  requireAdminOrigin,
  requireJson,
  json({ limit: ADMIN_HTTP_POLICY.login.requestBodyLimit, strict: true }),
  loginAdminAccount,
);

router.post(
  "/mfa/verify",
  mfaChallengeRateLimit,
  requireAdminOrigin,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.mfaChallenge.requestBodyLimit,
    strict: true,
  }),
  verifyAdminMfaChallenge,
);

router.post(
  "/mfa/cancel",
  mfaChallengeRateLimit,
  requireAdminOrigin,
  cancelAdminMfaChallenge,
);

router.post(
  "/passkeys/login/options",
  passkeyRateLimit,
  requireAdminOrigin,
  requireJson,
  json({ limit: ADMIN_HTTP_POLICY.passkey.requestBodyLimit, strict: true }),
  beginAdminPasskeyLogin,
);

router.post(
  "/passkeys/login/verify",
  passkeyRateLimit,
  requireAdminOrigin,
  requireJson,
  json({ limit: ADMIN_HTTP_POLICY.passkey.requestBodyLimit, strict: true }),
  completeAdminPasskeyLogin,
);

router.get(
  "/session",
  sessionRateLimit,
  requireAdminSession,
  getCurrentAdminSession,
);

router.get(
  "/mfa/status",
  sessionRateLimit,
  requireAdminSession,
  getAdminMfaSecurityStatus,
);

router.get(
  "/passkeys",
  sessionRateLimit,
  requireAdminSession,
  getAdminPasskeys,
);

router.post(
  "/mfa/setup",
  mfaManagementRateLimit,
  requireAdminSession,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.mfaManagement.requestBodyLimit,
    strict: true,
  }),
  beginAdminMfaSetup,
);

router.post(
  "/mfa/setup/verify",
  mfaManagementRateLimit,
  requireAdminSession,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.mfaManagement.requestBodyLimit,
    strict: true,
  }),
  completeAdminMfaSetup,
);

router.post(
  "/passkeys/registration/options",
  passkeyRateLimit,
  requireAdminSession,
  requireAdminCsrfProtection,
  requireRecentAdminAuthenticationUnlessEnrollment,
  requireJson,
  json({ limit: ADMIN_HTTP_POLICY.passkey.requestBodyLimit, strict: true }),
  beginAdminPasskeyRegistration,
);

router.post(
  "/passkeys/registration/verify",
  passkeyRateLimit,
  requireAdminSession,
  requireAdminCsrfProtection,
  requireRecentAdminAuthenticationUnlessEnrollment,
  requireJson,
  json({ limit: ADMIN_HTTP_POLICY.passkey.requestBodyLimit, strict: true }),
  completeAdminPasskeyRegistration,
);

router.post(
  "/passkeys/reauthentication/options",
  passkeyRateLimit,
  requireAdminSession,
  requireFullAdminSession,
  requireAdminCsrfProtection,
  requireJson,
  json({ limit: ADMIN_HTTP_POLICY.passkey.requestBodyLimit, strict: true }),
  beginAdminPasskeyReauthentication,
);

router.post(
  "/passkeys/reauthentication/verify",
  passkeyRateLimit,
  requireAdminSession,
  requireFullAdminSession,
  requireAdminCsrfProtection,
  requireJson,
  json({ limit: ADMIN_HTTP_POLICY.passkey.requestBodyLimit, strict: true }),
  completeAdminPasskeyReauthentication,
);

router.delete(
  "/passkeys/:credentialId",
  passkeyRateLimit,
  requireAdminSession,
  requireFullAdminSession,
  requireAdminCsrfProtection,
  requireRecentAdminAuthentication,
  removeAdminPasskey,
);

router.post(
  "/mfa/recovery-codes",
  mfaManagementRateLimit,
  requireAdminSession,
  requireFullAdminSession,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.mfaManagement.requestBodyLimit,
    strict: true,
  }),
  regenerateAdminMfaRecoveryCodes,
);

router.post(
  "/mfa/recovery-codes/recent-authentication",
  mfaManagementRateLimit,
  requireAdminSession,
  requireFullAdminSession,
  requireAdminCsrfProtection,
  requireRecentAdminAuthentication,
  regenerateAdminMfaRecoveryCodesWithRecentAuthentication,
);

router.post(
  "/mfa/disable",
  mfaManagementRateLimit,
  requireAdminSession,
  requireFullAdminSession,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.mfaManagement.requestBodyLimit,
    strict: true,
  }),
  removeAdminMfa,
);

router.post(
  "/reauthenticate",
  mfaManagementRateLimit,
  requireAdminSession,
  requireFullAdminSession,
  requireAdminCsrfProtection,
  requireJson,
  json({
    limit: ADMIN_HTTP_POLICY.mfaManagement.requestBodyLimit,
    strict: true,
  }),
  reauthenticateAdminAccount,
);

router.post(
  "/logout",
  logoutRateLimit,
  requireAdminSession,
  requireAdminCsrfProtection,
  logoutAdminAccount,
);

export default router;
