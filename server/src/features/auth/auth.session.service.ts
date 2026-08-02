import {
  ObjectId,
} from "mongodb";

import {
  AUTH_SESSION_POLICY,
} from "./auth.constants.js";

import {
  AuthPersistenceError,
  AuthSessionRequiredError,
  type AuthSessionRejectionReason,
} from "./auth.errors.js";

import {
  initializeAuthStorage,
} from "./auth.indexes.js";

import {
  deriveAuthCsrfSecret,
  hashAuthSessionToken,
  verifyAuthCsrfToken,
} from "./auth.session.js";

import type {
  AuthProvider,
  AuthRole,
  AuthSessionRevocationReason,
} from "./auth.types.js";

import {
  createAuthAuditEvent,
} from "./repositories/authAudit.repository.js";

import {
  findAuthIdentityByUserAndProvider,
} from "./repositories/authIdentity.repository.js";

import {
  findAuthSessionByTokenHash,
  revokeAuthSession,
  touchAuthSession,
} from "./repositories/authSession.repository.js";

import {
  findActiveUserById,
} from "./repositories/authUser.repository.js";

import {
  createProfileImagePath,
} from "../profile-image/profileImage.path.js";

export interface AuthenticatedSessionContext {
  sessionId: ObjectId;
  userId: ObjectId;

  provider: AuthProvider;
  providerSubject: string;

  email: string;
  displayName: string;
  profileImagePath: string | null;
  roles: AuthRole[];

  csrfToken: string;
  csrfSecretHash: string;

  createdAt: Date;
  lastSeenAt: Date;
  recentAuthenticationAt: Date | null;
  idleExpiresAt: Date;
  expiresAt: Date;
}

async function recordAutomaticSessionRevocation(
  input: {
    sessionId: ObjectId;
    userId: ObjectId;
    reason:
      AuthSessionRevocationReason;
    revokedAt: Date;
  },
): Promise<void> {
  try {
    await createAuthAuditEvent({
      auditEventId:
        new ObjectId(),

      userId:
        input.userId,

      eventType:
        "session-revoked",

      outcome:
        "success",

      details: {
        reason:
          input.reason,

        sessionId:
          input.sessionId
            .toHexString(),
      },

      createdAt:
        input.revokedAt,
    });
  } catch (error) {
    console.error(
      "[auth-session] Automatic revocation audit could not be recorded.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

async function revokeKnownSession(
  input: {
    sessionId: ObjectId;
    userId: ObjectId;
    reason:
      AuthSessionRevocationReason;
    revokedAt: Date;
  },
): Promise<void> {
  const wasRevoked =
    await revokeAuthSession({
      sessionId:
        input.sessionId,
      userId:
        input.userId,
      revokedAt:
        input.revokedAt,
      reason:
        input.reason,
    });

  if (wasRevoked) {
    await recordAutomaticSessionRevocation(
      input,
    );
  }
}

function createSessionRejection(
  reason:
    AuthSessionRejectionReason,
): never {
  throw new AuthSessionRequiredError(
    reason,
  );
}

export async function resolveAuthenticatedSession(
  sessionToken: string,
): Promise<AuthenticatedSessionContext> {
  await initializeAuthStorage();

  const checkedAt =
    new Date();

  try {
    const tokenHash =
      hashAuthSessionToken(
        sessionToken,
      );

    const authSession =
      await findAuthSessionByTokenHash(
        tokenHash,
      );

    if (!authSession) {
      return createSessionRejection(
        "invalid",
      );
    }

    if (authSession.revokedAt) {
      return createSessionRejection(
        "revoked",
      );
    }

    if (
      authSession.expiresAt.getTime() <=
      checkedAt.getTime()
    ) {
      await revokeKnownSession({
        sessionId:
          authSession._id,
        userId:
          authSession.userId,
        reason:
          "absolute-expiry",
        revokedAt:
          checkedAt,
      });

      return createSessionRejection(
        "expired",
      );
    }

    const idleExpiresAt =
      new Date(
        authSession.lastSeenAt.getTime() +
          AUTH_SESSION_POLICY
            .idleTimeoutMilliseconds,
      );

    if (
      idleExpiresAt.getTime() <=
      checkedAt.getTime()
    ) {
      await revokeKnownSession({
        sessionId:
          authSession._id,
        userId:
          authSession.userId,
        reason:
          "idle-timeout",
        revokedAt:
          checkedAt,
      });

      return createSessionRejection(
        "idle-timeout",
      );
    }

    const csrfToken =
      deriveAuthCsrfSecret(
        sessionToken,
      );

    if (
      !verifyAuthCsrfToken(
        csrfToken,
        authSession.csrfSecretHash,
      )
    ) {
      await revokeKnownSession({
        sessionId:
          authSession._id,
        userId:
          authSession.userId,
        reason:
          "security-event",
        revokedAt:
          checkedAt,
      });

      return createSessionRejection(
        "invalid",
      );
    }

    const user =
      await findActiveUserById(
        authSession.userId,
      );

    if (!user) {
      await revokeKnownSession({
        sessionId:
          authSession._id,
        userId:
          authSession.userId,
        reason:
          "account-suspended",
        revokedAt:
          checkedAt,
      });

      return createSessionRejection(
        "account-unavailable",
      );
    }

    const identity =
      await findAuthIdentityByUserAndProvider(
        user._id,
        authSession.authProvider,
      );

    if (!identity) {
      await revokeKnownSession({
        sessionId:
          authSession._id,
        userId:
          authSession.userId,
        reason:
          "security-event",
        revokedAt:
          checkedAt,
      });

      return createSessionRejection(
        "invalid",
      );
    }

    const sessionWasTouched =
      await touchAuthSession({
        sessionId:
          authSession._id,
        touchedAt:
          checkedAt,
      });

    const effectiveLastSeenAt =
      sessionWasTouched
        ? checkedAt
        : authSession.lastSeenAt;

    return {
      sessionId:
        authSession._id,
      userId:
        user._id,

      provider:
        authSession.authProvider,
      providerSubject:
        identity.providerSubject,

      email:
        user.emailDisplay,
      displayName:
        user.displayName,
      profileImagePath:
        createProfileImagePath(user),
      roles:
        [...user.roles],

      csrfToken,
      csrfSecretHash:
        authSession.csrfSecretHash,

      createdAt:
        authSession.createdAt,
      lastSeenAt:
        effectiveLastSeenAt,
      recentAuthenticationAt:
        authSession.recentAuthenticationAt ?? null,
      idleExpiresAt:
        new Date(
          effectiveLastSeenAt.getTime() +
            AUTH_SESSION_POLICY
              .idleTimeoutMilliseconds,
        ),
      expiresAt:
        authSession.expiresAt,
    };
  } catch (error) {
    if (
      error instanceof
      AuthSessionRequiredError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The FilmGeezer session could not be validated.",
      {
        cause: error,
      },
    );
  }
}
