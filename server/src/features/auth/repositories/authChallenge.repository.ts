import {
  ObjectId,
  type ClientSession,
} from "mongodb";

import {
  AUTH_EMAIL_CHANGE_POLICY,
  AUTH_EMAIL_VERIFICATION_POLICY,
  AUTH_PASSWORD_RESET_POLICY,
  AUTH_SCHEMA_VERSION,
} from "../auth.constants.js";

import {
  getAuthCollections,
} from "../auth.collections.js";

import type {
  AuthChallengeDocument,
  AuthChallengePurpose,
} from "../auth.types.js";

export interface InvalidateActiveChallengesInput {
  userId: ObjectId;
  purpose: AuthChallengePurpose;
  invalidatedAt: Date;
}

export async function invalidateActiveChallenges(
  input:
    InvalidateActiveChallengesInput,

  session: ClientSession,
): Promise<void> {
  const {
    challenges,
  } = await getAuthCollections();

  await challenges.updateMany(
    {
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
      invalidatedAt: null,
    },
    {
      $set: {
        invalidatedAt:
          input.invalidatedAt,
      },
    },
    {
      session,
    },
  );
}

export interface InvalidateAllActiveChallengesForUserInput {
  userId: ObjectId;
  invalidatedAt: Date;
}

export async function invalidateAllActiveChallengesForUser(
  input: InvalidateAllActiveChallengesForUserInput,
  session: ClientSession,
): Promise<number> {
  const { challenges } =
    await getAuthCollections();

  const result =
    await challenges.updateMany(
      {
        userId: input.userId,
        consumedAt: null,
        invalidatedAt: null,
      },
      {
        $set: {
          invalidatedAt:
            input.invalidatedAt,
        },
      },
      { session },
    );

  return result.modifiedCount;
}

export interface CreateEmailVerificationChallengeInput {
  challengeId: ObjectId;
  publicId: string;

  userId: ObjectId;
  secretHash: string;

  createdAt: Date;
  expiresAt: Date;

  sendCount?: number;
  lastSentAt?: Date | null;
}

export async function createEmailVerificationChallenge(
  input:
    CreateEmailVerificationChallengeInput,

  session: ClientSession,
): Promise<AuthChallengeDocument> {
  const {
    challenges,
  } = await getAuthCollections();

  const challenge:
    AuthChallengeDocument = {
      _id: input.challengeId,

      schemaVersion:
        AUTH_SCHEMA_VERSION,

      publicId: input.publicId,

      userId: input.userId,

      purpose:
        "verify-email",

      emailChange: null,

      secretHash:
        input.secretHash,

      attemptCount: 0,

      maximumAttempts:
        AUTH_EMAIL_VERIFICATION_POLICY
          .maximumAttempts,

      sendCount:
        input.sendCount ?? 0,

      createdAt:
        input.createdAt,

      lastSentAt:
        input.lastSentAt ?? null,

      expiresAt:
        input.expiresAt,

      deleteAt: new Date(
        input.expiresAt.getTime() +
          AUTH_EMAIL_VERIFICATION_POLICY
            .retentionAfterExpiryMilliseconds,
      ),

      consumedAt: null,
      invalidatedAt: null,
    };

  await challenges.insertOne(
    challenge,
    {
      session,
    },
  );

  return challenge;
}

export interface RecordEmailVerificationSendAttemptInput {
  publicId: string;
  userId: ObjectId;
  attemptedAt: Date;
}

export async function recordEmailVerificationSendAttempt(
  input:
    RecordEmailVerificationSendAttemptInput,
): Promise<boolean> {
  const {
    challenges,
  } = await getAuthCollections();

  /*
   * Record the attempt before contacting the email provider.
   *
   * This ensures that failed provider calls still count towards the
   * resend limit and prevents a failing provider from being hammered
   * repeatedly without cooldown or accounting.
   */
  const result =
    await challenges.updateOne(
      {
        publicId:
          input.publicId,

        userId:
          input.userId,

        purpose:
          "verify-email",

        consumedAt: null,
        invalidatedAt: null,

        expiresAt: {
          $gt:
            input.attemptedAt,
        },

        sendCount: {
          $lt:
            AUTH_EMAIL_VERIFICATION_POLICY
              .maximumSendsPerChallenge,
        },
      },
      {
        $inc: {
          sendCount: 1,
        },

        $set: {
          lastSentAt:
            input.attemptedAt,
        },
      },
    );

  return (
    result.modifiedCount === 1
  );
}

export async function findEmailVerificationChallengeByPublicId(
  publicId: string,

  session?: ClientSession,
): Promise<AuthChallengeDocument | null> {
  const {
    challenges,
  } = await getAuthCollections();

  return challenges.findOne(
    {
      publicId,

      purpose:
        "verify-email",
    },

    session
      ? {
          session,
        }
      : undefined,
  );
}

