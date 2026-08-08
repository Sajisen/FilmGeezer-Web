import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  generateEmailChangeChallenge,
  verifyAuthChallengeSecret,
} from "../auth/auth.challenge.js";

import {
  AUTH_EMAIL_CHANGE_POLICY,
} from "../auth/auth.constants.js";

import {
  developmentAuthEmailService,
  type AuthEmailService,
} from "../auth/auth.email.js";

import {
  AuthEmailChangeError,
  AuthEmailConfigurationError,
  AuthPersistenceError,
  isMongoDuplicateKeyError,
  type AuthEmailChangeRejectionReason,
} from "../auth/auth.errors.js";

import {
  initializeAuthStorage,
} from "../auth/auth.indexes.js";

import {
  createLocalAuthSessionResult,
  createPreparedLocalAuthSession,
  prepareLocalAuthSession,
  type LocalAuthSessionResult,
} from "../auth/auth.session-creation.service.js";

import {
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  type AuthRequestMetadata,
} from "../auth/auth.session.js";

import type {
  AuthChallengeDocument,
  AuthRole,
} from "../auth/auth.types.js";

import {
  normalizeEmail,
  parseAccountEmailChangeChallengeId,
  parseAccountEmailChangeRequestInput,
  parseAccountEmailChangeResendInput,
  parseAccountEmailChangeVerifyInput,
  type AccountEmailChangeRequestInput,
  type AccountEmailChangeResendInput,
  type AccountEmailChangeVerifyInput,
} from "../auth/auth.validation.js";

import {
  createAuthAuditEvent,
} from "../auth/repositories/authAudit.repository.js";

import {
  cancelEmailChangeChallenge,
  consumeEmailChangeChallenge,
  createEmailChangeChallenge,
  findEmailChangeChallengeByPublicId,
  findLatestEmailChangeChallengeForUser,
  invalidateActiveChallenges,
  recordFailedEmailChangeAttempt,
} from "../auth/repositories/authChallenge.repository.js";

import {
  revokeAllActiveAuthSessions,
} from "../auth/repositories/authSession.repository.js";

import {
  findActiveUserById,
  findUserByNormalizedEmail,
  updateActiveUserEmail,
} from "../auth/repositories/authUser.repository.js";

import type {
  AuthenticatedSessionContext,
} from "../auth/auth.session.service.js";

const EMAIL_CHANGE_TRANSACTION_OPTIONS:
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

export interface AccountEmailChangeReceipt {
  challengeId: string;
  targetEmail: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  attemptsRemaining: number;
}

export interface AccountEmailChangeStatusResult {
  pending: AccountEmailChangeReceipt | null;
}

export interface AccountEmailChangeCompletedResult
  extends LocalAuthSessionResult {
  previousEmail: string;
  changedAt: Date;
  sessionsRevoked: number;
}

export interface AccountEmailChangeCancelledResult {
  challengeId: string;
  cancelledAt: Date;
}

interface PreparedEmailChangeDelivery {
  userId: ObjectId;
  recipientEmail: string;
  displayName: string;
  verificationCode: string;
  challengeId: string;
  expiresAt: Date;
  sentAt: Date;
  sendNumber: number;
}

interface EmailChangeDependencies {
  emailService: AuthEmailService;
}

const defaultDependencies: EmailChangeDependencies = {
  emailService: developmentAuthEmailService,
};

function createResendAvailableAt(
  sentAt: Date,
): Date {
  return new Date(
    sentAt.getTime() +
      AUTH_EMAIL_CHANGE_POLICY
        .resendCooldownMilliseconds,
  );
}

function createAttemptsRemaining(
  challenge: AuthChallengeDocument,
): number {
  return Math.max(
    0,
    challenge.maximumAttempts -
      challenge.attemptCount,
  );
}

