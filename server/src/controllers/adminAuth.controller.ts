import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  loginAdministrator,
} from "../features/admin/admin.auth.service.js";
import {
  AdminInvalidCredentialsError,
  AdminMfaConfigurationError,
  AdminMfaOperationError,
  AdminMfaVerificationError,
  AdminPasskeyConfigurationError,
  AdminPasskeyOperationError,
  AdminPasskeyVerificationError,
  AdminPersistenceError,
} from "../features/admin/admin.errors.js";
import {
  disableAdminMfa,
  getAdminMfaStatus,
  reauthenticateAdministrator,
  regenerateAdminRecoveryCodes,
  regenerateAdminRecoveryCodesAfterRecentAuthentication,
  startAdminMfaSetup,
  verifyAdminMfaLoginChallenge,
  verifyAdminMfaSetup,
} from "../features/admin/admin.mfa.service.js";
import { isAdminWebAuthnConfigured } from "../features/admin/admin.passkey.config.js";
import {
  getAdminPasskeyStatus,
  revokeAdministratorPasskey,
  startAdminPasskeyLogin,
  startAdminPasskeyReauthentication,
  startAdminPasskeyRegistration,
  verifyAdminPasskeyLogin,
  verifyAdminPasskeyReauthentication,
  verifyAdminPasskeyRegistration,
} from "../features/admin/admin.passkey.service.js";
import {
  clearAdminMfaChallengeCookie,
  clearAdminSessionCookie,
  readAdminMfaChallengeToken,
  setAdminMfaChallengeCookie,
  setAdminSessionCookie,
} from "../features/admin/admin.session.js";
import {
  logoutAdministrator,
} from "../features/admin/admin.session.service.js";
import {
  getAdminContext,
} from "../middleware/admin.middleware.js";

function createRequestMetadata(request: Request) {
  return {
    ipAddress: request.ip || request.socket.remoteAddress || null,
    userAgent: request.get("user-agent") ?? null,
  };
}

function serializeSession(context: {
  accessLevel: "full" | "mfa-enrollment";
  createdAt: Date;
  lastSeenAt: Date;
  recentAuthenticationAt: Date;
  mfaVerifiedAt: Date | null;
  idleExpiresAt: Date;
  expiresAt: Date;
}) {
  return {
    accessLevel: context.accessLevel,
    createdAt: context.createdAt.toISOString(),
    lastSeenAt: context.lastSeenAt.toISOString(),
    recentAuthenticationAt:
      context.recentAuthenticationAt.toISOString(),
    mfaVerifiedAt: context.mfaVerifiedAt?.toISOString() ?? null,
    idleExpiresAt: context.idleExpiresAt.toISOString(),
    expiresAt: context.expiresAt.toISOString(),
  };
}

function serializeSecurity(context: {
  mfaEnabled: boolean;
  mfaRequiredByPolicy: boolean;
  passkeysConfigured: boolean;
  passkeyCount: number;
  recoveryCodesRemaining: number;
  mfaEnabledAt: Date | null;
}) {
  return {
    mfaEnabled: context.mfaEnabled,
    mfaRequiredByPolicy: context.mfaRequiredByPolicy,
    passkeysConfigured: context.passkeysConfigured,
    passkeyCount: context.passkeyCount,
    recoveryCodesRemaining: context.recoveryCodesRemaining,
    mfaEnabledAt: context.mfaEnabledAt?.toISOString() ?? null,
  };
}

function serializeUser(context: {
  userId: { toHexString(): string } | string;
  email: string;
  displayName: string;
  profileImagePath: string | null;
  roles: Array<"user" | "admin">;
}) {
  return {
    userId:
      typeof context.userId === "string"
        ? context.userId
        : context.userId.toHexString(),
    email: context.email,
    displayName: context.displayName,
    profileImagePath: context.profileImagePath,
    roles: context.roles,
  };
}

function sendValidationError(response: Response): void {
  response.status(400).json({
    status: "error",
    code: "ADMIN_AUTH_VALIDATION_FAILED",
    message: "The administrator authentication details are invalid.",
  });
}

