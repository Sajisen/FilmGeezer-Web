import {
  ObjectId,
  type ClientSession,
} from "mongodb";
import {
  AUTH_EMAIL_VERIFICATION_POLICY,
  AUTH_SCHEMA_VERSION,
} from "../auth.constants.js";
import { getAuthCollections } from "../auth.collections.js";
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
  input: InvalidateActiveChallengesInput,
  session: ClientSession,
): Promise<void> {
  const { challenges } = await getAuthCollections();

  await challenges.updateMany(
    {
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
      invalidatedAt: null,
    },
    {
      $set: {
        invalidatedAt: input.invalidatedAt,
      },
    },
    {
      session,
    },
  );
}

export interface CreateEmailVerificationChallengeInput {
  challengeId: ObjectId;
  publicId: string;

  userId: ObjectId;
  secretHash: string;

  createdAt: Date;
  expiresAt: Date;
}

export async function createEmailVerificationChallenge(
  input: CreateEmailVerificationChallengeInput,
  session: ClientSession,
): Promise<AuthChallengeDocument> {
  const { challenges } = await getAuthCollections();

  const challenge: AuthChallengeDocument = {
    _id: input.challengeId,
    schemaVersion: AUTH_SCHEMA_VERSION,

    publicId: input.publicId,

    userId: input.userId,
    purpose: "verify-email",

    secretHash: input.secretHash,

    attemptCount: 0,
    maximumAttempts:
      AUTH_EMAIL_VERIFICATION_POLICY.maximumAttempts,

    sendCount: 0,

createdAt: input.createdAt,
lastSentAt: null,
expiresAt: input.expiresAt,

    consumedAt: null,
    invalidatedAt: null,
  };

  await challenges.insertOne(challenge, {
    session,
  });

  return challenge;
}

export interface RecordEmailVerificationSendAttemptInput {
  publicId: string;
  userId: ObjectId;
  attemptedAt: Date;
}

export async function recordEmailVerificationSendAttempt(
  input: RecordEmailVerificationSendAttemptInput,
): Promise<boolean> {
  const { challenges } = await getAuthCollections();

  /*
   * Record the attempt before contacting the email provider.
   *
   * This ensures that failed provider calls still count towards the
   * resend limit and prevents a failing provider from being hammered
   * repeatedly without cooldown or accounting.
   */
  const result = await challenges.updateOne(
    {
      publicId: input.publicId,
      userId: input.userId,
      purpose: "verify-email",

      consumedAt: null,
      invalidatedAt: null,

      expiresAt: {
        $gt: input.attemptedAt,
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
        lastSentAt: input.attemptedAt,
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function findEmailVerificationChallengeByPublicId(
  publicId: string,
): Promise<AuthChallengeDocument | null> {
  const { challenges } =
    await getAuthCollections();

  return challenges.findOne({
    publicId,
    purpose: "verify-email",
  });
}

export interface RecordFailedEmailVerificationAttemptInput {
  challengeId: ObjectId;
  attemptedAt: Date;
}

export interface RecordFailedEmailVerificationAttemptResult {
  recorded: boolean;
  attemptCount: number | null;
  attemptsRemaining: number | null;
  locked: boolean;
}

export async function recordFailedEmailVerificationAttempt(
  input: RecordFailedEmailVerificationAttemptInput,
): Promise<RecordFailedEmailVerificationAttemptResult> {
  const { challenges } =
    await getAuthCollections();

  /*
   * The conditional update prevents more than the configured number
   * of incorrect attempts from being recorded.
   */
  const updateResult =
    await challenges.updateOne(
      {
        _id: input.challengeId,
        purpose: "verify-email",

        consumedAt: null,
        invalidatedAt: null,

        expiresAt: {
          $gt: input.attemptedAt,
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

  if (updateResult.modifiedCount !== 1) {
    return {
      recorded: false,
      attemptCount: null,
      attemptsRemaining: null,
      locked: false,
    };
  }

  const updatedChallenge =
    await challenges.findOne(
      {
        _id: input.challengeId,
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
    /*
     * The attempt-count condition already makes the challenge unusable.
     * invalidatedAt also records that terminal state explicitly.
     */
    await challenges.updateOne(
      {
        _id: input.challengeId,
        consumedAt: null,
        invalidatedAt: null,
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
      updatedChallenge.attemptCount,
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
  input: ConsumeEmailVerificationChallengeInput,
  session: ClientSession,
): Promise<boolean> {
  const { challenges } =
    await getAuthCollections();

  const result = await challenges.updateOne(
    {
      _id: input.challengeId,
      userId: input.userId,
      purpose: "verify-email",

      consumedAt: null,
      invalidatedAt: null,

      expiresAt: {
        $gt: input.verifiedAt,
      },

      attemptCount: {
        $lt:
          AUTH_EMAIL_VERIFICATION_POLICY
            .maximumAttempts,
      },
    },
    {
      $set: {
        consumedAt: input.verifiedAt,
      },
    },
    {
      session,
    },
  );

  return result.modifiedCount === 1;
}