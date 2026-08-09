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
  sendPasswordResetCompletedNoticeEmail,
} from "./auth.email.js";

import {
  AuthPasswordResetError,
  AuthPasswordReuseError,
  type AuthPasswordResetRejectionReason,
  AuthPersistenceError,
  AuthWeakPasswordError,
} from "./auth.errors.js";

import {
  initializeAuthStorage,
} from "./auth.indexes.js";

import {
  assessPasswordQuality,
} from "./auth.password-quality.js";

import {
  hashPassword,
  verifyPassword,
} from "./auth.password.js";

import {
  parsePasswordResetInput,
  type PasswordResetInput,
} from "./auth.validation.js";

import {
  createAuthAuditEvent,
} from "./repositories/authAudit.repository.js";

import {
  consumePasswordResetChallenge,
  findPasswordResetChallengeByPublicId,
  recordFailedPasswordResetAttempt,
} from "./repositories/authChallenge.repository.js";

import {
  findAuthCredentialByUserId,
  resetCredentialPassword,
} from "./repositories/authCredential.repository.js";

import {
  findAuthIdentityByUserAndProvider,
} from "./repositories/authIdentity.repository.js";

import {
  revokeAllActiveAuthSessions,
} from "./repositories/authSession.repository.js";

import {
  findPasswordResetEligibleUserById,
  recordPasswordResetMutation,
} from "./repositories/authUser.repository.js";

const PASSWORD_RESET_TRANSACTION_OPTIONS:
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

export interface PasswordResetResult {
  resetAt: Date;
  sessionsRevoked: number;
}

