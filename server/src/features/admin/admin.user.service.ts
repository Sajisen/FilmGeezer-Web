import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import { getMongoClient } from "../../config/database.js";
import { initializeAuthStorage } from "../auth/auth.indexes.js";
import { createAuthAuditEvent } from "../auth/repositories/authAudit.repository.js";
import { createProfileImagePath } from "../profile-image/profileImage.path.js";
import type { AdminRequestMetadata } from "./admin.auth.service.js";
import {
  AdminUserFinalAdministratorError,
  AdminUserNotFoundError,
  AdminUserPersistenceError,
  AdminUserSelfActionError,
  AdminUserSessionNotFoundError,
  AdminUserStateConflictError,
} from "./admin.user.errors.js";
import {
  countActiveEligibleAdministrators,
  countActiveManagedUserSessions,
  findActiveManagedUserSessions,
  findAdminUsers,
  findManagedUserById,
  findManagedUserIdentities,
  reactivateManagedUser,
  revokeAllManagedUserSessions,
  revokeManagedUserSession,
  suspendManagedUser,
  touchManagedUser,
} from "./admin.user.repository.js";
import type {
  AdminManagedUserDetail,
  AdminManagedUserSummary,
  AdminUserListResult,
} from "./admin.user.types.js";
import {
  adminUserIdSchema,
  adminUserListQuerySchema,
  adminUserSessionIdSchema,
  adminUserStatusReasonSchema,
} from "./admin.user.validation.js";
import { touchAdminMembershipGovernanceState } from "./admin.governance.repository.js";
import { initializeAdminStorage } from "./admin.indexes.js";
import {
  createAdminAuditEvent,
  revokeAllAdminSessionsForUser,
} from "./admin.repository.js";
import {
  hashAdminIpAddress,
  summarizeAdminUserAgent,
} from "./admin.session.js";
import type {
  AdminAuditEvent,
  AdminSessionContext,
} from "./admin.types.js";

const ADMIN_USER_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 5_000,
};

function isActiveAdministrator(
  user: Awaited<ReturnType<typeof findManagedUserById>>,
): boolean {
  return Boolean(
    user &&
      user.roles.includes("admin") &&
      user.status === "active" &&
      user.emailVerifiedAt !== null &&
      user.suspendedAt === null &&
      user.deactivatedAt === null &&
      user.deletedAt === null,
  );
}

function toSummary(input: {
  user: NonNullable<Awaited<ReturnType<typeof findManagedUserById>>>;
  administratorUserId: ObjectId;
  activeSessionCount: number;
  activeAdministratorCount: number;
}): AdminManagedUserSummary {
  const finalAdministratorProtected =
    isActiveAdministrator(input.user) &&
    input.activeAdministratorCount <= 1;

  return {
    userId: input.user._id.toHexString(),
    email: input.user.emailDisplay,
    displayName: input.user.displayName,
    profileImagePath: createProfileImagePath(input.user),
    status: input.user.status,
    roles: input.user.roles,
    emailVerified: input.user.emailVerifiedAt !== null,
    activeSessionCount: input.activeSessionCount,
    isCurrentAdministrator: input.user._id.equals(
      input.administratorUserId,
    ),
    finalAdministratorProtected,
    createdAt: input.user.createdAt,
    updatedAt: input.user.updatedAt,
    lastLoginAt: input.user.lastLoginAt,
  };
}

async function ensureStorage(): Promise<void> {
  await Promise.all([
    initializeAuthStorage(),
    initializeAdminStorage(),
  ]);
}

function createAuditMetadata(requestMetadata: AdminRequestMetadata) {
  return {
    ipHash: hashAdminIpAddress(requestMetadata.ipAddress),
    userAgentSummary: summarizeAdminUserAgent(
      requestMetadata.userAgent,
    ),
  };
}

