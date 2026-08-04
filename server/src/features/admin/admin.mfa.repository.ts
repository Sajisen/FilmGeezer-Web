import {
  ObjectId,
  type ClientSession,
} from "mongodb";

import { ADMIN_SCHEMA_VERSION } from "./admin.constants.js";
import { getAdminCollections } from "./admin.collections.js";
import type {
  AdminEncryptedSecret,
  AdminMfaChallengeDocument,
  AdminMfaChallengePurpose,
  AdminMfaFactorDocument,
  AdminSessionAccessLevel,
} from "./admin.types.js";

export async function findAdminMfaFactorByUserId(
  userId: ObjectId,
  session?: ClientSession,
): Promise<AdminMfaFactorDocument | null> {
  const { mfaFactors } = await getAdminCollections();
  return mfaFactors.findOne(
    { userId },
    session ? { session } : undefined,
  );
}

export async function createAdminMfaChallenge(input: {
  challengeId: ObjectId;
  publicId: string;
  purpose: AdminMfaChallengePurpose;
  userId: ObjectId;
  sessionId: ObjectId | null;
  tokenHash: string | null;
  encryptedSecret: AdminEncryptedSecret | null;
  maximumAttempts: number;
  ipHash: string | null;
  userAgentSummary: string | null;
  createdAt: Date;
  expiresAt: Date;
}): Promise<AdminMfaChallengeDocument> {
  const { mfaChallenges } = await getAdminCollections();

  const document: AdminMfaChallengeDocument = {
    _id: input.challengeId,
    schemaVersion: ADMIN_SCHEMA_VERSION,
    publicId: input.publicId,
    purpose: input.purpose,
    userId: input.userId,
    sessionId: input.sessionId,
    tokenHash: input.tokenHash,
    encryptedSecret: input.encryptedSecret,
    attemptCount: 0,
    maximumAttempts: input.maximumAttempts,
    ipHash: input.ipHash,
    userAgentSummary: input.userAgentSummary,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    consumedAt: null,
  };

  await mfaChallenges.insertOne(document);
  return document;
}

export async function invalidateOpenAdminMfaChallenges(input: {
  userId: ObjectId;
  purpose: AdminMfaChallengePurpose;
  invalidatedAt: Date;
  sessionId?: ObjectId;
}): Promise<void> {
  const { mfaChallenges } = await getAdminCollections();

  await mfaChallenges.updateMany(
    {
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    },
    { $set: { consumedAt: input.invalidatedAt } },
  );
}

export async function findAdminMfaChallengeByTokenHash(
  tokenHash: string,
): Promise<AdminMfaChallengeDocument | null> {
  const { mfaChallenges } = await getAdminCollections();
  return mfaChallenges.findOne({ tokenHash, purpose: "login" });
}

export async function findAdminMfaSetupChallenge(input: {
  publicId: string;
  userId: ObjectId;
  sessionId: ObjectId;
}): Promise<AdminMfaChallengeDocument | null> {
  const { mfaChallenges } = await getAdminCollections();
  return mfaChallenges.findOne({
    publicId: input.publicId,
    purpose: "setup",
    userId: input.userId,
    sessionId: input.sessionId,
  });
}

export async function recordAdminMfaChallengeFailure(input: {
  challengeId: ObjectId;
  checkedAt: Date;
}): Promise<number> {
  const { mfaChallenges } = await getAdminCollections();

  const result = await mfaChallenges.findOneAndUpdate(
    {
      _id: input.challengeId,
      consumedAt: null,
      expiresAt: { $gt: input.checkedAt },
      $expr: { $lt: ["$attemptCount", "$maximumAttempts"] },
    },
    { $inc: { attemptCount: 1 } },
    { returnDocument: "after" },
  );

  if (!result) {
    return 0;
  }

  const remaining = Math.max(
    0,
    result.maximumAttempts - result.attemptCount,
  );

  if (remaining === 0) {
    await mfaChallenges.updateOne(
      { _id: result._id, consumedAt: null },
      { $set: { consumedAt: input.checkedAt } },
    );
  }

  return remaining;
}

export async function consumeAdminMfaChallenge(
  challengeId: ObjectId,
  consumedAt: Date,
  session?: ClientSession,
): Promise<boolean> {
  const { mfaChallenges } = await getAdminCollections();
  const result = await mfaChallenges.updateOne(
    {
      _id: challengeId,
      consumedAt: null,
      expiresAt: { $gt: consumedAt },
    },
    { $set: { consumedAt } },
    session ? { session } : undefined,
  );

  return result.modifiedCount === 1;
}