export async function findLatestEmailVerificationChallengeForUser(
  userId: ObjectId,

  session?: ClientSession,
): Promise<AuthChallengeDocument | null> {
  const {
    challenges,
  } = await getAuthCollections();

  return challenges.findOne(
    {
      userId,

      purpose:
        "verify-email",
    },
    {
      sort: {
        createdAt: -1,
        _id: -1,
      },

      ...(session
        ? {
            session,
          }
        : {}),
    },
  );
}

export interface RecordFailedEmailVerificationAttemptInput {
  challengeId: ObjectId;
  attemptedAt: Date;
}

export interface RecordFailedEmailVerificationAttemptResult {
  recorded: boolean;

  attemptCount:
    number | null;

  attemptsRemaining:
    number | null;

  locked: boolean;
}

export async function recordFailedEmailVerificationAttempt(
  input:
    RecordFailedEmailVerificationAttemptInput,
): Promise<RecordFailedEmailVerificationAttemptResult> {
  const {
    challenges,
  } = await getAuthCollections();

  /*
   * The conditional update prevents more than the configured number
   * of incorrect attempts from being recorded.
   */
  const updateResult =
    await challenges.updateOne(
      {
        _id:
          input.challengeId,

        purpose:
          "verify-email",

        consumedAt: null,
        invalidatedAt: null,

        expiresAt: {
          $gt:
            input.attemptedAt,
        },

        attemptCount: {
          $lt:
            AUTH_EMAIL_VERIFICATION_POLICY
              .maximumAttempts,
        },
      },
      {
        $inc: {
          attemptCount: 1,
        },
      },
    );

  if (
    updateResult.modifiedCount !== 1
  ) {
    return {
      recorded: false,

      attemptCount: null,

      attemptsRemaining:
        null,

      locked: false,
    };
  }

  const updatedChallenge =
    await challenges.findOne(
      {
        _id:
          input.challengeId,
      },
      {
        projection: {
          attemptCount: 1,

          maximumAttempts: 1,
        },
      },
    );

  if (!updatedChallenge) {
    return {
      recorded: true,

      attemptCount: null,

      attemptsRemaining:
        null,

      locked: false,
    };
  }

  const attemptsRemaining =
    Math.max(
      0,

      updatedChallenge
        .maximumAttempts -
        updatedChallenge
          .attemptCount,
    );

  const locked =
    attemptsRemaining === 0;

  if (locked) {
    /*
     * The attempt-count condition already makes the challenge unusable.
     * invalidatedAt also records that terminal state explicitly.
     */
    await challenges.updateOne(
      {
        _id:
          input.challengeId,

        consumedAt: null,

        invalidatedAt:
          null,
      },
      {
        $set: {
          invalidatedAt:
            input.attemptedAt,
        },
      },
    );
  }

  return {
    recorded: true,

    attemptCount:
      updatedChallenge
        .attemptCount,

    attemptsRemaining,

    locked,
  };
}

export interface ConsumeEmailVerificationChallengeInput {
  challengeId: ObjectId;
  userId: ObjectId;
  verifiedAt: Date;
}

export async function consumeEmailVerificationChallenge(
  input:
    ConsumeEmailVerificationChallengeInput,

  session: ClientSession,
): Promise<boolean> {
  const {
    challenges,
  } = await getAuthCollections();

  const result =
    await challenges.updateOne(
      {
        _id:
          input.challengeId,

        userId:
          input.userId,

        purpose:
          "verify-email",

        consumedAt: null,
        invalidatedAt: null,

        expiresAt: {
          $gt:
            input.verifiedAt,
        },

        attemptCount: {
          $lt:
            AUTH_EMAIL_VERIFICATION_POLICY
              .maximumAttempts,
        },
      },
      {
        $set: {
          consumedAt:
            input.verifiedAt,
        },
      },
      {
        session,
      },
    );

  return (
    result.modifiedCount === 1
  );
}

export interface CreatePasswordResetChallengeInput {
  challengeId: ObjectId;
  publicId: string;
  userId: ObjectId;
  secretHash: string;
  createdAt: Date;
  expiresAt: Date;
  sendCount: number;
  lastSentAt: Date;
}