function actionFailureReason(error: unknown): string {
  if (error instanceof AdminUserSelfActionError) {
    return "self-action-blocked";
  }

  if (error instanceof AdminUserFinalAdministratorError) {
    return "final-administrator-protected";
  }

  if (error instanceof AdminUserStateConflictError) {
    return "account-state-conflict";
  }

  if (error instanceof AdminUserSessionNotFoundError) {
    return "session-not-found";
  }

  if (error instanceof AdminUserNotFoundError) {
    return "user-not-found";
  }

  return "persistence-failure";
}

async function recordFailedAction(input: {
  eventType: AdminAuditEvent;
  administrator: AdminSessionContext;
  targetUserId: ObjectId;
  requestMetadata: AdminRequestMetadata;
  error: unknown;
}): Promise<void> {
  const metadata = createAuditMetadata(input.requestMetadata);

  try {
    await createAdminAuditEvent({
      auditEventId: new ObjectId(),
      actorUserId: input.administrator.userId,
      targetUserId: input.targetUserId,
      eventType: input.eventType,
      outcome: "failure",
      ipHash: metadata.ipHash,
      userAgentSummary: metadata.userAgentSummary,
      details: {
        reason: actionFailureReason(input.error),
      },
      createdAt: new Date(),
    });
  } catch (auditError) {
    console.error("[admin-users] Failed action audit could not be recorded.", {
      name:
        auditError instanceof Error
          ? auditError.name
          : "UnknownError",
    });
  }
}

function isKnownAdminUserError(error: unknown): boolean {
  return (
    error instanceof AdminUserNotFoundError ||
    error instanceof AdminUserSessionNotFoundError ||
    error instanceof AdminUserSelfActionError ||
    error instanceof AdminUserFinalAdministratorError ||
    error instanceof AdminUserStateConflictError
  );
}

async function getDetailForUser(
  administrator: AdminSessionContext,
  userId: ObjectId,
): Promise<AdminManagedUserDetail> {
  const checkedAt = new Date();
  const user = await findManagedUserById(userId);

  if (!user) {
    throw new AdminUserNotFoundError();
  }

  const [identities, activeSessions, activeAdministratorCount] =
    await Promise.all([
      findManagedUserIdentities(userId),
      findActiveManagedUserSessions(userId, checkedAt),
      countActiveEligibleAdministrators(),
    ]);

  const summary = toSummary({
    user,
    administratorUserId: administrator.userId,
    activeSessionCount: activeSessions.length,
    activeAdministratorCount,
  });

  let blockedReason: string | null = null;

  if (summary.isCurrentAdministrator) {
    blockedReason =
      "Your own public account is protected from User administration. Use the normal FilmGeezer account page for self-service security changes.";
  } else if (user.status === "deleted" || user.deletedAt !== null) {
    blockedReason =
      "Deleted accounts cannot be changed through the initial User administration tools.";
  } else if (user.status === "deactivated" || user.deactivatedAt !== null) {
    blockedReason =
      "Deactivated accounts cannot be reactivated through administrator suspension controls.";
  } else if (summary.finalAdministratorProtected) {
    blockedReason =
      "This is the final active administrator. Another trusted administrator must exist before this account can be suspended.";
  }

  return {
    user: {
      ...summary,
      emailVerifiedAt: user.emailVerifiedAt,
      suspendedAt: user.suspendedAt,
      deactivatedAt: user.deactivatedAt,
      deletedAt: user.deletedAt,
    },
    identities: identities.map((identity) => ({
      provider: identity.provider,
      createdAt: identity.createdAt,
    })),
    activeSessions: activeSessions.map((session) => ({
      sessionId: session._id.toHexString(),
      provider: session.authProvider,
      userAgentSummary: session.userAgentSummary,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      recentAuthenticationAt: session.recentAuthenticationAt,
      expiresAt: session.expiresAt,
    })),
    permissions: {
      canSuspend:
        !summary.isCurrentAdministrator &&
        !summary.finalAdministratorProtected &&
        (user.status === "active" || user.status === "pending") &&
        user.deactivatedAt === null &&
        user.deletedAt === null,
      canReactivate:
        !summary.isCurrentAdministrator &&
        user.status === "suspended" &&
        user.deactivatedAt === null &&
        user.deletedAt === null,
      canRevokeSessions:
        !summary.isCurrentAdministrator &&
        activeSessions.length > 0 &&
        user.deletedAt === null,
      blockedReason,
    },
  };
}

