import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  generateEmailVerificationChallenge,
} from "./auth.challenge.js";

import {
  AUTH_EMAIL_VERIFICATION_POLICY,
} from "./auth.constants.js";

import {
  developmentAuthEmailService,
  type AuthEmailService,
} from "./auth.email.js";

import {
  AuthEmailConfigurationError,
  AuthEmailVerificationResendError,
  AuthPersistenceError,
} from "./auth.errors.js";

import {
  initializeAuthStorage,
} from "./auth.indexes.js";

import {
  parseEmailVerificationResendInput,
  type EmailVerificationResendInput,
} from "./auth.validation.js";

import {
  createAuthAuditEvent,
} from "./repositories/authAudit.repository.js";

import {
  createEmailVerificationChallenge,
  findEmailVerificationChallengeByPublicId,
  findLatestEmailVerificationChallengeForUser,
  invalidateActiveChallenges,
} from "./repositories/authChallenge.repository.js";

import {
  findPendingUserById,
} from "./repositories/authUser.repository.js";

const EMAIL_VERIFICATION_RESEND_TRANSACTION_OPTIONS:
  TransactionOptions = {
    readPreference:
      "primary",

    readConcern: {
      level:
        "snapshot",
    },

    writeConcern: {
      w:
        "majority",
    },

    maxCommitTimeMS:
      5_000,
  };

export interface ResentEmailVerificationResult {
  challengeId: string;
  expiresAt: Date;
  resendAvailableAt: Date;
}

export interface ResendEmailVerificationDependencies {
  emailService:
    AuthEmailService;
}

const defaultDependencies:
  ResendEmailVerificationDependencies = {
    emailService:
      developmentAuthEmailService,
  };

interface PreparedVerificationResend {
  userId: ObjectId;

  recipientEmail: string;
  displayName: string;

  challengeId: string;
  verificationCode: string;

  sendNumber: number;
  attemptedAt: Date;
  expiresAt: Date;
}

function createResendAvailableAt(
  attemptedAt: Date,
): Date {
  return new Date(
    attemptedAt.getTime() +
      AUTH_EMAIL_VERIFICATION_POLICY
        .resendCooldownMilliseconds,
  );
}