async function recordPasswordResetFailure(
  input: {
    userId: ObjectId;
    reason: string;
    createdAt: Date;
  },
): Promise<void> {
  try {
    await createAuthAuditEvent({
      auditEventId: new ObjectId(),
      userId: input.userId,
      eventType: "password-reset-failed",
      outcome: "failure",
      details: {
        reason: input.reason,
      },
      createdAt: input.createdAt,
    });
  } catch (error) {
    console.error(
      "[auth-password-reset] Failure audit could not be recorded.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

export async function resetLocalPassword(
  input: PasswordResetInput,
): Promise<PasswordResetResult> {
  const reset = parsePasswordResetInput(input);

  await initializeAuthStorage();

  const checkedAt = new Date();

  const challenge =
    await findPasswordResetChallengeByPublicId(
      reset.challengeId,
    );

  if (!challenge) {
    throw new AuthPasswordResetError(
      "invalid-challenge",
    );
  }

  if (challenge.consumedAt) {
    await recordPasswordResetFailure({
      userId: challenge.userId,
      reason: "already-used",
      createdAt: checkedAt,
    });

    throw new AuthPasswordResetError(
      "already-used",
    );
  }

  if (challenge.invalidatedAt) {
    const reason:
      AuthPasswordResetRejectionReason =
      challenge.attemptCount >=
      challenge.maximumAttempts
        ? "attempts-exceeded"
        : "invalid-challenge";

    await recordPasswordResetFailure({
      userId: challenge.userId,
      reason,
      createdAt: checkedAt,
    });

    throw new AuthPasswordResetError(reason);
  }

  if (
    challenge.attemptCount >=
    challenge.maximumAttempts
  ) {
    await recordPasswordResetFailure({
      userId: challenge.userId,
      reason: "attempts-exceeded",
      createdAt: checkedAt,
    });

    throw new AuthPasswordResetError(
      "attempts-exceeded",
    );
  }

  if (
    challenge.expiresAt.getTime() <=
    checkedAt.getTime()
  ) {
    await recordPasswordResetFailure({
      userId: challenge.userId,
      reason: "expired",
      createdAt: checkedAt,
    });

    throw new AuthPasswordResetError(
      "expired",
    );
  }

  const tokenIsValid =
    verifyAuthChallengeSecret({
      publicId: challenge.publicId,
      userId: challenge.userId,
      purpose: "reset-password",
      candidateSecret: reset.token,
      storedSecretHash:
        challenge.secretHash,
    });

  if (!tokenIsValid) {
    const failedAttempt =
      await recordFailedPasswordResetAttempt({
        challengeId: challenge._id,
        attemptedAt: checkedAt,
      });

    const reason:
      AuthPasswordResetRejectionReason =
      failedAttempt.locked
        ? "attempts-exceeded"
        : "incorrect-token";

    await recordPasswordResetFailure({
      userId: challenge.userId,
      reason,
      createdAt: checkedAt,
    });

    throw new AuthPasswordResetError(reason);
  }

  const user =
    await findPasswordResetEligibleUserById(
      challenge.userId,
    );

  if (!user) {
    throw new AuthPasswordResetError(
      "account-unavailable",
    );
  }

  const [identity, credential] =
    await Promise.all([
      findAuthIdentityByUserAndProvider(
        user._id,
        "local",
      ),
      findAuthCredentialByUserId(
        user._id,
      ),
    ]);

  if (!identity || !credential) {
    throw new AuthPasswordResetError(
      "account-unavailable",
    );
  }

  const passwordAssessment =
    assessPasswordQuality({
      password: reset.password,
      emailNormalized:
        user.emailNormalized,
      displayName:
        user.displayName,
    });

  if (!passwordAssessment.accepted) {
    throw new AuthWeakPasswordError(
      passwordAssessment.rejectionReason ??
        "common-or-predictable",
    );
  }

  let matchesCurrentPassword: boolean;

  try {
    matchesCurrentPassword =
      await verifyPassword(
        credential.passwordHash,
        reset.password,
      );
  } catch (error) {
    throw new AuthPersistenceError(
      "The current local credential could not be checked.",
      {
        cause: error,
      },
    );
  }

  if (matchesCurrentPassword) {
    throw new AuthPasswordReuseError();
  }

  let newPasswordHash: string;

  try {
    newPasswordHash = await hashPassword(
      reset.password,
    );
  } catch (error) {
    throw new AuthPersistenceError(
      "The new local credential could not be prepared.",
      {
        cause: error,
      },
    );
  }

  const resetAt = new Date();
  const resetAuditEventId = new ObjectId();
  const passwordAuditEventId = new ObjectId();

  const client = await getMongoClient();
  const session = client.startSession();

  let transactionResult:
    PasswordResetResult | null =
      null;

  try {
    transactionResult =
      await session.withTransaction(
        async () => {
          const challengeWasConsumed =
            await consumePasswordResetChallenge(
              {
                challengeId: challenge._id,
                userId: challenge.userId,
                consumedAt: resetAt,
              },
              session,
            );

          if (!challengeWasConsumed) {
            throw new AuthPasswordResetError(
              "invalid-challenge",
            );
          }

          const userWasUpdated =
            await recordPasswordResetMutation(
              {
                userId: user._id,
                changedAt: resetAt,
              },
              session,
            );

          if (!userWasUpdated) {
            throw new AuthPasswordResetError(
              "account-unavailable",
            );
          }

          const passwordWasReplaced =
            await resetCredentialPassword(
              {
                credentialId:
                  credential._id,
                userId: user._id,
                expectedPasswordHash:
                  credential.passwordHash,
                passwordHash:
                  newPasswordHash,
                changedAt: resetAt,
              },
              session,
            );

          if (!passwordWasReplaced) {
            throw new AuthPersistenceError(
              "The local credential changed before the reset completed.",
            );
          }

          const sessionsRevoked =
            await revokeAllActiveAuthSessions(
              {
                userId: user._id,
                revokedAt: resetAt,
                reason:
                  "password-changed",
              },
              session,
            );

          await createAuthAuditEvent(
            {
              auditEventId:
                resetAuditEventId,
              userId: user._id,
              eventType:
                "password-reset-completed",
              outcome: "success",
              details: {
                provider: "local",
                sessionsRevoked,
              },
              createdAt: resetAt,
            },
            session,
          );

          await createAuthAuditEvent(
            {
              auditEventId:
                passwordAuditEventId,
              userId: user._id,
              eventType:
                "password-changed",
              outcome: "success",
              details: {
                source: "password-reset",
              },
              createdAt: resetAt,
            },
            session,
          );

          return {
            resetAt,
            sessionsRevoked,
          } satisfies
            PasswordResetResult;
        },
        PASSWORD_RESET_TRANSACTION_OPTIONS,
      );

    if (!transactionResult) {
      throw new AuthPersistenceError(
        "Password reset completed without returning a result.",
      );
    }
  } catch (error) {
    if (
      error instanceof
        AuthPasswordResetError ||
      error instanceof
        AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The FilmGeezer password could not be reset.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }

  const completedReset =
    transactionResult;

  if (!completedReset) {
    throw new AuthPersistenceError(
      "Password reset completed without a usable result.",
    );
  }

  try {
    await sendPasswordResetCompletedNoticeEmail({
      recipientEmail:
        user.emailDisplay,
      displayName:
        user.displayName,
      resetAt,
      idempotencyKey:
        `password-reset-completed-notice/${resetAuditEventId.toHexString()}`,
      userId:
        user._id.toHexString(),
    });
  } catch (error) {
    /*
     * The credential reset has already committed. Provider availability must
     * never reverse a successful reset or reopen the consumed reset token.
     */
    console.error(
      "[auth-password-reset] Reset-completed security email could not be submitted.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }

  return completedReset;
}
