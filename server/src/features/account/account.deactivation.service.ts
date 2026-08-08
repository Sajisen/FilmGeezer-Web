import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  AuthAccountDeactivationError,
  AuthPersistenceError,
} from "../auth/auth.errors.js";

import {
  countActiveEligibleAdministrators,
} from "../admin/admin.user.repository.js";

import {
  touchAdminMembershipGovernanceState,
} from "../admin/admin.governance.repository.js";

import {
  developmentAuthEmailService,
  type AuthEmailService,
} from "../auth/auth.email.js";

import {
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  type AuthRequestMetadata,
} from "../auth/auth.session.js";

import {
  parseAccountDeactivationInput,
  type AccountDeactivationInput,
} from "../auth/auth.validation.js";

import {
  createAuthAuditEvent,
} from "../auth/repositories/authAudit.repository.js";

import {
  invalidateAllActiveChallengesForUser,
} from "../auth/repositories/authChallenge.repository.js";

import {
  revokeAllActiveAuthSessions,
} from "../auth/repositories/authSession.repository.js";

import {
  deactivateActiveUser,
} from "../auth/repositories/authUser.repository.js";

import type {
  AuthenticatedSessionContext,
} from "../auth/auth.session.service.js";

import {
  getProfileImageStorage,
} from "../profile-image/profileImage.storage.js";

const ACCOUNT_DEACTIVATION_TRANSACTION_OPTIONS:
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


interface AccountDeactivationDependencies {
  emailService: AuthEmailService;
}

const defaultDependencies: AccountDeactivationDependencies = {
  emailService: developmentAuthEmailService,
};

export interface AccountDeactivationResult {
  deactivatedAt: Date;
  sessionsRevoked: number;
  challengesInvalidated: number;
}

export async function deactivateAccount(
  input: AccountDeactivationInput,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
  dependencies: AccountDeactivationDependencies =
    defaultDependencies,
): Promise<AccountDeactivationResult> {
  parseAccountDeactivationInput(input);

  const deactivatedAt = new Date();
  const auditEventId = new ObjectId();

  const client =
    await getMongoClient();

  const session =
    client.startSession();

  try {
    const result =
      await session.withTransaction(
        async () => {
          if (auth.roles.includes("admin")) {
            await touchAdminMembershipGovernanceState(
              deactivatedAt,
              session,
            );

            const activeAdministratorCount =
              await countActiveEligibleAdministrators(session);

            if (activeAdministratorCount <= 1) {
              throw new AuthAccountDeactivationError(
                "final-administrator-protected",
              );
            }
          }

          const user =
            await deactivateActiveUser(
              {
                userId: auth.userId,
                deactivatedAt,
              },
              session,
            );

          if (!user) {
            throw new AuthAccountDeactivationError(
              "account-unavailable",
            );
          }

          const challengesInvalidated =
            await invalidateAllActiveChallengesForUser(
              {
                userId: auth.userId,
                invalidatedAt:
                  deactivatedAt,
              },
              session,
            );

          const sessionsRevoked =
            await revokeAllActiveAuthSessions(
              {
                userId: auth.userId,
                revokedAt:
                  deactivatedAt,
                reason:
                  "account-deactivated",
              },
              session,
            );

          await createAuthAuditEvent(
            {
              auditEventId,
              userId: auth.userId,
              eventType:
                "account-deactivated",
              outcome: "success",
              ipHash:
                hashAuthIpAddress(
                  requestMetadata.ipAddress,
                ),
              userAgentSummary:
                summarizeAuthUserAgent(
                  requestMetadata.userAgent,
                ),
              details: {
                source: "self-service",
                sessionsRevoked,
                challengesInvalidated,
                reactivation:
                  "support-required",
              },
              createdAt:
                deactivatedAt,
            },
            session,
          );

          return {
            deactivatedAt,
            sessionsRevoked,
            challengesInvalidated,
            recipientEmail:
              user.emailDisplay,
            displayName:
              user.displayName,
            profileImageObjectKey:
              user.profileImage?.objectKey ?? null,
          };
        },
        ACCOUNT_DEACTIVATION_TRANSACTION_OPTIONS,
      );

    if (!result) {
      throw new AuthPersistenceError(
        "Account deactivation completed without returning a result.",
      );
    }

    if (result.profileImageObjectKey) {
      try {
        await getProfileImageStorage().remove(
          result.profileImageObjectKey,
        );
      } catch (storageError) {
        console.error(
          "[account-deactivation] Profile-picture storage cleanup failed.",
          {
            name:
              storageError instanceof Error
                ? storageError.name
                : "UnknownError",
          },
        );
      }
    }

    try {
      await dependencies.emailService
        .sendAccountDeactivatedNotice({
          recipientEmail:
            result.recipientEmail,
          displayName:
            result.displayName,
          deactivatedAt:
            result.deactivatedAt,
          idempotencyKey:
            `account-deactivated/${auth.userId.toHexString()}/${result.deactivatedAt.getTime()}`,
          userId:
            auth.userId.toHexString(),
        });

      await createAuthAuditEvent({
        auditEventId: new ObjectId(),
        userId: auth.userId,
        eventType:
          "account-deactivation-notice-sent",
        outcome: "success",
        ipHash:
          hashAuthIpAddress(
            requestMetadata.ipAddress,
          ),
        userAgentSummary:
          summarizeAuthUserAgent(
            requestMetadata.userAgent,
          ),
        details: {
          channel: "email",
        },
        createdAt:
          result.deactivatedAt,
      });
    } catch (notificationError) {
      console.error(
        "[account-deactivation] Deactivation notice could not be sent.",
        {
          name:
            notificationError instanceof Error
              ? notificationError.name
              : "UnknownError",
        },
      );

      try {
        await createAuthAuditEvent({
          auditEventId: new ObjectId(),
          userId: auth.userId,
          eventType:
            "account-deactivation-notice-sent",
          outcome: "failure",
          ipHash:
            hashAuthIpAddress(
              requestMetadata.ipAddress,
            ),
          userAgentSummary:
            summarizeAuthUserAgent(
              requestMetadata.userAgent,
            ),
          details: {
            channel: "email",
          },
          createdAt: new Date(),
        });
      } catch {
        // The account is already safely deactivated.
      }
    }

    return {
      deactivatedAt:
        result.deactivatedAt,
      sessionsRevoked:
        result.sessionsRevoked,
      challengesInvalidated:
        result.challengesInvalidated,
    };
  } catch (error) {
    if (
      error instanceof
        AuthAccountDeactivationError ||
      error instanceof
        AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The FilmGeezer account could not be deactivated.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }
}