import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  AuthPersistenceError,
} from "./auth.errors.js";

import {
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  type AuthRequestMetadata,
} from "./auth.session.js";

import type {
  AuthenticatedSessionContext,
} from "./auth.session.service.js";

import {
  createAuthAuditEvent,
} from "./repositories/authAudit.repository.js";

import {
  revokeAllActiveAuthSessions,
  revokeAuthSession,
} from "./repositories/authSession.repository.js";

import {
  recordSessionMutation,
} from "./repositories/authUser.repository.js";

const LOGOUT_TRANSACTION_OPTIONS:
  TransactionOptions = {
    readPreference: "primary",

    readConcern: {
      level: "snapshot",
    },

    writeConcern: {
      w: "majority",
    },

    maxCommitTimeMS: 5_000,
  };

export interface LogoutResult {
  sessionsRevoked: number;
}

async function performLogout(
  input: {
    auth:
      AuthenticatedSessionContext;
    metadata:
      AuthRequestMetadata;
    mode:
      | "current"
      | "all";
  },
): Promise<LogoutResult> {
  const loggedOutAt =
    new Date();

  const ipHash =
    hashAuthIpAddress(
      input.metadata.ipAddress,
    );

  const userAgentSummary =
    summarizeAuthUserAgent(
      input.metadata.userAgent,
    );

  const auditEventId =
    new ObjectId();

  const client =
    await getMongoClient();

  const mongoSession =
    client.startSession();

  try {
    const result =
      await mongoSession.withTransaction(
        async () => {
          /*
           * This user write serializes logout-all with concurrent login
           * transactions for the same account.
           */
          await recordSessionMutation(
            {
              userId:
                input.auth.userId,
              changedAt:
                loggedOutAt,
            },
            mongoSession,
          );

          const sessionsRevoked =
            input.mode === "all"
              ? await revokeAllActiveAuthSessions(
                  {
                    userId:
                      input.auth.userId,
                    revokedAt:
                      loggedOutAt,
                    reason:
                      "logout-all",
                  },
                  mongoSession,
                )
              : (
                    await revokeAuthSession(
                      {
                        sessionId:
                          input.auth
                            .sessionId,
                        userId:
                          input.auth.userId,
                        revokedAt:
                          loggedOutAt,
                        reason:
                          "logout",
                      },
                      mongoSession,
                    )
                  )
                ? 1
                : 0;

          await createAuthAuditEvent(
            {
              auditEventId,

              userId:
                input.auth.userId,

              eventType:
                input.mode === "all"
                  ? "logout-all"
                  : "logout",

              outcome:
                "success",

              ipHash,
              userAgentSummary,

              details: {
                sessionsRevoked,
              },

              createdAt:
                loggedOutAt,
            },
            mongoSession,
          );

          return {
            sessionsRevoked,
          } satisfies LogoutResult;
        },
        LOGOUT_TRANSACTION_OPTIONS,
      );

    if (!result) {
      throw new AuthPersistenceError(
        "Logout completed without returning a result.",
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof
      AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The FilmGeezer session could not be revoked.",
      {
        cause: error,
      },
    );
  } finally {
    await mongoSession.endSession();
  }
}

export async function logoutCurrentSession(
  auth:
    AuthenticatedSessionContext,
  metadata:
    AuthRequestMetadata,
): Promise<LogoutResult> {
  return performLogout({
    auth,
    metadata,
    mode: "current",
  });
}

export async function logoutAllSessions(
  auth:
    AuthenticatedSessionContext,
  metadata:
    AuthRequestMetadata,
): Promise<LogoutResult> {
  return performLogout({
    auth,
    metadata,
    mode: "all",
  });
}