export async function createPasswordResetChallenge(
  input: CreatePasswordResetChallengeInput,
  session: ClientSession,
): Promise<AuthChallengeDocument> {
  const { challenges } = await getAuthCollections();

  const challenge: AuthChallengeDocument = {
    _id: input.challengeId,
    schemaVersion: AUTH_SCHEMA_VERSION,
    publicId: input.publicId,
    userId: input.userId,
    purpose: "reset-password",
    emailChange: null,
    secretHash: input.secretHash,
    attemptCount: 0,
    maximumAttempts:
      AUTH_PASSWORD_RESET_POLICY.maximumAttempts,
    sendCount: input.sendCount,
    createdAt: input.createdAt,
    lastSentAt: input.lastSentAt,
    expiresAt: input.expiresAt,
    deleteAt: new Date(
      input.expiresAt.getTime() +
        AUTH_PASSWORD_RESET_POLICY
          .retentionAfterExpiryMilliseconds,
    ),
    consumedAt: null,
    invalidatedAt: null,
  };

  await challenges.insertOne(challenge, { session });

  return challenge;
}

export async function findPasswordResetChallengeByPublicId(
  publicId: string,
  session?: ClientSession,
): Promise<AuthChallengeDocument | null> {
  const { challenges } = await getAuthCollections();

  return challenges.findOne(
    {
      publicId,
      purpose: "reset-password",
    },
    session ? { session } : undefined,
  );
}

export async function findLatestPasswordResetChallengeForUser(
  userId: ObjectId,
  session?: ClientSession,
): Promise<AuthChallengeDocument | null> {
  const { challenges } = await getAuthCollections();

  return challenges.findOne(
    {
      userId,
      purpose: "reset-password",
    },
    {
      sort: {
        createdAt: -1,
        _id: -1,
      },
      ...(session ? { session } : {}),
    },
  );
}

export interface RecordFailedPasswordResetAttemptInput {
  challengeId: ObjectId;
  attemptedAt: Date;
}

export interface RecordFailedPasswordResetAttemptResult {
  recorded: boolean;
  attemptsRemaining: number | null;
  locked: boolean;
}

export async function recordFailedPasswordResetAttempt(
  input: RecordFailedPasswordResetAttemptInput,
): Promise<RecordFailedPasswordResetAttemptResult> {
  const { challenges } = await getAuthCollections();

  const updateResult = await challenges.updateOne(
    {
      _id: input.challengeId,
      purpose: "reset-password",
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: { $gt: input.attemptedAt },
      attemptCount: {
        $lt: AUTH_PASSWORD_RESET_POLICY.maximumAttempts,
      },
    },
    {
      $inc: { attemptCount: 1 },
    },
  );

  if (updateResult.modifiedCount !== 1) {
    return {
      recorded: false,
      attemptsRemaining: null,
      locked: false,
    };
  }

  const updatedChallenge = await challenges.findOne(
    { _id: input.challengeId },
    {
      projection: {
        attemptCount: 1,
        maximumAttempts: 1,
      },
    },
  );

  if (!updatedChallenge) {
    return {
      recorded: true,
      attemptsRemaining: null,
      locked: false,
    };
  }

  const attemptsRemaining = Math.max(
    0,
    updatedChallenge.maximumAttempts -
      updatedChallenge.attemptCount,
  );

  const locked = attemptsRemaining === 0;

  if (locked) {
    await challenges.updateOne(
      {
        _id: input.challengeId,
        consumedAt: null,
        invalidatedAt: null,
      },
      {
        $set: { invalidatedAt: input.attemptedAt },
      },
    );
  }

  return {
    recorded: true,
    attemptsRemaining,
    locked,
  };
}

export interface ConsumePasswordResetChallengeInput {
  challengeId: ObjectId;
  userId: ObjectId;
  consumedAt: Date;
}

export async function consumePasswordResetChallenge(
  input: ConsumePasswordResetChallengeInput,
  session: ClientSession,
): Promise<boolean> {
  const { challenges } = await getAuthCollections();

  const result = await challenges.updateOne(
    {
      _id: input.challengeId,
      userId: input.userId,
      purpose: "reset-password",
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: { $gt: input.consumedAt },
      attemptCount: {
        $lt: AUTH_PASSWORD_RESET_POLICY.maximumAttempts,
      },
    },
    {
      $set: { consumedAt: input.consumedAt },
    },
    { session },
  );

  return result.modifiedCount === 1;
}

export interface CreateEmailChangeChallengeInput {
  challengeId: ObjectId;
  publicId: string;
  userId: ObjectId;
  secretHash: string;
  sourceEmailNormalized: string;
  targetEmailNormalized: string;
  targetEmailDisplay: string;
  createdAt: Date;
  expiresAt: Date;
  sendCount: number;
  lastSentAt: Date;
}

