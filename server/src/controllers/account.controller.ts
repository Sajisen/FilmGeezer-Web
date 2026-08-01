import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  z,
} from "zod";

import {
  changeAccountPassword,
  confirmAccountPassword,
  getAccountDetails,
  updateAccountProfile,
} from "../features/account/account.service.js";

import {
  getAccountSessions,
  revokeAccountSession,
} from "../features/account/account.sessions.service.js";

import {
  AuthCurrentPasswordInvalidError,
  AuthPasswordReuseError,
  AuthPersistenceError,
  AuthSessionManagementError,
  AuthWeakPasswordError,
} from "../features/auth/auth.errors.js";

import {
  setAuthSessionCookie,
} from "../features/auth/auth.session.js";

import {
  getAuthenticatedSessionContext,
} from "../middleware/auth.middleware.js";

function createRequestMetadata(
  request: Request,
) {
  return {
    ipAddress:
      request.ip ||
      request.socket.remoteAddress ||
      null,

    userAgent:
      request.get("user-agent") ??
      null,
  };
}

function createValidationDetails(
  error: z.ZodError,
  fieldNames: readonly string[],
) {
  const fields:
    Record<string, string[]> = {};

  for (const fieldName of fieldNames) {
    fields[fieldName] = [];
  }

  const form: string[] = [];

  for (const issue of error.issues) {
    const [fieldName] = issue.path;

    if (
      typeof fieldName === "string" &&
      Object.prototype.hasOwnProperty.call(
        fields,
        fieldName,
      )
    ) {
      fields[fieldName].push(
        issue.message,
      );

      continue;
    }

    form.push(issue.message);
  }

  return {
    form,
    fields,
  };
}

export async function getCurrentAccountDetails(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  try {
    const auth =
      getAuthenticatedSessionContext(
        request,
      );

    const result =
      await getAccountDetails(auth);

    response.status(200).json({
      status: "success",
      code: "ACCOUNT_DETAILS_READY",

      account: {
        userId:
          result.account.userId,
        provider:
          result.account.provider,
        email:
          result.account.email,
        displayName:
          result.account.displayName,
        roles:
          result.account.roles,
        emailVerifiedAt:
          result.account.emailVerifiedAt
            .toISOString(),
        memberSince:
          result.account.memberSince
            .toISOString(),
        lastLoginAt:
          result.account.lastLoginAt
            ?.toISOString() ??
          null,
      },

      security: {
        passwordChangedAt:
          result.security.passwordChangedAt
            .toISOString(),

        recentAuthenticationExpiresAt:
          result.security
            .recentAuthenticationExpiresAt
            ?.toISOString() ??
          null,
      },

      session: {
        createdAt:
          result.session.createdAt
            .toISOString(),
        lastSeenAt:
          result.session.lastSeenAt
            .toISOString(),
        idleExpiresAt:
          result.session.idleExpiresAt
            .toISOString(),
        expiresAt:
          result.session.expiresAt
            .toISOString(),
      },
    });
  } catch (error) {
    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[account] Account details could not be loaded.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "ACCOUNT_TEMPORARILY_UNAVAILABLE",
        message:
          "Your account details are temporarily unavailable. Please try again shortly.",
      });

      return;
    }

    next(error);
  }
}

export async function confirmCurrentAccountPassword(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  try {
    const auth =
      getAuthenticatedSessionContext(
        request,
      );

    const result =
      await confirmAccountPassword(
        request.body,
        auth,
        createRequestMetadata(
          request,
        ),
      );

    response.status(200).json({
      status: "success",
      code:
        "AUTH_RECENT_AUTHENTICATION_CONFIRMED",
      message:
        "Password confirmed. You can continue with this security change.",
      confirmedAt:
        result.confirmedAt
          .toISOString(),
      expiresAt:
        result.expiresAt
          .toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "AUTH_INVALID_RECENT_AUTHENTICATION_INPUT",
        message:
          "Check the password and try again.",
        errors:
          createValidationDetails(
            error,
            ["password"],
          ),
      });

      return;
    }

    if (
      error instanceof
      AuthCurrentPasswordInvalidError
    ) {
      response.status(401).json({
        status: "error",
        code: error.code,
        message:
          "The current password is incorrect.",
      });

      return;
    }

    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[account-reauthentication] Password confirmation failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "AUTH_TEMPORARILY_UNAVAILABLE",
        message:
          "Password confirmation is temporarily unavailable. Please try again shortly.",
      });

      return;
    }

    next(error);
  }
}

