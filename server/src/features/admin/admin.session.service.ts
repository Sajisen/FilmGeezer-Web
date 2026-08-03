import { ObjectId } from "mongodb";

import { findActiveUserById } from "../auth/repositories/authUser.repository.js";
import { createProfileImagePath } from "../profile-image/profileImage.path.js";
import { ADMIN_SESSION_POLICY } from "./admin.constants.js";
import {
  AdminAuthenticationRequiredError,
  AdminPersistenceError,
} from "./admin.errors.js";
import { initializeAdminStorage } from "./admin.indexes.js";
import {
  createAdminAuditEvent,
  findAdminSessionByTokenHash,
  revokeAdminSession,
  touchAdminSession,
} from "./admin.repository.js";
import {
  deriveAdminCsrfToken,
  hashAdminSessionToken,
  verifyAdminCsrfToken,
} from "./admin.session.js";
import type {
  AdminSessionContext,
  AdminSessionRevocationReason,
} from "./admin.types.js";

async function revokeKnownSession(input: {
  sessionId: ObjectId;
  userId: ObjectId;
  reason: AdminSessionRevocationReason;
  revokedAt: Date;
}): Promise<void> {
  const revoked = await revokeAdminSession(input);

  if (!revoked) {
    return;
  }

  try {
    await createAdminAuditEvent({
      auditEventId: new ObjectId(),
      actorUserId: input.userId,
      targetUserId: input.userId,
      eventType: "admin-session-revoked",
      outcome: "success",
      details: {
        reason: input.reason,
        sessionId: input.sessionId.toHexString(),
      },
      createdAt: input.revokedAt,
    });
  } catch (error) {
    console.error("[admin-session] Revocation audit could not be recorded.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export async function resolveAdminSession(
  sessionToken: string,
): Promise<AdminSessionContext> {
  await initializeAdminStorage();
  const checkedAt = new Date();

  try {
    const session = await findAdminSessionByTokenHash(
      hashAdminSessionToken(sessionToken),
    );

    if (!session || session.revokedAt) {
      throw new AdminAuthenticationRequiredError();
    }

    if (session.expiresAt.getTime() <= checkedAt.getTime()) {
      await revokeKnownSession({
        sessionId: session._id,
        userId: session.userId,
        reason: "absolute-expiry",
        revokedAt: checkedAt,
      });
      throw new AdminAuthenticationRequiredError();
    }

    const idleExpiresAt = new Date(
      session.lastSeenAt.getTime() +
        ADMIN_SESSION_POLICY.idleTimeoutMilliseconds,
    );

    if (idleExpiresAt.getTime() <= checkedAt.getTime()) {
      await revokeKnownSession({
        sessionId: session._id,
        userId: session.userId,
        reason: "idle-timeout",
        revokedAt: checkedAt,
      });
      throw new AdminAuthenticationRequiredError();
    }

    const user = await findActiveUserById(session.userId);

    if (!user) {
      await revokeKnownSession({
        sessionId: session._id,
        userId: session.userId,
        reason: "account-unavailable",
        revokedAt: checkedAt,
      });
      throw new AdminAuthenticationRequiredError();
    }

    if (!user.roles.includes("admin")) {
      await revokeKnownSession({
        sessionId: session._id,
        userId: session.userId,
        reason: "role-removed",
        revokedAt: checkedAt,
      });
      throw new AdminAuthenticationRequiredError();
    }

    const csrfToken = deriveAdminCsrfToken(sessionToken);

    if (!verifyAdminCsrfToken(csrfToken, session.csrfSecretHash)) {
      await revokeKnownSession({
        sessionId: session._id,
        userId: session.userId,
        reason: "security-event",
        revokedAt: checkedAt,
      });
      throw new AdminAuthenticationRequiredError();
    }

    const wasTouched = await touchAdminSession(session._id, checkedAt);
    const effectiveLastSeenAt = wasTouched ? checkedAt : session.lastSeenAt;

    return {
      sessionId: session._id,
      userId: user._id,
      email: user.emailDisplay,
      displayName: user.displayName,
      profileImagePath: createProfileImagePath(user),
      roles: [...user.roles],
      csrfToken,
      csrfSecretHash: session.csrfSecretHash,
      createdAt: session.createdAt,
      lastSeenAt: effectiveLastSeenAt,
      idleExpiresAt: new Date(
        effectiveLastSeenAt.getTime() +
          ADMIN_SESSION_POLICY.idleTimeoutMilliseconds,
      ),
      expiresAt: session.expiresAt,
    };
  } catch (error) {
    if (error instanceof AdminAuthenticationRequiredError) {
      throw error;
    }

    throw new AdminPersistenceError(
      "The administrator session could not be validated.",
      { cause: error },
    );
  }
}

export async function logoutAdministrator(
  context: AdminSessionContext,
): Promise<void> {
  const loggedOutAt = new Date();

  try {
    await revokeAdminSession({
      sessionId: context.sessionId,
      userId: context.userId,
      revokedAt: loggedOutAt,
      reason: "logout",
    });

    await createAdminAuditEvent({
      auditEventId: new ObjectId(),
      actorUserId: context.userId,
      targetUserId: context.userId,
      eventType: "admin-logout",
      outcome: "success",
      details: {
        sessionId: context.sessionId.toHexString(),
      },
      createdAt: loggedOutAt,
    });
  } catch (error) {
    throw new AdminPersistenceError(
      "The administrator session could not be closed.",
      { cause: error },
    );
  }
}