async function recordResendDeliveryOutcome(
  input: {
    userId: ObjectId;

    outcome:
      | "success"
      | "failure";

    sendNumber: number;
    createdAt: Date;
  },
): Promise<void> {
  try {
    await createAuthAuditEvent({
      auditEventId:
        new ObjectId(),

      userId:
        input.userId,

      eventType:
        "verification-sent",

      outcome:
        input.outcome,

      details: {
        purpose:
          "verify-email",

        source:
          "resend",

        sendNumber:
          input.sendNumber,
      },

      createdAt:
        input.createdAt,
    });
  } catch (error) {
    /*
     * The challenge replacement and email call have already happened.
     * A secondary audit failure must not make the caller repeat the
     * operation or expose sensitive provider/database information.
     */
    console.error(
      "[auth-verification-resend] Delivery audit could not be recorded.",

      {
        name:
          error instanceof
            Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

export async function resendEmailVerificationCode(
  input:
    EmailVerificationResendInput,

  dependencies:
    ResendEmailVerificationDependencies =
      defaultDependencies,
): Promise<ResentEmailVerificationResult> {
  const resendRequest =
    parseEmailVerificationResendInput(
      input,
    );

  await initializeAuthStorage();

  const attemptedAt =
    new Date();

  const client =
    await getMongoClient();

  const session =
    client.startSession();

  let preparedResend:
    PreparedVerificationResend;

  try {
    const transactionResult =
      await session.withTransaction(
        async () => {
          const requestedChallenge =
            await findEmailVerificationChallengeByPublicId(
              resendRequest
                .challengeId,

              session,
            );

          if (
            !requestedChallenge
          ) {
            throw new AuthEmailVerificationResendError(
              "invalid-challenge",
            );
          }

          const latestChallenge =
            await findLatestEmailVerificationChallengeForUser(
              requestedChallenge
                .userId,

              session,
            );

          /*
           * An older challenge ID cannot be used repeatedly to bypass
           * the cumulative send count or replace a newer verification
           * flow.
           */
          if (
            !latestChallenge ||
            !latestChallenge
              ._id
              .equals(
                requestedChallenge
                  ._id,
              )
          ) {
            throw new AuthEmailVerificationResendError(
              "superseded",
            );
          }

          if (
            latestChallenge
              .consumedAt
          ) {
            throw new AuthEmailVerificationResendError(
              "already-used",
            );
          }

          const user =
            await findPendingUserById(
              latestChallenge
                .userId,

              session,
            );

          if (!user) {
            throw new AuthEmailVerificationResendError(
              "account-unavailable",
            );
          }

          if (
            latestChallenge
              .lastSentAt
          ) {
            const retryAt =
              createResendAvailableAt(
                latestChallenge
                  .lastSentAt,
              );

            if (
              retryAt.getTime() >
              attemptedAt.getTime()
            ) {
              throw new AuthEmailVerificationResendError(
                "cooldown",

                retryAt,
              );
            }
          }

          /*
           * A challenge flow receives at most three sends during its
           * five-minute validity window. Once that window has expired,
           * a new verification flow may begin with a fresh send count.
           */
          const flowHasExpired =
            latestChallenge
              .expiresAt
              .getTime() <=
            attemptedAt.getTime();

          const previousSendCount =
            flowHasExpired
              ? 0
              : latestChallenge
                  .sendCount;

          if (
            previousSendCount >=
            AUTH_EMAIL_VERIFICATION_POLICY
              .maximumSendsPerChallenge
          ) {
            throw new AuthEmailVerificationResendError(
              "send-limit",
            );
          }

          const replacementChallenge =
            generateEmailVerificationChallenge(
              user._id,

              attemptedAt,
            );

          const replacementChallengeId =
            new ObjectId();

          await invalidateActiveChallenges(
            {
              userId:
                user._id,

              purpose:
                "verify-email",

              invalidatedAt:
                attemptedAt,
            },

            session,
          );

          const sendNumber =
            previousSendCount + 1;

          /*
           * The send attempt is recorded as part of the same transaction
           * that invalidates the previous challenge and inserts the
           * replacement. Concurrent resend requests therefore cannot
           * create several active challenges or bypass the send count.
           */
          await createEmailVerificationChallenge(
            {
              challengeId:
                replacementChallengeId,

              publicId:
                replacementChallenge
                  .publicId,

              userId:
                user._id,

              secretHash:
                replacementChallenge
                  .secretHash,

              createdAt:
                replacementChallenge
                  .createdAt,

              expiresAt:
                replacementChallenge
                  .expiresAt,

              sendCount:
                sendNumber,

              lastSentAt:
                attemptedAt,
            },

            session,
          );

          return {
            userId:
              user._id,

            recipientEmail:
              user.emailDisplay,

            displayName:
              user.displayName,

            challengeId:
              replacementChallenge
                .publicId,

            verificationCode:
              replacementChallenge
                .secret,

            sendNumber,

            attemptedAt,

            expiresAt:
              replacementChallenge
                .expiresAt,
          } satisfies
            PreparedVerificationResend;
        },

        EMAIL_VERIFICATION_RESEND_TRANSACTION_OPTIONS,
      );

    if (!transactionResult) {
      throw new AuthPersistenceError(
        "Verification resend completed without returning a challenge.",
      );
    }

    preparedResend =
      transactionResult;
  } catch (error) {
    if (
      error instanceof
        AuthEmailVerificationResendError ||
      error instanceof
        AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The verification code could not be replaced.",

      {
        cause:
          error,
      },
    );
  } finally {
    await session.endSession();
  }

  try {
    await dependencies
      .emailService
      .sendEmailVerification({
        recipientEmail:
          preparedResend
            .recipientEmail,

        displayName:
          preparedResend
            .displayName,

        verificationCode:
          preparedResend
            .verificationCode,

        expiresAt:
          preparedResend
            .expiresAt,
      });

    await recordResendDeliveryOutcome({
      userId:
        preparedResend.userId,

      outcome:
        "success",

      sendNumber:
        preparedResend
          .sendNumber,

      createdAt:
        new Date(),
    });
  } catch (error) {
    await recordResendDeliveryOutcome({
      userId:
        preparedResend.userId,

      outcome:
        "failure",

      sendNumber:
        preparedResend
          .sendNumber,

      createdAt:
        new Date(),
    });

    if (
      error instanceof
      AuthEmailConfigurationError
    ) {
      throw error;
    }

    /*
     * The replacement challenge remains pending if a temporary provider
     * failure occurs. This matches registration behaviour and allows a
     * controlled later resend without deleting credentials or silently
     * restoring an older challenge.
     */
    console.error(
      "[auth-verification-resend] Verification email delivery failed.",

      {
        name:
          error instanceof
            Error
            ? error.name
            : "UnknownError",
      },
    );
  }

  return {
    challengeId:
      preparedResend
        .challengeId,

    expiresAt:
      preparedResend
        .expiresAt,

    resendAvailableAt:
      createResendAvailableAt(
        preparedResend
          .attemptedAt,
      ),
  };
}