export async function listAdminUsers(
  administrator: AdminSessionContext,
  input: unknown,
): Promise<AdminUserListResult> {
  const query = adminUserListQuerySchema.parse(input);

  try {
    await ensureStorage();
    const checkedAt = new Date();
    const result = await findAdminUsers(query);
    const [sessionCounts, activeAdministratorCount] =
      await Promise.all([
        countActiveManagedUserSessions(
          result.documents.map((user) => user._id),
          checkedAt,
        ),
        countActiveEligibleAdministrators(),
      ]);

    return {
      items: result.documents.map((user) =>
        toSummary({
          user,
          administratorUserId: administrator.userId,
          activeSessionCount:
            sessionCounts.get(user._id.toHexString()) ?? 0,
          activeAdministratorCount,
        }),
      ),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: result.totalItems,
        totalPages: Math.max(
          1,
          Math.ceil(result.totalItems / query.pageSize),
        ),
      },
    };
  } catch (error) {
    throw new AdminUserPersistenceError(
      "FilmGeezer accounts could not be loaded.",
      { cause: error },
    );
  }
}

export async function getAdminUser(
  administrator: AdminSessionContext,
  userIdInput: unknown,
): Promise<AdminManagedUserDetail> {
  const userId = new ObjectId(adminUserIdSchema.parse(userIdInput));

  try {
    await ensureStorage();
    return await getDetailForUser(administrator, userId);
  } catch (error) {
    if (error instanceof AdminUserNotFoundError) {
      throw error;
    }

    throw new AdminUserPersistenceError(
      "The FilmGeezer account could not be loaded.",
      { cause: error },
    );
  }
}

export async function suspendAdminUser(
  administrator: AdminSessionContext,
  userIdInput: unknown,
  body: unknown,
  requestMetadata: AdminRequestMetadata,
): Promise<AdminManagedUserDetail> {
  const userId = new ObjectId(adminUserIdSchema.parse(userIdInput));
  const input = adminUserStatusReasonSchema.parse(body);
  const eventType = "admin-user-suspended" as const;

  if (userId.equals(administrator.userId)) {
    const error = new AdminUserSelfActionError();
    await recordFailedAction({
      eventType,
      administrator,
      targetUserId: userId,
      requestMetadata,
      error,
    });
    throw error;
  }

  let mutationCommitted = false;

  try {
    await ensureStorage();
    const client = await getMongoClient();
    const session = client.startSession();
    const metadata = createAuditMetadata(requestMetadata);

    try {
      const result = await session.withTransaction(async () => {
        const changedAt = new Date();

        await touchAdminMembershipGovernanceState(
          changedAt,
          session,
        );

        const user = await findManagedUserById(userId, session);

        if (!user) {
          throw new AdminUserNotFoundError();
        }

        if (user.status !== "active" && user.status !== "pending") {
          throw new AdminUserStateConflictError(
            "Only active or pending accounts can be suspended.",
          );
        }

        if (isActiveAdministrator(user)) {
          const activeAdministratorCount =
            await countActiveEligibleAdministrators(session);

          if (activeAdministratorCount <= 1) {
            throw new AdminUserFinalAdministratorError();
          }
        }

        const updatedUser = await suspendManagedUser(
          {
            userId,
            expectedUpdatedAt: user.updatedAt,
            suspendedAt: changedAt,
          },
          session,
        );

        if (!updatedUser) {
          throw new AdminUserStateConflictError(
            "The account changed while the suspension was being applied. Refresh and try again.",
          );
        }

        const revokedPublicSessions =
          await revokeAllManagedUserSessions(
            {
              userId,
              revokedAt: changedAt,
              reason: "account-suspended",
            },
            session,
          );

        const revokedAdminSessions =
          await revokeAllAdminSessionsForUser(
            {
              userId,
              revokedAt: changedAt,
              reason: "account-unavailable",
            },
            session,
          );

        await createAuthAuditEvent(
          {
            auditEventId: new ObjectId(),
            userId,
            eventType: "account-suspended",
            outcome: "success",
            ipHash: metadata.ipHash,
            userAgentSummary: metadata.userAgentSummary,
            details: {
              source: "administrator",
              actorUserId: administrator.userId.toHexString(),
              reason: input.reason,
            },
            createdAt: changedAt,
          },
          session,
        );

        await createAdminAuditEvent(
          {
            auditEventId: new ObjectId(),
            actorUserId: administrator.userId,
            targetUserId: userId,
            eventType,
            outcome: "success",
            ipHash: metadata.ipHash,
            userAgentSummary: metadata.userAgentSummary,
            details: {
              reason: input.reason,
              previousStatus: user.status,
              revokedPublicSessions,
              revokedAdminSessions,
            },
            createdAt: changedAt,
          },
          session,
        );

        return true;
      }, ADMIN_USER_TRANSACTION_OPTIONS);

      if (!result) {
        throw new AdminUserPersistenceError(
          "The account suspension did not complete.",
        );
      }

      mutationCommitted = true;
    } finally {
      await session.endSession();
    }

    return await getDetailForUser(administrator, userId);
  } catch (error) {
    if (mutationCommitted) {
      throw new AdminUserPersistenceError(
        "The administrator action completed, but the refreshed account details could not be loaded. Refresh the page to see the current state.",
        { cause: error },
      );
    }

    await recordFailedAction({
      eventType,
      administrator,
      targetUserId: userId,
      requestMetadata,
      error,
    });

    if (isKnownAdminUserError(error)) {
      throw error;
    }

    if (error instanceof AdminUserPersistenceError) {
      throw error;
    }

    throw new AdminUserPersistenceError(
      "The FilmGeezer account could not be suspended.",
      { cause: error },
    );
  }
}

