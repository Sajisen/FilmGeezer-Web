import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";
import {
  getMongoClient,
} from "../../config/database.js";
import {
  verifyAuthChallengeSecret,
} from "./auth.challenge.js";
import {
  authEmailService,
  type AuthEmailService,
} from "./auth.email.js";
import {
  AuthEmailVerificationError,
  AuthPersistenceError,
  type AuthEmailVerificationRejectionReason,
} from "./auth.errors.js";
import {
  initializeAuthStorage,
} from "./auth.indexes.js";

import type {
  AuthRequestMetadata,
} from "./auth.session.js";

import {
  createLocalAuthSessionResult,
  createPreparedLocalAuthSession,
  prepareLocalAuthSession,
  type LocalAuthSessionResult,
} from "./auth.session-creation.service.js";
import {
  createWelcomeNotification,
} from "../notifications/notification.service.js";
import {
  initializeNotificationStorage,
} from "../notifications/notification.indexes.js";
import {
  parseEmailVerificationInput,
  type EmailVerificationInput,
} from "./auth.validation.js";
import {
  createAuthAuditEvent,
} from "./repositories/authAudit.repository.js";
import {
  consumeEmailVerificationChallenge,
  findEmailVerificationChallengeByPublicId,
  recordFailedEmailVerificationAttempt,
} from "./repositories/authChallenge.repository.js";
import {
  findAuthIdentityByUserAndProvider,
} from "./repositories/authIdentity.repository.js";

import {
  activatePendingUser,
  findPendingUserById,
} from "./repositories/authUser.repository.js";

const EMAIL_VERIFICATION_TRANSACTION_OPTIONS:
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

export interface VerifiedEmailResult
  extends LocalAuthSessionResult {
  verifiedAt: Date;
}

interface VerifyEmailDependencies {
  emailService: AuthEmailService;
}

const defaultDependencies: VerifyEmailDependencies = {
  emailService: authEmailService,
};

