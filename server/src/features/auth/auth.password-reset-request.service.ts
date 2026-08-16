import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  resolveClientOrigin,
} from "../../config/cors.js";

import {
  generatePasswordResetChallenge,
} from "./auth.challenge.js";

import {
  AUTH_PASSWORD_RESET_POLICY,
} from "./auth.constants.js";

import {
  developmentAuthEmailService,
  type AuthEmailService,
} from "./auth.email.js";

import {
  AuthPersistenceError,
} from "./auth.errors.js";

import {
  initializeAuthStorage,
} from "./auth.indexes.js";

import {
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  type AuthRequestMetadata,
} from "./auth.session.js";

import {
  parsePasswordResetRequestInput,
  type PasswordResetRequestInput,
} from "./auth.validation.js";

import {
  createAuthAuditEvent,
} from "./repositories/authAudit.repository.js";

import {
  createPasswordResetChallenge,
  findLatestPasswordResetChallengeForUser,
  invalidateActiveChallenges,
} from "./repositories/authChallenge.repository.js";

import {
  findAuthCredentialByUserId,
} from "./repositories/authCredential.repository.js";

import {
  findAuthIdentityByUserAndProvider,
} from "./repositories/authIdentity.repository.js";

import {
  findUserByNormalizedEmail,
} from "./repositories/authUser.repository.js";

const PASSWORD_RESET_REQUEST_TRANSACTION_OPTIONS:
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

export interface PasswordResetRequestResult {
  acceptedAt: Date;
}

export interface PasswordResetRequestDependencies {
  emailService: AuthEmailService;
}

const defaultDependencies:
  PasswordResetRequestDependencies = {
    emailService: developmentAuthEmailService,
  };

interface PreparedPasswordResetEmail {
  userId: ObjectId;
  recipientEmail: string;
  displayName: string;
  resetUrl: string;
  challengeId: string;
  expiresAt: Date;
  sendNumber: number;
  requestedAt: Date;
}

function createPasswordResetUrl(
  clientOrigin: string,
  publicId: string,
  secret: string,
): string {
  const resetUrl = new URL(
    `/reset-password/${encodeURIComponent(publicId)}`,
    `${clientOrigin}/`,
  );

  /*
   * The raw reset token is placed in the fragment, not the query string.
   * Browser fragments are not sent to the HTTP server or in Referer
   * headers. React captures it once and immediately removes it from the
   * visible address bar.
   */
  resetUrl.hash = secret;

  return resetUrl.toString();
}

async function waitForMinimumResponseTime(
  startedAtMilliseconds: number,
): Promise<void> {
  const elapsedMilliseconds =
    Date.now() - startedAtMilliseconds;

  const remainingMilliseconds = Math.max(
    0,
    AUTH_PASSWORD_RESET_POLICY
      .minimumRequestDurationMilliseconds -
      elapsedMilliseconds,
  );

  if (remainingMilliseconds === 0) {
    return;
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, remainingMilliseconds);
  });
}