function handleMfaError(
  error: unknown,
  response: Response,
): boolean {
  if (error instanceof AdminInvalidCredentialsError) {
    response.status(401).json({
      status: "error",
      code: "ADMIN_REAUTHENTICATION_FAILED",
      message: "The administrator credentials were not accepted.",
    });
    return true;
  }

  if (error instanceof AdminMfaVerificationError) {
    response.status(401).json({
      status: "error",
      code: "ADMIN_MFA_VERIFICATION_FAILED",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminMfaConfigurationError) {
    response.status(503).json({
      status: "error",
      code: "ADMIN_MFA_NOT_CONFIGURED",
      message:
        "Administrator MFA is not configured on this server yet.",
    });
    return true;
  }

  if (error instanceof AdminMfaOperationError) {
    response.status(409).json({
      status: "error",
      code: "ADMIN_MFA_OPERATION_REJECTED",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminPasskeyVerificationError) {
    response.status(401).json({
      status: "error",
      code: "ADMIN_PASSKEY_VERIFICATION_FAILED",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminPasskeyConfigurationError) {
    response.status(503).json({
      status: "error",
      code: "ADMIN_PASSKEY_NOT_CONFIGURED",
      message: "Administrator passkeys are not configured on this server yet.",
    });
    return true;
  }

  if (error instanceof AdminPasskeyOperationError) {
    response.status(409).json({
      status: "error",
      code: "ADMIN_PASSKEY_OPERATION_REJECTED",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminPersistenceError) {
    response.status(503).json({
      status: "error",
      code: "ADMIN_TEMPORARILY_UNAVAILABLE",
      message:
        "Administrator security is temporarily unavailable. Please try again shortly.",
    });
    return true;
  }

  return false;
}

export async function loginAdminAccount(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await loginAdministrator(
      request.body,
      createRequestMetadata(request),
    );

    clearAdminMfaChallengeCookie(response);

    if (result.kind === "mfa-challenge") {
      clearAdminSessionCookie(response);
      setAdminMfaChallengeCookie(
        response,
        result.challengeToken,
        result.expiresAt,
      );
      response.status(202).json({
        status: "success",
        code: "ADMIN_MFA_CHALLENGE_REQUIRED",
        message: result.passkeyAllowed
          ? "Verify with your passkey or use another method."
          : "Enter the code from your authenticator app.",
        challenge: {
          expiresAt: result.expiresAt.toISOString(),
          passkeyAllowed: result.passkeyAllowed,
          totpAllowed: result.totpAllowed,
          recoveryAllowed: result.recoveryAllowed,
        },
      });
      return;
    }

    setAdminSessionCookie(
      response,
      result.result.session.token,
      result.result.session.expiresAt,
    );

    response.status(200).json({
      status: "success",
      code:
        result.result.session.accessLevel === "mfa-enrollment"
          ? "ADMIN_MFA_ENROLLMENT_REQUIRED"
          : "ADMIN_LOGIN_SUCCEEDED",
      message:
        result.result.session.accessLevel === "mfa-enrollment"
          ? "Set up administrator MFA to continue."
          : "Administrator access granted.",
      user: result.result.user,
      session: serializeSession(result.result.session),
      csrfToken: result.result.session.csrfToken,
      security: {
        mfaEnabled: false,
        mfaRequiredByPolicy: result.result.session.accessLevel === "mfa-enrollment",
        passkeysConfigured: isAdminWebAuthnConfigured(),
        passkeyCount: 0,
        recoveryCodesRemaining: 0,
        mfaEnabledAt: null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }

    if (error instanceof AdminInvalidCredentialsError) {
      clearAdminSessionCookie(response);
      clearAdminMfaChallengeCookie(response);
      response.status(401).json({
        status: "error",
        code: "ADMIN_LOGIN_FAILED",
        message:
          "Administrator access could not be granted with those credentials.",
      });
      return;
    }

    if (error instanceof AdminPersistenceError) {
      response.status(503).json({
        status: "error",
        code: "ADMIN_TEMPORARILY_UNAVAILABLE",
        message:
          "Administrator sign-in is temporarily unavailable. Please try again shortly.",
      });
      return;
    }

    next(error);
  }
}

export async function verifyAdminMfaChallenge(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  const challengeToken = readAdminMfaChallengeToken(request);

  if (!challengeToken) {
    response.status(401).json({
      status: "error",
      code: "ADMIN_MFA_CHALLENGE_REQUIRED",
      message: "Sign in again to verify administrator MFA.",
    });
    return;
  }

  try {
    const verification = await verifyAdminMfaLoginChallenge({
      body: request.body,
      challengeToken,
      requestMetadata: createRequestMetadata(request),
    });
    const { result } = verification;

    clearAdminMfaChallengeCookie(response);
    setAdminSessionCookie(
      response,
      result.session.token,
      result.session.expiresAt,
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_LOGIN_SUCCEEDED",
      message: "Administrator MFA verified.",
      user: result.user,
      session: serializeSession(result.session),
      csrfToken: result.session.csrfToken,
      security: {
        ...verification.security,
        mfaEnabledAt:
          verification.security.mfaEnabledAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }

    if (error instanceof AdminMfaVerificationError) {
      clearAdminSessionCookie(response);
    }

    if (handleMfaError(error, response)) {
      return;
    }

    next(error);
  }
}

export function cancelAdminMfaChallenge(
  _request: Request,
  response: Response,
): void {
  response.setHeader("Cache-Control", "no-store");
  clearAdminMfaChallengeCookie(response);
  response.status(200).json({
    status: "success",
    code: "ADMIN_MFA_CHALLENGE_CANCELLED",
    message: "Administrator MFA verification was cancelled.",
  });
}

export function getCurrentAdminSession(
  request: Request,
  response: Response,
): void {
  response.setHeader("Cache-Control", "no-store");
  const context = getAdminContext(request);

  response.status(200).json({
    status: "success",
    code:
      context.accessLevel === "mfa-enrollment"
        ? "ADMIN_MFA_ENROLLMENT_REQUIRED"
        : "ADMIN_SESSION_ACTIVE",
    user: serializeUser(context),
    session: serializeSession(context),
    csrfToken: context.csrfToken,
    security: serializeSecurity(context),
  });
}

export async function getAdminMfaSecurityStatus(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const status = await getAdminMfaStatus(getAdminContext(request));
    response.status(200).json({
      status: "success",
      code: "ADMIN_MFA_STATUS_READY",
      security: {
        configured: status.configured,
        mfaEnabled: status.enabled,
        mfaRequiredByPolicy: status.requiredByPolicy,
        passkeysConfigured: status.passkeysConfigured,
        passkeyCount: status.passkeyCount,
        recoveryCodesRemaining: status.recoveryCodesRemaining,
        mfaEnabledAt: status.enabledAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (handleMfaError(error, response)) {
      return;
    }
    next(error);
  }
}

export async function beginAdminMfaSetup(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const setup = await startAdminMfaSetup(
      getAdminContext(request),
      request.body,
    );
    response.status(200).json({
      status: "success",
      code: "ADMIN_MFA_SETUP_READY",
      setup: {
        setupId: setup.setupId,
        secret: setup.secret,
        otpAuthUri: setup.otpAuthUri,
        qrDataUrl: setup.qrDataUrl,
        expiresAt: setup.expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }
    if (handleMfaError(error, response)) {
      return;
    }
    next(error);
  }
}

export async function completeAdminMfaSetup(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await verifyAdminMfaSetup(
      getAdminContext(request),
      request.body,
    );
    response.status(200).json({
      status: "success",
      code: "ADMIN_MFA_ENABLED",
      message: "Administrator MFA is now enabled.",
      enabledAt: result.enabledAt.toISOString(),
      recoveryCodes: result.recoveryCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }
    if (handleMfaError(error, response)) {
      return;
    }
    next(error);
  }
}

export async function regenerateAdminMfaRecoveryCodes(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await regenerateAdminRecoveryCodes(
      getAdminContext(request),
      request.body,
    );
    response.status(200).json({
      status: "success",
      code: "ADMIN_MFA_RECOVERY_CODES_REGENERATED",
      message: "New administrator recovery codes were generated.",
      generatedAt: result.generatedAt.toISOString(),
      recoveryCodes: result.recoveryCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }
    if (handleMfaError(error, response)) {
      return;
    }
    next(error);
  }
}

export async function regenerateAdminMfaRecoveryCodesWithRecentAuthentication(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result =
      await regenerateAdminRecoveryCodesAfterRecentAuthentication(
        getAdminContext(request),
      );
    response.status(200).json({
      status: "success",
      code: "ADMIN_MFA_RECOVERY_CODES_REGENERATED",
      message: "New administrator recovery codes were generated.",
      generatedAt: result.generatedAt.toISOString(),
      recoveryCodes: result.recoveryCodes,
    });
  } catch (error) {
    if (handleMfaError(error, response)) {
      return;
    }
    next(error);
  }
}

export async function removeAdminMfa(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    await disableAdminMfa(getAdminContext(request), request.body);
    clearAdminSessionCookie(response);
    response.status(200).json({
      status: "success",
      code: "ADMIN_MFA_DISABLED",
      message:
        "Administrator MFA was disabled and all administrator sessions were closed.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }
    if (handleMfaError(error, response)) {
      return;
    }
    next(error);
  }
}

export async function reauthenticateAdminAccount(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await reauthenticateAdministrator(
      getAdminContext(request),
      request.body,
    );
    response.status(200).json({
      status: "success",
      code: "ADMIN_REAUTHENTICATION_SUCCEEDED",
      message: "Recent administrator authentication was confirmed.",
      authenticatedAt: result.authenticatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }
    if (handleMfaError(error, response)) {
      return;
    }
    next(error);
  }
}

export async function logoutAdminAccount(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    await logoutAdministrator(getAdminContext(request));
    clearAdminSessionCookie(response);
    clearAdminMfaChallengeCookie(response);

    response.status(200).json({
      status: "success",
      code: "ADMIN_LOGOUT_SUCCEEDED",
      message: "The administrator session has been closed.",
    });
  } catch (error) {
    if (error instanceof AdminPersistenceError) {
      response.status(503).json({
        status: "error",
        code: "ADMIN_TEMPORARILY_UNAVAILABLE",
        message: "Administrator sign-out is temporarily unavailable.",
      });
      return;
    }

    next(error);
  }
}

export async function getAdminPasskeys(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await getAdminPasskeyStatus(getAdminContext(request));
    response.status(200).json({
      status: "success",
      code: "ADMIN_PASSKEYS_READY",
      configured: result.configured,
      passkeys: result.passkeys.map((passkey) => ({
        ...passkey,
        createdAt: passkey.createdAt.toISOString(),
        lastUsedAt: passkey.lastUsedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    if (handleMfaError(error, response)) return;
    next(error);
  }
}

export async function beginAdminPasskeyRegistration(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await startAdminPasskeyRegistration({
      context: getAdminContext(request),
      body: request.body,
      requestMetadata: createRequestMetadata(request),
    });
    response.status(200).json({
      status: "success",
      code: "ADMIN_PASSKEY_REGISTRATION_READY",
      challengeId: result.challengeId,
      expiresAt: result.expiresAt.toISOString(),
      options: result.options,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }
    if (handleMfaError(error, response)) return;
    next(error);
  }
}

export async function completeAdminPasskeyRegistration(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await verifyAdminPasskeyRegistration({
      context: getAdminContext(request),
      body: request.body,
      requestMetadata: createRequestMetadata(request),
    });
    response.status(200).json({
      status: "success",
      code: "ADMIN_PASSKEY_REGISTERED",
      message: "The passkey is ready for administrator verification.",
      registeredAt: result.registeredAt.toISOString(),
      passkey: {
        ...result.passkey,
        createdAt: result.passkey.createdAt.toISOString(),
        lastUsedAt: result.passkey.lastUsedAt?.toISOString() ?? null,
      },
      recoveryCodes: result.recoveryCodes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }
    if (handleMfaError(error, response)) return;
    next(error);
  }
}

export async function beginAdminPasskeyLogin(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");
  const challengeToken = readAdminMfaChallengeToken(request);

  if (!challengeToken) {
    response.status(401).json({
      status: "error",
      code: "ADMIN_MFA_CHALLENGE_REQUIRED",
      message: "Sign in again to verify with a passkey.",
    });
    return;
  }

  try {
    const result = await startAdminPasskeyLogin({
      challengeToken,
      requestMetadata: createRequestMetadata(request),
    });
    response.status(200).json({
      status: "success",
      code: "ADMIN_PASSKEY_LOGIN_READY",
      challengeId: result.challengeId,
      expiresAt: result.expiresAt.toISOString(),
      options: result.options,
    });
  } catch (error) {
    if (handleMfaError(error, response)) return;
    next(error);
  }
}

export async function completeAdminPasskeyLogin(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");
  const challengeToken = readAdminMfaChallengeToken(request);

  if (!challengeToken) {
    response.status(401).json({
      status: "error",
      code: "ADMIN_MFA_CHALLENGE_REQUIRED",
      message: "Sign in again to verify with a passkey.",
    });
    return;
  }

  try {
    const verification = await verifyAdminPasskeyLogin({
      body: request.body,
      challengeToken,
      requestMetadata: createRequestMetadata(request),
    });
    const { result } = verification;

    clearAdminMfaChallengeCookie(response);
    setAdminSessionCookie(
      response,
      result.session.token,
      result.session.expiresAt,
    );
    response.status(200).json({
      status: "success",
      code: "ADMIN_LOGIN_SUCCEEDED",
      message: "Administrator passkey verified.",
      user: result.user,
      session: serializeSession(result.session),
      csrfToken: result.session.csrfToken,
      security: serializeSecurity(verification.security),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }
    if (handleMfaError(error, response)) return;
    next(error);
  }
}

export async function beginAdminPasskeyReauthentication(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await startAdminPasskeyReauthentication({
      context: getAdminContext(request),
      requestMetadata: createRequestMetadata(request),
    });
    response.status(200).json({
      status: "success",
      code: "ADMIN_PASSKEY_REAUTHENTICATION_READY",
      challengeId: result.challengeId,
      expiresAt: result.expiresAt.toISOString(),
      options: result.options,
    });
  } catch (error) {
    if (handleMfaError(error, response)) return;
    next(error);
  }
}

export async function completeAdminPasskeyReauthentication(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await verifyAdminPasskeyReauthentication({
      context: getAdminContext(request),
      body: request.body,
      requestMetadata: createRequestMetadata(request),
    });
    response.status(200).json({
      status: "success",
      code: "ADMIN_REAUTHENTICATION_SUCCEEDED",
      message: "Recent administrator authentication was confirmed with a passkey.",
      authenticatedAt: result.authenticatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }
    if (handleMfaError(error, response)) return;
    next(error);
  }
}

export async function removeAdminPasskey(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await revokeAdministratorPasskey({
      context: getAdminContext(request),
      credentialId:
        typeof request.params.credentialId === "string"
          ? request.params.credentialId
          : "",
      requestMetadata: createRequestMetadata(request),
    });
    response.status(200).json({
      status: "success",
      code: "ADMIN_PASSKEY_REVOKED",
      message: "The passkey was removed.",
      revokedAt: result.revokedAt.toISOString(),
      remainingPasskeys: result.remainingPasskeys,
      revokedOtherSessions: result.revokedOtherSessions,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendValidationError(response);
      return;
    }
    if (handleMfaError(error, response)) return;
    next(error);
  }
}