export async function reactivateAdminUser(
  administrator: AdminSessionContext,
  userIdInput: unknown,
  body: unknown,
  requestMetadata: AdminRequestMetadata,
): Promise<AdminManagedUserDetail> {
  const userId = new ObjectId(adminUserIdSchema.parse(userIdInput));
  const input = adminUserStatusReasonSchema.parse(body);
  const eventType = "admin-user-reactivated" as const;

  if (userId.equals(administrator.userId)) {
    const error = new AdminUserSelfActionError();
    await recordFailedAction({
      eventType,
      administrator,
      targetUserId: userId,
      requestMetadata,
      error,
    });
    throw error;
  }

  let mutationCommitted = false;

  try {
    await ensureStorage();
    const client = await getMongoClient();
    const session = client.startSession();
    const metadata = createAuditMetadata(requestMetadata);

    try {
      const result = await session.withTransaction(async () => {
        const changedAt = new Date();

        await touchAdminMembershipGovernanceState(
          changedAt,
          session,
        );

        const user = await findManagedUserById(userId, session);

        if (!user) {
          throw new AdminUserNotFoundError();
        }

        if (user.status !== "suspended") {
          throw new AdminUserStateConflictError(
            "Only suspended accounts can be reactivated.",
          );
        }

        const restoredStatus =
          user.emailVerifiedAt === null ? "pending" : "active";

        const updatedUser = await reactivateManagedUser(
          {
            userId,
            expectedUpdatedAt: user.updatedAt,
            status: restoredStatus,
            reactivatedAt: changedAt,
          },
          session,
        );

        if (!updatedUser) {
          throw new AdminUserStateConflictError(
            "The account changed while reactivation was being applied. Refresh and try again.",
          );
        }

        await createAuthAuditEvent(
          {
            auditEventId: new ObjectId(),
            userId,
            eventType: "account-reactivated",
            outcome: "success",
            ipHash: metadata.ipHash,
            userAgentSummary: metadata.userAgentSummary,
            details: {
              source: "administrator",
              actorUserId: administrator.userId.toHexString(),
              reason: input.reason,
              restoredStatus,
            },
            createdAt: changedAt,
          },
          session,
        );

        await createAdminAuditEvent(
          {
            auditEventId: new ObjectId(),
            actorUserId: administrator.userId,
            targetUserId: userId,
            eventType,
            outcome: "success",
            ipHash: metadata.ipHash,
            userAgentSummary: metadata.userAgentSummary,
            details: {
              reason: input.reason,
              restoredStatus,
            },
            createdAt: changedAt,
          },
          session,
        );

        return true;
      }, ADMIN_USER_TRANSACTION_OPTIONS);

      if (!result) {
        throw new AdminUserPersistenceError(
          "The account reactivation did not complete.",
        );
      }

      mutationCommitted = true;
    } finally {
      await session.endSession();
    }

    return await getDetailForUser(administrator, userId);
  } catch (error) {
    if (mutationCommitted) {
      throw new AdminUserPersistenceError(
        "The administrator action completed, but the refreshed account details could not be loaded. Refresh the page to see the current state.",
        { cause: error },
      );
    }

    await recordFailedAction({
      eventType,
      administrator,
      targetUserId: userId,
      requestMetadata,
      error,
    });

    if (isKnownAdminUserError(error)) {
      throw error;
    }

    if (error instanceof AdminUserPersistenceError) {
      throw error;
    }

    throw new AdminUserPersistenceError(
      "The FilmGeezer account could not be reactivated.",
      { cause: error },
    );
  }
}

