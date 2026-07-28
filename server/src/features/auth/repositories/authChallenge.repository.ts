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