async function recordVerificationFailure(
  input: {
    userId: ObjectId;
    reason:
      AuthEmailVerificationRejectionReason;
    attemptsRemaining?: number | null;
    createdAt: Date;
  },
): Promise<void> {
  try {
    await createAuthAuditEvent({
      auditEventId: new ObjectId(),
      userId: input.userId,

      eventType: "verification-failed",
      outcome: "failure",

      details: {
        purpose: "verify-email",
        reason: input.reason,

        attemptsRemaining:
          input.attemptsRemaining ?? null,
      },

      createdAt: input.createdAt,
    });
  } catch (error) {
    /*
     * Audit logging must never expose or store the submitted code.
     * A secondary audit failure also must not alter the verification
     * result already determined by the service.
     */
    console.error(
      "[auth-verification] Failure audit could not be recorded.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

export async function verifyEmailAddress(
  input: EmailVerificationInput,
  requestMetadata: AuthRequestMetadata,
  dependencies: VerifyEmailDependencies = defaultDependencies,
): Promise<VerifiedEmailResult> {
  const verification =
    parseEmailVerificationInput(input);

  await Promise.all([
    initializeAuthStorage(),
    initializeNotificationStorage(),
  ]);

  const checkedAt = new Date();

  const challenge =
    await findEmailVerificationChallengeByPublicId(
      verification.challengeId,
    );

  /*
   * Unknown challenge IDs are not written to the audit collection.
   * Otherwise an attacker could flood the audit database with random
   * UUIDs that do not belong to any FilmGeezer user.
   */
  if (!challenge) {
    throw new AuthEmailVerificationError(
      "invalid-challenge",
    );
  }

  if (challenge.consumedAt) {
    await recordVerificationFailure({
      userId: challenge.userId,
      reason: "already-used",
      createdAt: checkedAt,
    });

    throw new AuthEmailVerificationError(
      "already-used",
    );
  }

  if (challenge.invalidatedAt) {
    const reason:
      AuthEmailVerificationRejectionReason =
        challenge.attemptCount >=
        challenge.maximumAttempts
          ? "attempts-exceeded"
          : "invalid-challenge";

    await recordVerificationFailure({
      userId: challenge.userId,
      reason,
      attemptsRemaining: 0,
      createdAt: checkedAt,
    });

    throw new AuthEmailVerificationError(
      reason,
      0,
    );
  }

  if (
    challenge.attemptCount >=
    challenge.maximumAttempts
  ) {
    await recordVerificationFailure({
      userId: challenge.userId,
      reason: "attempts-exceeded",
      attemptsRemaining: 0,
      createdAt: checkedAt,
    });

    throw new AuthEmailVerificationError(
      "attempts-exceeded",
      0,
    );
  }

  if (
    challenge.expiresAt.getTime() <=
    checkedAt.getTime()
  ) {
    await recordVerificationFailure({
      userId: challenge.userId,
      reason: "expired",
      createdAt: checkedAt,
    });

    throw new AuthEmailVerificationError(
      "expired",
    );
  }

  const codeIsValid =
    verifyAuthChallengeSecret({
      publicId: challenge.publicId,
      userId: challenge.userId,
      purpose: challenge.purpose,

      candidateSecret:
        verification.code,

      storedSecretHash:
        challenge.secretHash,
    });

  if (!codeIsValid) {
    const failedAttempt =
      await recordFailedEmailVerificationAttempt(
        {
          challengeId: challenge._id,
          attemptedAt: checkedAt,
        },
      );

    if (!failedAttempt.recorded) {
      /*
       * The challenge changed after it was read. It may have expired,
       * been consumed, or reached its attempt limit concurrently.
       */
      throw new AuthEmailVerificationError(
        "invalid-challenge",
      );
    }

    const reason:
      AuthEmailVerificationRejectionReason =
        failedAttempt.locked
          ? "attempts-exceeded"
          : "incorrect-code";

    await recordVerificationFailure({
      userId: challenge.userId,
      reason,

      attemptsRemaining:
        failedAttempt.attemptsRemaining,

      createdAt: checkedAt,
    });

    throw new AuthEmailVerificationError(
      reason,
      failedAttempt.attemptsRemaining,
    );
  }

  const verifiedAt = new Date();

  /*
   * Session secrets and stable identifiers are prepared before the
   * transaction callback because the MongoDB driver may retry that
   * callback after a transient transaction error.
   */
  const preparedSession =
    prepareLocalAuthSession(
      requestMetadata,
      verifiedAt,
    );

  const verificationAuditEventId =
    new ObjectId();

  const registrationAuditEventId =
    new ObjectId();

  const loginAuditEventId =
    new ObjectId();

  const client =
    await getMongoClient();

  const session =
    client.startSession();

  try {
    const result =
      await session.withTransaction(
        async () => {
          const pendingUser =
            await findPendingUserById(
              challenge.userId,
              session,
            );

          if (!pendingUser) {
            throw new AuthEmailVerificationError(
              "account-unavailable",
            );
          }

          const identity =
            await findAuthIdentityByUserAndProvider(
              pendingUser._id,
              "local",
              session,
            );

          if (!identity) {
            throw new AuthPersistenceError(
              "The local authentication identity could not be found.",
            );
          }

          const challengeWasConsumed =
            await consumeEmailVerificationChallenge(
              {
                challengeId:
                  challenge._id,

                userId:
                  challenge.userId,

                verifiedAt,
              },
              session,
            );

          if (!challengeWasConsumed) {
            throw new AuthEmailVerificationError(
              "invalid-challenge",
            );
          }

          const userWasActivated =
            await activatePendingUser(
              {
                userId:
                  pendingUser._id,

                verifiedAt,
              },
              session,
            );

          if (!userWasActivated) {
            /*
             * Throwing here aborts the transaction, so the challenge is
             * not left consumed while the user remains pending.
             */
            throw new AuthEmailVerificationError(
              "account-unavailable",
            );
          }

          const sessionsRevokedForLimit =
            await createPreparedLocalAuthSession(
              pendingUser._id,
              preparedSession,
              session,
            );

          await createAuthAuditEvent(
            {
              auditEventId:
                verificationAuditEventId,

              userId:
                pendingUser._id,

              eventType:
                "verification-succeeded",

              outcome:
                "success",

              ipHash:
                preparedSession.ipHash,

              userAgentSummary:
                preparedSession
                  .userAgentSummary,

              details: {
                purpose:
                  "verify-email",

                sessionCreated:
                  true,
              },

              createdAt:
                verifiedAt,
            },
            session,
          );

          await createAuthAuditEvent(
            {
              auditEventId:
                registrationAuditEventId,

              userId:
                pendingUser._id,

              eventType:
                "registration-completed",

              outcome:
                "success",

              ipHash:
                preparedSession.ipHash,

              userAgentSummary:
                preparedSession
                  .userAgentSummary,

              details: {
                provider:
                  "local",

                finalStatus:
                  "active",

                sessionCreated:
                  true,
              },

              createdAt:
                verifiedAt,
            },
            session,
          );

          await createAuthAuditEvent(
            {
              auditEventId:
                loginAuditEventId,

              userId:
                pendingUser._id,

              eventType:
                "login-succeeded",

              outcome:
                "success",

              ipHash:
                preparedSession.ipHash,

              userAgentSummary:
                preparedSession
                  .userAgentSummary,

              details: {
                provider:
                  "local",

                source:
                  "email-verification",

                passwordHashReplaced:
                  false,

                sessionsRevokedForLimit,
              },

              createdAt:
                verifiedAt,
            },
            session,
          );

          await createWelcomeNotification(
            {
              userId: pendingUser._id,
              createdAt: verifiedAt,
            },
            session,
          );

          return {
            ...createLocalAuthSessionResult(
              pendingUser,
              preparedSession,
            ),

            verifiedAt,
          } satisfies VerifiedEmailResult;
        },
        EMAIL_VERIFICATION_TRANSACTION_OPTIONS,
      );

    if (!result) {
      throw new AuthPersistenceError(
        "Email verification completed without returning a session.",
      );
    }

    /*
     * Account activation and the authenticated session are already committed.
     * A welcome-email outage must never roll back or invalidate a successful
     * verification, so this secondary delivery is best-effort and idempotent.
     */
    try {
      await dependencies.emailService.sendWelcomeEmail({
        recipientEmail: result.user.email,
        displayName: result.user.displayName,
        idempotencyKey: `welcome/${result.user.userId}`,
        userId: result.user.userId,
      });
    } catch (emailError) {
      console.error("[auth-verification] Welcome email delivery failed.", {
        name:
          emailError instanceof Error
            ? emailError.name
            : "UnknownError",
      });
    }

    return result;
  } catch (error) {
    if (
      error instanceof
        AuthEmailVerificationError ||
      error instanceof
        AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The FilmGeezer email address could not be verified.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }
}