export async function revokeAdminUserSession(
  administrator: AdminSessionContext,
  userIdInput: unknown,
  sessionIdInput: unknown,
  requestMetadata: AdminRequestMetadata,
): Promise<AdminManagedUserDetail> {
  const userId = new ObjectId(adminUserIdSchema.parse(userIdInput));
  const sessionId = new ObjectId(
    adminUserSessionIdSchema.parse(sessionIdInput),
  );
  const eventType = "admin-user-session-revoked" as const;

  if (userId.equals(administrator.userId)) {
    const error = new AdminUserSelfActionError();
    await recordFailedAction({
      eventType,
      administrator,
      targetUserId: userId,
      requestMetadata,
      error,
    });
    throw error;
  }

  let mutationCommitted = false;

  try {
    await ensureStorage();
    const client = await getMongoClient();
    const mongoSession = client.startSession();
    const metadata = createAuditMetadata(requestMetadata);

    try {
      const result = await mongoSession.withTransaction(async () => {
        const changedAt = new Date();
        const user = await findManagedUserById(userId, mongoSession);

        if (!user) {
          throw new AdminUserNotFoundError();
        }

        const userTouched = await touchManagedUser(
          userId,
          changedAt,
          mongoSession,
        );

        if (!userTouched) {
          throw new AdminUserNotFoundError();
        }

        const revoked = await revokeManagedUserSession(
          {
            userId,
            sessionId,
            revokedAt: changedAt,
          },
          mongoSession,
        );

        if (!revoked) {
          throw new AdminUserSessionNotFoundError();
        }

        await createAuthAuditEvent(
          {
            auditEventId: new ObjectId(),
            userId,
            eventType: "session-revoked",
            outcome: "success",
            ipHash: metadata.ipHash,
            userAgentSummary: metadata.userAgentSummary,
            details: {
              source: "administrator",
              actorUserId: administrator.userId.toHexString(),
              scope: "single-session",
            },
            createdAt: changedAt,
          },
          mongoSession,
        );

        await createAdminAuditEvent(
          {
            auditEventId: new ObjectId(),
            actorUserId: administrator.userId,
            targetUserId: userId,
            eventType,
            outcome: "success",
            ipHash: metadata.ipHash,
            userAgentSummary: metadata.userAgentSummary,
            details: {
              sessionId: sessionId.toHexString(),
            },
            createdAt: changedAt,
          },
          mongoSession,
        );

        return true;
      }, ADMIN_USER_TRANSACTION_OPTIONS);

      if (!result) {
        throw new AdminUserPersistenceError(
          "The public session revocation did not complete.",
        );
      }

      mutationCommitted = true;
    } finally {
      await mongoSession.endSession();
    }

    return await getDetailForUser(administrator, userId);
  } catch (error) {
    if (mutationCommitted) {
      throw new AdminUserPersistenceError(
        "The administrator action completed, but the refreshed account details could not be loaded. Refresh the page to see the current state.",
        { cause: error },
      );
    }

    await recordFailedAction({
      eventType,
      administrator,
      targetUserId: userId,
      requestMetadata,
      error,
    });

    if (isKnownAdminUserError(error)) {
      throw error;
    }

    if (error instanceof AdminUserPersistenceError) {
      throw error;
    }

    throw new AdminUserPersistenceError(
      "The FilmGeezer session could not be revoked.",
      { cause: error },
    );
  }
}