async function recordPasswordResetRequestOutcome(
  input: {
    userId: ObjectId;
    outcome: "success" | "failure";
    sendNumber: number;
    ipHash: string | null;
    userAgentSummary: string | null;
    createdAt: Date;
  },
): Promise<void> {
  try {
    await createAuthAuditEvent({
      auditEventId: new ObjectId(),
      userId: input.userId,
      eventType: "password-reset-requested",
      outcome: input.outcome,
      ipHash: input.ipHash,
      userAgentSummary: input.userAgentSummary,
      details: {
        sendNumber: input.sendNumber,
        delivery:
          input.outcome === "success"
            ? "submitted"
            : "failed",
      },
      createdAt: input.createdAt,
    });
  } catch (error) {
    console.error(
      "[auth-password-reset-request] Audit event could not be recorded.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

function isPasswordResetEligibleUser(
  user: Awaited<
    ReturnType<typeof findUserByNormalizedEmail>
  >,
): user is NonNullable<
  Awaited<ReturnType<typeof findUserByNormalizedEmail>>
> {
  return Boolean(
    user &&
      (user.status === "active" ||
        user.status === "pending") &&
      user.suspendedAt === null &&
      user.deletedAt === null,
  );
}

export async function requestPasswordReset(
  input: PasswordResetRequestInput,
  requestMetadata: AuthRequestMetadata,
  requestOrigin: string | undefined,
  dependencies:
    PasswordResetRequestDependencies =
      defaultDependencies,
): Promise<PasswordResetRequestResult> {
  const requestStartedAtMilliseconds = Date.now();
  const requestedAt = new Date();

  try {
    const resetRequest =
      parsePasswordResetRequestInput(input);

    await initializeAuthStorage();

    const user =
      await findUserByNormalizedEmail(
        resetRequest.emailNormalized,
      );

    if (!isPasswordResetEligibleUser(user)) {
      return {
        acceptedAt: requestedAt,
      };
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

    const hasCompleteLocalCredential = Boolean(identity && credential);
    const hasNoLocalCredential = !identity && !credential;

    if (
      (!hasCompleteLocalCredential && !hasNoLocalCredential) ||
      (user.status === "pending" && !hasCompleteLocalCredential)
    ) {
      return {
        acceptedAt: requestedAt,
      };
    }

    const client = await getMongoClient();
    const session = client.startSession();

    let preparedEmail:
      PreparedPasswordResetEmail | null = null;

    try {
      const transactionResult =
        await session.withTransaction(
          async () => {
            const latestChallenge =
              await findLatestPasswordResetChallengeForUser(
                user._id,
                session,
              );

            if (latestChallenge?.lastSentAt) {
              const retryAt = new Date(
                latestChallenge.lastSentAt.getTime() +
                  AUTH_PASSWORD_RESET_POLICY
                    .requestCooldownMilliseconds,
              );

              if (
                retryAt.getTime() >
                requestedAt.getTime()
              ) {
                return null;
              }
            }

            const currentFlowIsActive = Boolean(
              latestChallenge &&
                latestChallenge.consumedAt === null &&
                latestChallenge.invalidatedAt === null &&
                latestChallenge.expiresAt.getTime() >
                  requestedAt.getTime(),
            );

            const previousSendCount =
              currentFlowIsActive && latestChallenge
                ? latestChallenge.sendCount
                : 0;

            if (
              previousSendCount >=
              AUTH_PASSWORD_RESET_POLICY
                .maximumSendsPerWindow
            ) {
              return null;
            }

            const generatedChallenge =
              generatePasswordResetChallenge(
                user._id,
                requestedAt,
              );

            await invalidateActiveChallenges(
              {
                userId: user._id,
                purpose: "reset-password",
                invalidatedAt: requestedAt,
              },
              session,
            );

            const sendNumber =
              previousSendCount + 1;

            await createPasswordResetChallenge(
              {
                challengeId: new ObjectId(),
                publicId:
                  generatedChallenge.publicId,
                userId: user._id,
                secretHash:
                  generatedChallenge.secretHash,
                createdAt:
                  generatedChallenge.createdAt,
                expiresAt:
                  generatedChallenge.expiresAt,
                sendCount: sendNumber,
                lastSentAt: requestedAt,
              },
              session,
            );

            return {
              userId: user._id,
              recipientEmail:
                user.emailDisplay,
              displayName:
                user.displayName,
              resetUrl: createPasswordResetUrl(
                resolveClientOrigin(requestOrigin),
                generatedChallenge.publicId,
                generatedChallenge.secret,
              ),
              challengeId:
                generatedChallenge.publicId,
              expiresAt:
                generatedChallenge.expiresAt,
              sendNumber,
              requestedAt,
            } satisfies PreparedPasswordResetEmail;
          },
          PASSWORD_RESET_REQUEST_TRANSACTION_OPTIONS,
        );

      preparedEmail = transactionResult ?? null;
    } catch (error) {
      throw new AuthPersistenceError(
        "The password-reset challenge could not be prepared.",
        {
          cause: error,
        },
      );
    } finally {
      await session.endSession();
    }

    if (!preparedEmail) {
      return {
        acceptedAt: requestedAt,
      };
    }

    const ipHash = hashAuthIpAddress(
      requestMetadata.ipAddress,
    );

    const userAgentSummary =
      summarizeAuthUserAgent(
        requestMetadata.userAgent,
      );

    try {
      await dependencies.emailService.sendPasswordReset({
        recipientEmail:
          preparedEmail.recipientEmail,
        displayName:
          preparedEmail.displayName,
        resetUrl:
          preparedEmail.resetUrl,
        expiresAt:
          preparedEmail.expiresAt,
        idempotencyKey:
          `password-reset/${preparedEmail.challengeId}/${preparedEmail.sendNumber}`,
        challengeId:
          preparedEmail.challengeId,
        userId:
          preparedEmail.userId.toHexString(),
      });

      await recordPasswordResetRequestOutcome({
        userId: preparedEmail.userId,
        outcome: "success",
        sendNumber:
          preparedEmail.sendNumber,
        ipHash,
        userAgentSummary,
        createdAt: new Date(),
      });
    } catch (error) {
      await recordPasswordResetRequestOutcome({
        userId: preparedEmail.userId,
        outcome: "failure",
        sendNumber:
          preparedEmail.sendNumber,
        ipHash,
        userAgentSummary,
        createdAt: new Date(),
      });

      /*
       * The public response remains generic even when delivery fails.
       * Returning a provider-specific error only for real accounts would
       * disclose whether an email address is registered.
       */
      console.error(
        "[auth-password-reset-request] Password-reset email delivery failed.",
        {
          name:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );
    }

    return {
      acceptedAt: requestedAt,
    };
  } finally {
    await waitForMinimumResponseTime(
      requestStartedAtMilliseconds,
    );
  }
}