export async function createEmailChangeChallenge(
  input: CreateEmailChangeChallengeInput,
  session: ClientSession,
): Promise<AuthChallengeDocument> {
  const { challenges } = await getAuthCollections();

  const challenge: AuthChallengeDocument = {
    _id: input.challengeId,
    schemaVersion: AUTH_SCHEMA_VERSION,
    publicId: input.publicId,
    userId: input.userId,
    purpose: "change-email",
    emailChange: {
      sourceEmailNormalized: input.sourceEmailNormalized,
      targetEmailNormalized: input.targetEmailNormalized,
      targetEmailDisplay: input.targetEmailDisplay,
    },
    secretHash: input.secretHash,
    attemptCount: 0,
    maximumAttempts: AUTH_EMAIL_CHANGE_POLICY.maximumAttempts,
    sendCount: input.sendCount,
    createdAt: input.createdAt,
    lastSentAt: input.lastSentAt,
    expiresAt: input.expiresAt,
    deleteAt: new Date(
      input.expiresAt.getTime() +
        AUTH_EMAIL_CHANGE_POLICY.retentionAfterExpiryMilliseconds,
    ),
    consumedAt: null,
    invalidatedAt: null,
  };

  await challenges.insertOne(challenge, { session });
  return challenge;
}

export async function findEmailChangeChallengeByPublicId(
  publicId: string,
  session?: ClientSession,
): Promise<AuthChallengeDocument | null> {
  const { challenges } = await getAuthCollections();

  return challenges.findOne(
    { publicId, purpose: "change-email" },
    session ? { session } : undefined,
  );
}

export async function findLatestEmailChangeChallengeForUser(
  userId: ObjectId,
  session?: ClientSession,
): Promise<AuthChallengeDocument | null> {
  const { challenges } = await getAuthCollections();

  return challenges.findOne(
    { userId, purpose: "change-email" },
    {
      sort: { createdAt: -1, _id: -1 },
      ...(session ? { session } : {}),
    },
  );
}

export interface RecordFailedEmailChangeAttemptInput {
  challengeId: ObjectId;
  userId: ObjectId;
  attemptedAt: Date;
}

export interface RecordFailedEmailChangeAttemptResult {
  recorded: boolean;
  attemptsRemaining: number | null;
  locked: boolean;
}

export async function recordFailedEmailChangeAttempt(
  input: RecordFailedEmailChangeAttemptInput,
): Promise<RecordFailedEmailChangeAttemptResult> {
  const { challenges } = await getAuthCollections();

  const updateResult = await challenges.updateOne(
    {
      _id: input.challengeId,
      userId: input.userId,
      purpose: "change-email",
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: { $gt: input.attemptedAt },
      attemptCount: { $lt: AUTH_EMAIL_CHANGE_POLICY.maximumAttempts },
    },
    { $inc: { attemptCount: 1 } },
  );

  if (updateResult.modifiedCount !== 1) {
    return {
      recorded: false,
      attemptsRemaining: null,
      locked: false,
    };
  }

  const updatedChallenge = await challenges.findOne(
    { _id: input.challengeId, userId: input.userId },
    { projection: { attemptCount: 1, maximumAttempts: 1 } },
  );

  if (!updatedChallenge) {
    return {
      recorded: true,
      attemptsRemaining: null,
      locked: false,
    };
  }

  const attemptsRemaining = Math.max(
    0,
    updatedChallenge.maximumAttempts -
      updatedChallenge.attemptCount,
  );

  const locked = attemptsRemaining === 0;

  if (locked) {
    await challenges.updateOne(
      {
        _id: input.challengeId,
        userId: input.userId,
        consumedAt: null,
        invalidatedAt: null,
      },
      { $set: { invalidatedAt: input.attemptedAt } },
    );
  }

  return { recorded: true, attemptsRemaining, locked };
}

export interface ConsumeEmailChangeChallengeInput {
  challengeId: ObjectId;
  userId: ObjectId;
  consumedAt: Date;
}

export async function consumeEmailChangeChallenge(
  input: ConsumeEmailChangeChallengeInput,
  session: ClientSession,
): Promise<boolean> {
  const { challenges } = await getAuthCollections();

  const result = await challenges.updateOne(
    {
      _id: input.challengeId,
      userId: input.userId,
      purpose: "change-email",
      consumedAt: null,
      invalidatedAt: null,
      expiresAt: { $gt: input.consumedAt },
      attemptCount: { $lt: AUTH_EMAIL_CHANGE_POLICY.maximumAttempts },
    },
    { $set: { consumedAt: input.consumedAt } },
    { session },
  );

  return result.modifiedCount === 1;
}

export interface CancelEmailChangeChallengeInput {
  challengeId: ObjectId;
  userId: ObjectId;
  cancelledAt: Date;
}

export async function cancelEmailChangeChallenge(
  input: CancelEmailChangeChallengeInput,
  session: ClientSession,
): Promise<boolean> {
  const { challenges } = await getAuthCollections();

  const result = await challenges.updateOne(
    {
      _id: input.challengeId,
      userId: input.userId,
      purpose: "change-email",
      consumedAt: null,
      invalidatedAt: null,
    },
    { $set: { invalidatedAt: input.cancelledAt } },
    { session },
  );

  return result.modifiedCount === 1;
}

