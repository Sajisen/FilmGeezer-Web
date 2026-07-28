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
  AuthEmailVerificationError,
  AuthPersistenceError,
  type AuthEmailVerificationRejectionReason,
} from "./auth.errors.js";
import {
  initializeAuthStorage,
} from "./auth.indexes.js";
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
  activatePendingUser,
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

export interface VerifiedEmailResult {
  verifiedAt: Date;
}

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
): Promise<VerifiedEmailResult> {
  const verification =
    parseEmailVerificationInput(input);

  await initializeAuthStorage();

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
   * Stable IDs are created before withTransaction because the driver
   * may retry the callback after certain transient transaction errors.
   */
  const verificationAuditEventId =
    new ObjectId();

  const registrationAuditEventId =
    new ObjectId();

  const client = await getMongoClient();
  const session = client.startSession();

  try {
    const result =
      await session.withTransaction(
        async () => {
          const challengeWasConsumed =
            await consumeEmailVerificationChallenge(
              {
                challengeId: challenge._id,
                userId: challenge.userId,
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
                userId: challenge.userId,
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

          await createAuthAuditEvent(
            {
              auditEventId:
                verificationAuditEventId,

              userId: challenge.userId,

              eventType:
                "verification-succeeded",

              outcome: "success",

              details: {
                purpose: "verify-email",
              },

              createdAt: verifiedAt,
            },
            session,
          );

          await createAuthAuditEvent(
            {
              auditEventId:
                registrationAuditEventId,

              userId: challenge.userId,

              eventType:
                "registration-completed",

              outcome: "success",

              details: {
                provider: "local",
                finalStatus: "active",
              },

              createdAt: verifiedAt,
            },
            session,
          );

          return {
            verifiedAt,
          } satisfies VerifiedEmailResult;
        },
        EMAIL_VERIFICATION_TRANSACTION_OPTIONS,
      );

    if (!result) {
      throw new AuthPersistenceError(
        "Email verification completed without returning a result.",
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof
        AuthEmailVerificationError ||
      error instanceof AuthPersistenceError
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