export async function updateCurrentAccountProfile(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  try {
    const auth =
      getAuthenticatedSessionContext(
        request,
      );

    const result =
      await updateAccountProfile(
        request.body,
        auth,
        createRequestMetadata(
          request,
        ),
      );

    response.status(200).json({
      status: "success",
      code:
        "ACCOUNT_PROFILE_UPDATED",
      message:
        result.changed
          ? "Your FilmGeezer profile has been updated."
          : "Your FilmGeezer profile is already up to date.",
      changed:
        result.changed,
      user:
        result.user,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "ACCOUNT_INVALID_PROFILE_INPUT",
        message:
          "Check the profile details and try again.",
        errors:
          createValidationDetails(
            error,
            ["displayName"],
          ),
      });

      return;
    }

    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[account-profile] Profile update failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "ACCOUNT_TEMPORARILY_UNAVAILABLE",
        message:
          "Your profile cannot be updated right now. Please try again shortly.",
      });

      return;
    }

    next(error);
  }
}

export async function changeCurrentAccountPassword(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  try {
    const auth =
      getAuthenticatedSessionContext(
        request,
      );

    const result =
      await changeAccountPassword(
        request.body,
        auth,
        createRequestMetadata(
          request,
        ),
      );

    setAuthSessionCookie(
      response,
      result.session.token,
      result.session.expiresAt,
    );

    response.status(200).json({
      status: "success",
      code:
        "ACCOUNT_PASSWORD_CHANGED",
      message:
        "Your password has been changed and your other sessions were signed out.",
      changedAt:
        result.changedAt
          .toISOString(),
      sessionsRevoked:
        result.sessionsRevoked,
      user:
        result.user,
      session: {
        expiresAt:
          result.session.expiresAt
            .toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "ACCOUNT_INVALID_PASSWORD_CHANGE_INPUT",
        message:
          "Check the new password and try again.",
        errors:
          createValidationDetails(
            error,
            ["newPassword"],
          ),
      });

      return;
    }

    if (
      error instanceof
      AuthWeakPasswordError
    ) {
      response.status(422).json({
        status: "error",
        code: error.code,
        message: error.message,
        password: {
          reason: error.reason,
        },
      });

      return;
    }

    if (
      error instanceof
      AuthPasswordReuseError
    ) {
      response.status(409).json({
        status: "error",
        code: error.code,
        message: error.message,
      });

      return;
    }

    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[account-password] Password change failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "ACCOUNT_TEMPORARILY_UNAVAILABLE",
        message:
          "Your password cannot be changed right now. Please try again shortly.",
      });

      return;
    }

    next(error);
  }
}

export async function getCurrentAccountSessions(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  try {
    const auth =
      getAuthenticatedSessionContext(
        request,
      );

    const result =
      await getAccountSessions(auth);

    response.status(200).json({
      status: "success",
      code:
        "ACCOUNT_SESSIONS_READY",

      maximumActiveSessions:
        result.maximumActiveSessions,

      sessions:
        result.sessions.map(
          (session) => ({
            sessionReference:
              session.sessionReference,

            current:
              session.current,

            device:
              session.device,

            createdAt:
              session.createdAt
                .toISOString(),

            lastSeenAt:
              session.lastSeenAt
                .toISOString(),

            idleExpiresAt:
              session.idleExpiresAt
                .toISOString(),

            expiresAt:
              session.expiresAt
                .toISOString(),
          }),
        ),
    });
  } catch (error) {
    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[account-sessions] Session list could not be loaded.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "ACCOUNT_TEMPORARILY_UNAVAILABLE",
        message:
          "Your active sessions are temporarily unavailable. Please try again shortly.",
      });

      return;
    }

    next(error);
  }
}

export async function revokeCurrentAccountSession(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader(
    "Cache-Control",
    "no-store",
  );

  try {
    const auth =
      getAuthenticatedSessionContext(
        request,
      );

    const result =
      await revokeAccountSession(
        request.params.sessionReference,
        auth,
        createRequestMetadata(
          request,
        ),
      );

    response.status(200).json({
      status: "success",
      code:
        "ACCOUNT_SESSION_REVOKED",
      message:
        "The selected device has been signed out.",
      sessionReference:
        result.sessionReference,
      revokedAt:
        result.revokedAt
          .toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code:
          "ACCOUNT_INVALID_SESSION_REFERENCE",
        message:
          "The selected session is invalid.",
      });

      return;
    }

    if (
      error instanceof
      AuthSessionManagementError
    ) {
      if (
        error.reason ===
        "current-session"
      ) {
        response.status(409).json({
          status: "error",
          code:
            "ACCOUNT_CURRENT_SESSION_REVOKE_REJECTED",
          message:
            "Use Sign out to end the current device session.",
        });

        return;
      }

      response.status(404).json({
        status: "error",
        code:
          "ACCOUNT_SESSION_NOT_FOUND",
        message:
          "This session is no longer active.",
      });

      return;
    }

    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[account-sessions] Session revocation failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      response.status(503).json({
        status: "error",
        code:
          "ACCOUNT_TEMPORARILY_UNAVAILABLE",
        message:
          "The selected device cannot be signed out right now. Please try again shortly.",
      });

      return;
    }

    next(error);
  }
}