function createReceipt(
  challenge: AuthChallengeDocument,
): AccountEmailChangeReceipt | null {
  const context = challenge.emailChange;

  if (!context) {
    return null;
  }

  const sentAt =
    challenge.lastSentAt ??
    challenge.createdAt;

  return {
    challengeId: challenge.publicId,
    targetEmail: context.targetEmailDisplay,
    expiresAt: challenge.expiresAt,
    resendAvailableAt:
      createResendAvailableAt(sentAt),
    attemptsRemaining:
      createAttemptsRemaining(challenge),
  };
}

function createAuditMetadata(
  requestMetadata: AuthRequestMetadata,
) {
  return {
    ipHash: hashAuthIpAddress(
      requestMetadata.ipAddress,
    ),
    userAgentSummary:
      summarizeAuthUserAgent(
        requestMetadata.userAgent,
      ),
  };
}

function isEmailAddressConflict(
  error: unknown,
): boolean {
  if (!isMongoDuplicateKeyError(error)) {
    return false;
  }

  const keyPattern = error.keyPattern;

  return (
    typeof keyPattern === "object" &&
    keyPattern !== null &&
    "emailNormalized" in keyPattern
  ) || error.message.includes(
    "users_email_normalized_unique",
  );
}

async function recordEmailChangeDeliveryOutcome(
  input: {
    userId: ObjectId;
    outcome: "success" | "failure";
    source: "request" | "resend";
    sendNumber: number;
    requestMetadata: AuthRequestMetadata;
    createdAt: Date;
  },
): Promise<void> {
  try {
    await createAuthAuditEvent({
      auditEventId: new ObjectId(),
      userId: input.userId,
      eventType:
        "email-change-verification-sent",
      outcome: input.outcome,
      ...createAuditMetadata(
        input.requestMetadata,
      ),
      details: {
        source: input.source,
        sendNumber: input.sendNumber,
      },
      createdAt: input.createdAt,
    });
  } catch (error) {
    console.error(
      "[account-email-change] Delivery audit could not be recorded.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

async function recordEmailChangeFailure(
  input: {
    userId: ObjectId;
    reason: AuthEmailChangeRejectionReason;
    attemptsRemaining?: number | null;
    requestMetadata: AuthRequestMetadata;
    createdAt: Date;
  },
): Promise<void> {
  try {
    await createAuthAuditEvent({
      auditEventId: new ObjectId(),
      userId: input.userId,
      eventType:
        "email-change-verification-failed",
      outcome: "failure",
      ...createAuditMetadata(
        input.requestMetadata,
      ),
      details: {
        reason: input.reason,
        attemptsRemaining:
          input.attemptsRemaining ?? null,
      },
      createdAt: input.createdAt,
    });
  } catch (error) {
    console.error(
      "[account-email-change] Failure audit could not be recorded.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

async function sendPreparedEmailChangeCode(
  prepared: PreparedEmailChangeDelivery,
  source: "request" | "resend",
  requestMetadata: AuthRequestMetadata,
  dependencies: EmailChangeDependencies,
): Promise<void> {
  try {
    await dependencies.emailService
      .sendEmailChangeVerification({
        recipientEmail:
          prepared.recipientEmail,
        displayName:
          prepared.displayName,
        verificationCode:
          prepared.verificationCode,
        expiresAt:
          prepared.expiresAt,
        idempotencyKey:
          `email-change/${prepared.challengeId}/${prepared.sendNumber}`,
        challengeId:
          prepared.challengeId,
        userId:
          prepared.userId.toHexString(),
      });

    await recordEmailChangeDeliveryOutcome({
      userId: prepared.userId,
      outcome: "success",
      source,
      sendNumber: prepared.sendNumber,
      requestMetadata,
      createdAt: new Date(),
    });
  } catch (error) {
    await recordEmailChangeDeliveryOutcome({
      userId: prepared.userId,
      outcome: "failure",
      source,
      sendNumber: prepared.sendNumber,
      requestMetadata,
      createdAt: new Date(),
    });

    if (
      error instanceof
      AuthEmailConfigurationError
    ) {
      throw error;
    }

    console.error(
      "[account-email-change] Verification email delivery failed.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

export async function getPendingAccountEmailChange(
  auth: AuthenticatedSessionContext,
): Promise<AccountEmailChangeStatusResult> {
  await initializeAuthStorage();

  const checkedAt = new Date();

  const challenge =
    await findLatestEmailChangeChallengeForUser(
      auth.userId,
    );

  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.invalidatedAt ||
    challenge.expiresAt.getTime() <=
      checkedAt.getTime() ||
    challenge.attemptCount >=
      challenge.maximumAttempts
  ) {
    return { pending: null };
  }

  const receipt = createReceipt(challenge);

  if (!receipt) {
    return { pending: null };
  }

  return { pending: receipt };
}

export async function requestAccountEmailChange(
  input: AccountEmailChangeRequestInput,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
  dependencies: EmailChangeDependencies =
    defaultDependencies,
): Promise<AccountEmailChangeReceipt> {
  const request =
    parseAccountEmailChangeRequestInput(
      input,
    );

  const currentEmailNormalized =
    normalizeEmail(auth.email);

  if (
    request.emailNormalized ===
    currentEmailNormalized
  ) {
    throw new AuthEmailChangeError(
      "same-email",
    );
  }

  await initializeAuthStorage();

  const existingUser =
    await findUserByNormalizedEmail(
      request.emailNormalized,
    );

  if (
    existingUser &&
    !existingUser._id.equals(auth.userId)
  ) {
    throw new AuthEmailChangeError(
      "email-in-use",
    );
  }

  const requestedAt = new Date();
  const generatedChallenge =
    generateEmailChangeChallenge(
      auth.userId,
      requestedAt,
    );

  const challengeId = new ObjectId();
  const auditEventId = new ObjectId();

  const client = await getMongoClient();
  const session = client.startSession();

  let prepared:
    PreparedEmailChangeDelivery;

  try {
    const result =
      await session.withTransaction(
        async () => {
          const user =
            await findActiveUserById(
              auth.userId,
              session,
            );

          if (!user) {
            throw new AuthEmailChangeError(
              "account-unavailable",
            );
          }

          if (
            user.emailNormalized !==
            currentEmailNormalized
          ) {
            throw new AuthEmailChangeError(
              "account-changed",
            );
          }

          const conflict =
            await findUserByNormalizedEmail(
              request.emailNormalized,
              session,
            );

          if (
            conflict &&
            !conflict._id.equals(user._id)
          ) {
            throw new AuthEmailChangeError(
              "email-in-use",
            );
          }

          await invalidateActiveChallenges(
            {
              userId: user._id,
              purpose: "change-email",
              invalidatedAt: requestedAt,
            },
            session,
          );

          await createEmailChangeChallenge(
            {
              challengeId,
              publicId:
                generatedChallenge.publicId,
              userId: user._id,
              secretHash:
                generatedChallenge.secretHash,
              sourceEmailNormalized:
                user.emailNormalized,
              targetEmailNormalized:
                request.emailNormalized,
              targetEmailDisplay:
                request.emailDisplay,
              createdAt:
                generatedChallenge.createdAt,
              expiresAt:
                generatedChallenge.expiresAt,
              sendCount: 1,
              lastSentAt: requestedAt,
            },
            session,
          );

          await createAuthAuditEvent(
            {
              auditEventId,
              userId: user._id,
              eventType:
                "email-change-requested",
              outcome: "success",
              ...createAuditMetadata(
                requestMetadata,
              ),
              details: {
                source: "account-page",
              },
              createdAt: requestedAt,
            },
            session,
          );

          return {
            userId: user._id,
            recipientEmail:
              request.emailDisplay,
            displayName: user.displayName,
            verificationCode:
              generatedChallenge.secret,
            challengeId:
              generatedChallenge.publicId,
            expiresAt:
              generatedChallenge.expiresAt,
            sentAt: requestedAt,
            sendNumber: 1,
          } satisfies
            PreparedEmailChangeDelivery;
        },
        EMAIL_CHANGE_TRANSACTION_OPTIONS,
      );

    if (!result) {
      throw new AuthPersistenceError(
        "Email change request completed without returning a challenge.",
      );
    }

    prepared = result;
  } catch (error) {
    if (
      error instanceof AuthEmailChangeError ||
      error instanceof AuthPersistenceError
    ) {
      throw error;
    }

    if (isEmailAddressConflict(error)) {
      throw new AuthEmailChangeError(
        "email-in-use",
      );
    }

    throw new AuthPersistenceError(
      "The email-address change could not be prepared.",
      { cause: error },
    );
  } finally {
    await session.endSession();
  }

  await sendPreparedEmailChangeCode(
    prepared,
    "request",
    requestMetadata,
    dependencies,
  );

  return {
    challengeId: prepared.challengeId,
    targetEmail: prepared.recipientEmail,
    expiresAt: prepared.expiresAt,
    resendAvailableAt:
      createResendAvailableAt(
        prepared.sentAt,
      ),
    attemptsRemaining:
      AUTH_EMAIL_CHANGE_POLICY
        .maximumAttempts,
  };
}

export async function resendAccountEmailChangeCode(
  input: AccountEmailChangeResendInput,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
  dependencies: EmailChangeDependencies =
    defaultDependencies,
): Promise<AccountEmailChangeReceipt> {
  const request =
    parseAccountEmailChangeResendInput(
      input,
    );

  await initializeAuthStorage();

  const attemptedAt = new Date();
  const client = await getMongoClient();
  const session = client.startSession();

  let prepared:
    PreparedEmailChangeDelivery;

  try {
    const result =
      await session.withTransaction(
        async () => {
          const requestedChallenge =
            await findEmailChangeChallengeByPublicId(
              request.challengeId,
              session,
            );

          if (
            !requestedChallenge ||
            !requestedChallenge.userId.equals(
              auth.userId,
            )
          ) {
            throw new AuthEmailChangeError(
              "invalid-challenge",
            );
          }

          const latestChallenge =
            await findLatestEmailChangeChallengeForUser(
              auth.userId,
              session,
            );

          if (
            !latestChallenge ||
            !latestChallenge._id.equals(
              requestedChallenge._id,
            )
          ) {
            throw new AuthEmailChangeError(
              "superseded",
            );
          }

          if (latestChallenge.consumedAt) {
            throw new AuthEmailChangeError(
              "already-used",
            );
          }

          if (latestChallenge.invalidatedAt) {
            throw new AuthEmailChangeError(
              latestChallenge.attemptCount >=
                latestChallenge.maximumAttempts
                ? "attempts-exceeded"
                : "invalid-challenge",
              0,
            );
          }

          if (
            latestChallenge.expiresAt.getTime() <=
            attemptedAt.getTime()
          ) {
            throw new AuthEmailChangeError(
              "expired",
            );
          }

          if (
            latestChallenge.sendCount >=
            AUTH_EMAIL_CHANGE_POLICY
              .maximumSendsPerChallenge
          ) {
            throw new AuthEmailChangeError(
              "send-limit",
            );
          }

          if (latestChallenge.lastSentAt) {
            const retryAt =
              createResendAvailableAt(
                latestChallenge.lastSentAt,
              );

            if (
              retryAt.getTime() >
              attemptedAt.getTime()
            ) {
              throw new AuthEmailChangeError(
                "cooldown",
                null,
                retryAt,
              );
            }
          }

          const context =
            latestChallenge.emailChange;

          if (!context) {
            throw new AuthPersistenceError(
              "The email-change challenge is missing its target address.",
            );
          }

          const user =
            await findActiveUserById(
              auth.userId,
              session,
            );

          if (!user) {
            throw new AuthEmailChangeError(
              "account-unavailable",
            );
          }

          if (
            user.emailNormalized !==
            context.sourceEmailNormalized
          ) {
            throw new AuthEmailChangeError(
              "account-changed",
            );
          }

          const conflict =
            await findUserByNormalizedEmail(
              context.targetEmailNormalized,
              session,
            );

          if (
            conflict &&
            !conflict._id.equals(user._id)
          ) {
            throw new AuthEmailChangeError(
              "email-in-use",
            );
          }

          const replacement =
            generateEmailChangeChallenge(
              user._id,
              attemptedAt,
            );

          await invalidateActiveChallenges(
            {
              userId: user._id,
              purpose: "change-email",
              invalidatedAt: attemptedAt,
            },
            session,
          );

          const sendNumber =
            latestChallenge.sendCount + 1;

          await createEmailChangeChallenge(
            {
              challengeId: new ObjectId(),
              publicId: replacement.publicId,
              userId: user._id,
              secretHash: replacement.secretHash,
              sourceEmailNormalized:
                context.sourceEmailNormalized,
              targetEmailNormalized:
                context.targetEmailNormalized,
              targetEmailDisplay:
                context.targetEmailDisplay,
              createdAt: replacement.createdAt,
              expiresAt: replacement.expiresAt,
              sendCount: sendNumber,
              lastSentAt: attemptedAt,
            },
            session,
          );

          return {
            userId: user._id,
            recipientEmail:
              context.targetEmailDisplay,
            displayName: user.displayName,
            verificationCode:
              replacement.secret,
            challengeId:
              replacement.publicId,
            expiresAt: replacement.expiresAt,
            sentAt: attemptedAt,
            sendNumber,
          } satisfies
            PreparedEmailChangeDelivery;
        },
        EMAIL_CHANGE_TRANSACTION_OPTIONS,
      );

    if (!result) {
      throw new AuthPersistenceError(
        "Email change resend completed without returning a challenge.",
      );
    }

    prepared = result;
  } catch (error) {
    if (
      error instanceof AuthEmailChangeError ||
      error instanceof AuthPersistenceError
    ) {
      throw error;
    }

    if (isEmailAddressConflict(error)) {
      throw new AuthEmailChangeError(
        "email-in-use",
      );
    }

    throw new AuthPersistenceError(
      "The email-change verification code could not be replaced.",
      { cause: error },
    );
  } finally {
    await session.endSession();
  }

  await sendPreparedEmailChangeCode(
    prepared,
    "resend",
    requestMetadata,
    dependencies,
  );

  return {
    challengeId: prepared.challengeId,
    targetEmail: prepared.recipientEmail,
    expiresAt: prepared.expiresAt,
    resendAvailableAt:
      createResendAvailableAt(
        prepared.sentAt,
      ),
    attemptsRemaining:
      AUTH_EMAIL_CHANGE_POLICY
        .maximumAttempts,
  };
}

export async function verifyAccountEmailChange(
  input: AccountEmailChangeVerifyInput,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
  dependencies: EmailChangeDependencies =
    defaultDependencies,
): Promise<AccountEmailChangeCompletedResult> {
  const verification =
    parseAccountEmailChangeVerifyInput(
      input,
    );

  await initializeAuthStorage();

  const checkedAt = new Date();
  const challenge =
    await findEmailChangeChallengeByPublicId(
      verification.challengeId,
    );

  if (
    !challenge ||
    !challenge.userId.equals(auth.userId)
  ) {
    throw new AuthEmailChangeError(
      "invalid-challenge",
    );
  }

  if (challenge.consumedAt) {
    await recordEmailChangeFailure({
      userId: auth.userId,
      reason: "already-used",
      requestMetadata,
      createdAt: checkedAt,
    });

    throw new AuthEmailChangeError(
      "already-used",
    );
  }

  if (challenge.invalidatedAt) {
    const reason:
      AuthEmailChangeRejectionReason =
        challenge.attemptCount >=
        challenge.maximumAttempts
          ? "attempts-exceeded"
          : "invalid-challenge";

    await recordEmailChangeFailure({
      userId: auth.userId,
      reason,
      attemptsRemaining: 0,
      requestMetadata,
      createdAt: checkedAt,
    });

    throw new AuthEmailChangeError(
      reason,
      0,
    );
  }

  if (
    challenge.attemptCount >=
    challenge.maximumAttempts
  ) {
    throw new AuthEmailChangeError(
      "attempts-exceeded",
      0,
    );
  }

  if (
    challenge.expiresAt.getTime() <=
    checkedAt.getTime()
  ) {
    throw new AuthEmailChangeError(
      "expired",
    );
  }

  const context = challenge.emailChange;

  if (!context) {
    throw new AuthPersistenceError(
      "The email-change challenge is missing its target address.",
    );
  }

  const codeIsValid =
    verifyAuthChallengeSecret({
      publicId: challenge.publicId,
      userId: challenge.userId,
      purpose: "change-email",
      candidateSecret:
        verification.code,
      storedSecretHash:
        challenge.secretHash,
    });

  if (!codeIsValid) {
    const failedAttempt =
      await recordFailedEmailChangeAttempt(
        {
          challengeId: challenge._id,
          userId: auth.userId,
          attemptedAt: checkedAt,
        },
      );

    if (!failedAttempt.recorded) {
      throw new AuthEmailChangeError(
        "invalid-challenge",
      );
    }

    const reason:
      AuthEmailChangeRejectionReason =
        failedAttempt.locked
          ? "attempts-exceeded"
          : "incorrect-code";

    await recordEmailChangeFailure({
      userId: auth.userId,
      reason,
      attemptsRemaining:
        failedAttempt.attemptsRemaining,
      requestMetadata,
      createdAt: checkedAt,
    });

    throw new AuthEmailChangeError(
      reason,
      failedAttempt.attemptsRemaining,
    );
  }

  const changedAt = new Date();
  const preparedSession =
    prepareLocalAuthSession(
      requestMetadata,
      changedAt,
    );

  const changedAuditId = new ObjectId();
  const client = await getMongoClient();
  const session = client.startSession();

  let previousEmail: string;
  let result:
    AccountEmailChangeCompletedResult;

  try {
    const transactionResult =
      await session.withTransaction(
        async () => {
          const user =
            await findActiveUserById(
              auth.userId,
              session,
            );

          if (!user) {
            throw new AuthEmailChangeError(
              "account-unavailable",
            );
          }

          if (
            user.emailNormalized !==
            context.sourceEmailNormalized
          ) {
            throw new AuthEmailChangeError(
              "account-changed",
            );
          }

          const conflict =
            await findUserByNormalizedEmail(
              context.targetEmailNormalized,
              session,
            );

          if (
            conflict &&
            !conflict._id.equals(user._id)
          ) {
            throw new AuthEmailChangeError(
              "email-in-use",
            );
          }

          const challengeWasConsumed =
            await consumeEmailChangeChallenge(
              {
                challengeId: challenge._id,
                userId: user._id,
                consumedAt: changedAt,
              },
              session,
            );

          if (!challengeWasConsumed) {
            throw new AuthEmailChangeError(
              "invalid-challenge",
            );
          }

          const updatedUser =
            await updateActiveUserEmail(
              {
                userId: user._id,
                expectedEmailNormalized:
                  context.sourceEmailNormalized,
                emailNormalized:
                  context.targetEmailNormalized,
                emailDisplay:
                  context.targetEmailDisplay,
                verifiedAt: changedAt,
              },
              session,
            );

          if (!updatedUser) {
            throw new AuthEmailChangeError(
              "account-changed",
            );
          }

          const sessionsRevoked =
            await revokeAllActiveAuthSessions(
              {
                userId: user._id,
                revokedAt: changedAt,
                reason: "email-changed",
              },
              session,
            );

          await createPreparedLocalAuthSession(
            user._id,
            preparedSession,
            session,
          );

          await createAuthAuditEvent(
            {
              auditEventId: changedAuditId,
              userId: user._id,
              eventType: "email-changed",
              outcome: "success",
              ...createAuditMetadata(
                requestMetadata,
              ),
              details: {
                sessionsRevoked,
                sessionRotated: true,
              },
              createdAt: changedAt,
            },
            session,
          );

          return {
            ...createLocalAuthSessionResult(
              updatedUser,
              preparedSession,
            ),
            previousEmail: user.emailDisplay,
            changedAt,
            sessionsRevoked,
          } satisfies
            AccountEmailChangeCompletedResult;
        },
        EMAIL_CHANGE_TRANSACTION_OPTIONS,
      );

    if (!transactionResult) {
      throw new AuthPersistenceError(
        "Email change completed without returning a result.",
      );
    }

    previousEmail =
      transactionResult.previousEmail;
    result = transactionResult;
  } catch (error) {
    if (
      error instanceof AuthEmailChangeError ||
      error instanceof AuthPersistenceError
    ) {
      throw error;
    }

    if (isEmailAddressConflict(error)) {
      throw new AuthEmailChangeError(
        "email-in-use",
      );
    }

    throw new AuthPersistenceError(
      "The FilmGeezer email address could not be changed.",
      { cause: error },
    );
  } finally {
    await session.endSession();
  }

  try {
    await dependencies.emailService
      .sendEmailChangedNotice({
        recipientEmail: previousEmail,
        displayName: result.user.displayName,
        newEmail: result.user.email,
        changedAt,
        idempotencyKey:
          `email-changed/${auth.userId.toHexString()}/${changedAt.getTime()}`,
        userId:
          auth.userId.toHexString(),
      });

    await createAuthAuditEvent({
      auditEventId: new ObjectId(),
      userId: auth.userId,
      eventType:
        "email-change-old-address-notified",
      outcome: "success",
      ...createAuditMetadata(
        requestMetadata,
      ),
      details: {},
      createdAt: new Date(),
    });
  } catch (error) {
    console.error(
      "[account-email-change] Previous-address notification failed.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );

    try {
      await createAuthAuditEvent({
        auditEventId: new ObjectId(),
        userId: auth.userId,
        eventType:
          "email-change-old-address-notified",
        outcome: "failure",
        ...createAuditMetadata(
          requestMetadata,
        ),
        details: {},
        createdAt: new Date(),
      });
    } catch {
      // The email change already committed. Secondary reporting must not
      // alter the successful account response.
    }
  }

  return result;
}

export async function cancelAccountEmailChange(
  challengeIdInput: unknown,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
): Promise<AccountEmailChangeCancelledResult> {
  const challengeId =
    parseAccountEmailChangeChallengeId(
      challengeIdInput,
    );

  await initializeAuthStorage();

  const cancelledAt = new Date();
  const client = await getMongoClient();
  const session = client.startSession();

  try {
    const result =
      await session.withTransaction(
        async () => {
          const challenge =
            await findEmailChangeChallengeByPublicId(
              challengeId,
              session,
            );

          if (
            !challenge ||
            !challenge.userId.equals(
              auth.userId,
            ) ||
            challenge.consumedAt ||
            challenge.invalidatedAt
          ) {
            throw new AuthEmailChangeError(
              "invalid-challenge",
            );
          }

          const wasCancelled =
            await cancelEmailChangeChallenge(
              {
                challengeId: challenge._id,
                userId: auth.userId,
                cancelledAt,
              },
              session,
            );

          if (!wasCancelled) {
            throw new AuthEmailChangeError(
              "invalid-challenge",
            );
          }

          await createAuthAuditEvent(
            {
              auditEventId: new ObjectId(),
              userId: auth.userId,
              eventType:
                "email-change-cancelled",
              outcome: "success",
              ...createAuditMetadata(
                requestMetadata,
              ),
              details: {},
              createdAt: cancelledAt,
            },
            session,
          );

          return {
            challengeId,
            cancelledAt,
          } satisfies
            AccountEmailChangeCancelledResult;
        },
        EMAIL_CHANGE_TRANSACTION_OPTIONS,
      );

    if (!result) {
      throw new AuthPersistenceError(
        "Email change cancellation completed without returning a result.",
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof AuthEmailChangeError ||
      error instanceof AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The pending email change could not be cancelled.",
      { cause: error },
    );
  } finally {
    await session.endSession();
  }
}