export async function revokeAllAdminUserSessions(
  administrator: AdminSessionContext,
  userIdInput: unknown,
  requestMetadata: AdminRequestMetadata,
): Promise<{
  detail: AdminManagedUserDetail;
  revokedSessions: number;
}> {
  const userId = new ObjectId(adminUserIdSchema.parse(userIdInput));
  const eventType = "admin-user-sessions-revoked" as const;

  if (userId.equals(administrator.userId)) {
    const error = new AdminUserSelfActionError();
    await recordFailedAction({
      eventType,
      administrator,
      targetUserId: userId,
      requestMetadata,
      error,
    });
    throw error;
  }

  let mutationCommitted = false;

  try {
    await ensureStorage();
    const client = await getMongoClient();
    const mongoSession = client.startSession();
    const metadata = createAuditMetadata(requestMetadata);
    let revokedSessions = 0;

    try {
      const result = await mongoSession.withTransaction(async () => {
        const changedAt = new Date();
        const user = await findManagedUserById(userId, mongoSession);

        if (!user) {
          throw new AdminUserNotFoundError();
        }

        const userTouched = await touchManagedUser(
          userId,
          changedAt,
          mongoSession,
        );

        if (!userTouched) {
          throw new AdminUserNotFoundError();
        }

        revokedSessions = await revokeAllManagedUserSessions(
          {
            userId,
            revokedAt: changedAt,
            reason: "user-revoked",
          },
          mongoSession,
        );

        await createAuthAuditEvent(
          {
            auditEventId: new ObjectId(),
            userId,
            eventType: "session-revoked",
            outcome: "success",
            ipHash: metadata.ipHash,
            userAgentSummary: metadata.userAgentSummary,
            details: {
              source: "administrator",
              actorUserId: administrator.userId.toHexString(),
              scope: "all-sessions",
              revokedSessions,
            },
            createdAt: changedAt,
          },
          mongoSession,
        );

        await createAdminAuditEvent(
          {
            auditEventId: new ObjectId(),
            actorUserId: administrator.userId,
            targetUserId: userId,
            eventType,
            outcome: "success",
            ipHash: metadata.ipHash,
            userAgentSummary: metadata.userAgentSummary,
            details: {
              revokedSessions,
            },
            createdAt: changedAt,
          },
          mongoSession,
        );

        return true;
      }, ADMIN_USER_TRANSACTION_OPTIONS);

      if (!result) {
        throw new AdminUserPersistenceError(
          "The public-session revocation did not complete.",
        );
      }

      mutationCommitted = true;
    } finally {
      await mongoSession.endSession();
    }

    return {
      detail: await getDetailForUser(administrator, userId),
      revokedSessions,
    };
  } catch (error) {
    if (mutationCommitted) {
      throw new AdminUserPersistenceError(
        "The administrator action completed, but the refreshed account details could not be loaded. Refresh the page to see the current state.",
        { cause: error },
      );
    }

    await recordFailedAction({
      eventType,
      administrator,
      targetUserId: userId,
      requestMetadata,
      error,
    });

    if (isKnownAdminUserError(error)) {
      throw error;
    }

    if (error instanceof AdminUserPersistenceError) {
      throw error;
    }

    throw new AdminUserPersistenceError(
      "The FilmGeezer sessions could not be revoked.",
      { cause: error },
    );
  }
}