export async function createAdminMfaFactor(input: {
  factorId: ObjectId;
  userId: ObjectId;
  encryptedSecret: AdminEncryptedSecret;
  recoveryCodeHashes: string[];
  acceptedTimeStep: number;
  createdAt: Date;
}, session: ClientSession): Promise<AdminMfaFactorDocument> {
  const { mfaFactors } = await getAdminCollections();

  const document: AdminMfaFactorDocument = {
    _id: input.factorId,
    schemaVersion: ADMIN_SCHEMA_VERSION,
    userId: input.userId,
    algorithm: "SHA1",
    digits: 6,
    periodSeconds: 30,
    encryptedSecret: input.encryptedSecret,
    recoveryCodeHashes: input.recoveryCodeHashes,
    lastAcceptedTimeStep: input.acceptedTimeStep,
    enabledAt: input.createdAt,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };

  await mfaFactors.insertOne(document, { session });
  return document;
}

export async function acceptAdminTotpTimeStep(input: {
  factorId: ObjectId;
  timeStep: number;
  acceptedAt: Date;
}, session?: ClientSession): Promise<boolean> {
  const { mfaFactors } = await getAdminCollections();
  const result = await mfaFactors.updateOne(
    {
      _id: input.factorId,
      $or: [
        { lastAcceptedTimeStep: null },
        { lastAcceptedTimeStep: { $lt: input.timeStep } },
      ],
    },
    {
      $set: {
        lastAcceptedTimeStep: input.timeStep,
        updatedAt: input.acceptedAt,
      },
    },
    session ? { session } : undefined,
  );

  return result.modifiedCount === 1;
}

export async function consumeAdminRecoveryCode(input: {
  factorId: ObjectId;
  recoveryCodeHash: string;
  consumedAt: Date;
}, session?: ClientSession): Promise<boolean> {
  const { mfaFactors } = await getAdminCollections();
  const result = await mfaFactors.updateOne(
    {
      _id: input.factorId,
      recoveryCodeHashes: input.recoveryCodeHash,
    },
    {
      $pull: { recoveryCodeHashes: input.recoveryCodeHash },
      $set: { updatedAt: input.consumedAt },
    },
    session ? { session } : undefined,
  );

  return result.modifiedCount === 1;
}

export async function replaceAdminRecoveryCodes(input: {
  factorId: ObjectId;
  hashes: string[];
  updatedAt: Date;
}, session?: ClientSession): Promise<boolean> {
  const { mfaFactors } = await getAdminCollections();
  const result = await mfaFactors.updateOne(
    { _id: input.factorId },
    {
      $set: {
        recoveryCodeHashes: input.hashes,
        updatedAt: input.updatedAt,
      },
    },
    session ? { session } : undefined,
  );

  return result.modifiedCount === 1;
}

export async function deleteAdminMfaFactor(
  userId: ObjectId,
  session?: ClientSession,
): Promise<boolean> {
  const { mfaFactors } = await getAdminCollections();
  const result = await mfaFactors.deleteOne(
    { userId },
    session ? { session } : undefined,
  );
  return result.deletedCount === 1;
}

export async function updateAdminSessionMfaState(input: {
  sessionId: ObjectId;
  accessLevel: AdminSessionAccessLevel;
  mfaVerifiedAt: Date | null;
  recentAuthenticationAt: Date;
}, session?: ClientSession): Promise<boolean> {
  const { sessions } = await getAdminCollections();
  const result = await sessions.updateOne(
    { _id: input.sessionId, revokedAt: null },
    {
      $set: {
        accessLevel: input.accessLevel,
        mfaVerifiedAt: input.mfaVerifiedAt,
        recentAuthenticationAt: input.recentAuthenticationAt,
      },
    },
    session ? { session } : undefined,
  );
  return result.modifiedCount === 1;
}

export async function updateAdminRecentAuthentication(
  input: {
    sessionId: ObjectId;
    authenticatedAt: Date;
  },
  session?: ClientSession,
): Promise<boolean> {
  const { sessions } = await getAdminCollections();
  const result = await sessions.updateOne(
    { _id: input.sessionId, revokedAt: null },
    { $set: { recentAuthenticationAt: input.authenticatedAt } },
    session ? { session } : undefined,
  );
  return result.modifiedCount === 1;
}
export async function deleteAdminMfaChallengesForUser(
  userId: ObjectId,
  session?: ClientSession,
): Promise<void> {
  const { mfaChallenges } = await getAdminCollections();
  await mfaChallenges.deleteMany(
    { userId },
    session ? { session } : undefined,
  );
}

