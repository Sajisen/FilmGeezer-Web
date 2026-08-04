import {
  ObjectId,
  type ClientSession,
} from "mongodb";

import { ADMIN_SCHEMA_VERSION } from "./admin.constants.js";
import { getAdminCollections } from "./admin.collections.js";
import type {
  AdminPasskeyAttachment,
  AdminPasskeyChallengeDocument,
  AdminPasskeyChallengePurpose,
  AdminPasskeyCredentialDocument,
} from "./admin.types.js";

export async function listActiveAdminPasskeys(
  userId: ObjectId,
  session?: ClientSession,
): Promise<AdminPasskeyCredentialDocument[]> {
  const { passkeyCredentials } = await getAdminCollections();

  return passkeyCredentials
    .find(
      { userId, revokedAt: null },
      session ? { session } : undefined,
    )
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
}

export async function countActiveAdminPasskeys(
  userId: ObjectId,
  session?: ClientSession,
): Promise<number> {
  const { passkeyCredentials } = await getAdminCollections();

  return passkeyCredentials.countDocuments(
    { userId, revokedAt: null },
    session ? { session } : undefined,
  );
}

export async function findAdminPasskeyByCredentialId(
  credentialId: string,
  session?: ClientSession,
): Promise<AdminPasskeyCredentialDocument | null> {
  const { passkeyCredentials } = await getAdminCollections();

  return passkeyCredentials.findOne(
    { credentialId },
    session ? { session } : undefined,
  );
}

export async function findActiveAdminPasskeyByCredentialId(input: {
  userId: ObjectId;
  credentialId: string;
}, session?: ClientSession): Promise<AdminPasskeyCredentialDocument | null> {
  const { passkeyCredentials } = await getAdminCollections();

  return passkeyCredentials.findOne(
    {
      userId: input.userId,
      credentialId: input.credentialId,
      revokedAt: null,
    },
    session ? { session } : undefined,
  );
}

export async function createAdminPasskeyCredential(input: {
  credentialIdDocument: ObjectId;
  userId: ObjectId;
  credentialId: string;
  publicKeyBase64: string;
  counter: number;
  transports: string[];
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  label: string;
  attachment: AdminPasskeyAttachment;
  createdAt: Date;
}, session?: ClientSession): Promise<AdminPasskeyCredentialDocument> {
  const { passkeyCredentials } = await getAdminCollections();

  const document: AdminPasskeyCredentialDocument = {
    _id: input.credentialIdDocument,
    schemaVersion: ADMIN_SCHEMA_VERSION,
    userId: input.userId,
    credentialId: input.credentialId,
    publicKeyBase64: input.publicKeyBase64,
    counter: input.counter,
    transports: [...input.transports],
    deviceType: input.deviceType,
    backedUp: input.backedUp,
    label: input.label,
    attachment: input.attachment,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    lastUsedAt: null,
    revokedAt: null,
  };

  await passkeyCredentials.insertOne(
    document,
    session ? { session } : undefined,
  );

  return document;
}

export async function updateAdminPasskeyUsage(input: {
  credentialDocumentId: ObjectId;
  userId: ObjectId;
  expectedCounter: number;
  newCounter: number;
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  usedAt: Date;
}, session?: ClientSession): Promise<boolean> {
  const { passkeyCredentials } = await getAdminCollections();

  const result = await passkeyCredentials.updateOne(
    {
      _id: input.credentialDocumentId,
      userId: input.userId,
      revokedAt: null,
      counter: input.expectedCounter,
    },
    {
      $set: {
        counter: input.newCounter,
        deviceType: input.deviceType,
        backedUp: input.backedUp,
        lastUsedAt: input.usedAt,
        updatedAt: input.usedAt,
      },
    },
    session ? { session } : undefined,
  );

  return result.modifiedCount === 1;
}

export async function revokeAdminPasskeyCredential(input: {
  userId: ObjectId;
  credentialId: string;
  revokedAt: Date;
}, session?: ClientSession): Promise<boolean> {
  const { passkeyCredentials } = await getAdminCollections();

  const result = await passkeyCredentials.updateOne(
    {
      userId: input.userId,
      credentialId: input.credentialId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: input.revokedAt,
        updatedAt: input.revokedAt,
      },
    },
    session ? { session } : undefined,
  );

  return result.modifiedCount === 1;
}

export async function deleteAllAdminPasskeysForUser(
  userId: ObjectId,
  session?: ClientSession,
): Promise<number> {
  const { passkeyCredentials } = await getAdminCollections();
  const result = await passkeyCredentials.deleteMany(
    { userId },
    session ? { session } : undefined,
  );
  return result.deletedCount;
}

export async function createAdminPasskeyChallenge(input: {
  challengeDocumentId: ObjectId;
  publicId: string;
  purpose: AdminPasskeyChallengePurpose;
  userId: ObjectId;
  sessionId: ObjectId | null;
  parentMfaChallengeId: ObjectId | null;
  challenge: string;
  label: string | null;
  attachment: AdminPasskeyAttachment | null;
  maximumAttempts: number;
  ipHash: string | null;
  userAgentSummary: string | null;
  createdAt: Date;
  expiresAt: Date;
}): Promise<AdminPasskeyChallengeDocument> {
  const { passkeyChallenges } = await getAdminCollections();

  const document: AdminPasskeyChallengeDocument = {
    _id: input.challengeDocumentId,
    schemaVersion: ADMIN_SCHEMA_VERSION,
    publicId: input.publicId,
    purpose: input.purpose,
    userId: input.userId,
    sessionId: input.sessionId,
    parentMfaChallengeId: input.parentMfaChallengeId,
    challenge: input.challenge,
    label: input.label,
    attachment: input.attachment,
    attemptCount: 0,
    maximumAttempts: input.maximumAttempts,
    ipHash: input.ipHash,
    userAgentSummary: input.userAgentSummary,
    createdAt: input.createdAt,
    expiresAt: input.expiresAt,
    consumedAt: null,
  };

  await passkeyChallenges.insertOne(document);
  return document;
}

export async function invalidateOpenAdminPasskeyChallenges(input: {
  userId: ObjectId;
  purpose: AdminPasskeyChallengePurpose;
  invalidatedAt: Date;
  sessionId?: ObjectId;
  parentMfaChallengeId?: ObjectId;
}): Promise<void> {
  const { passkeyChallenges } = await getAdminCollections();

  await passkeyChallenges.updateMany(
    {
      userId: input.userId,
      purpose: input.purpose,
      consumedAt: null,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.parentMfaChallengeId
        ? { parentMfaChallengeId: input.parentMfaChallengeId }
        : {}),
    },
    { $set: { consumedAt: input.invalidatedAt } },
  );
}

export async function findAdminPasskeyChallenge(input: {
  publicId: string;
  purpose: AdminPasskeyChallengePurpose;
  userId: ObjectId;
  sessionId?: ObjectId;
  parentMfaChallengeId?: ObjectId;
}): Promise<AdminPasskeyChallengeDocument | null> {
  const { passkeyChallenges } = await getAdminCollections();

  return passkeyChallenges.findOne({
    publicId: input.publicId,
    purpose: input.purpose,
    userId: input.userId,
    ...(input.sessionId ? { sessionId: input.sessionId } : {}),
    ...(input.parentMfaChallengeId
      ? { parentMfaChallengeId: input.parentMfaChallengeId }
      : {}),
  });
}

export async function recordAdminPasskeyChallengeFailure(input: {
  challengeId: ObjectId;
  checkedAt: Date;
}): Promise<number> {
  const { passkeyChallenges } = await getAdminCollections();

  const result = await passkeyChallenges.findOneAndUpdate(
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
    await passkeyChallenges.updateOne(
      { _id: result._id, consumedAt: null },
      { $set: { consumedAt: input.checkedAt } },
    );
  }

  return remaining;
}

export async function consumeAdminPasskeyChallenge(
  challengeId: ObjectId,
  consumedAt: Date,
  session?: ClientSession,
): Promise<boolean> {
  const { passkeyChallenges } = await getAdminCollections();
  const result = await passkeyChallenges.updateOne(
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

export async function deleteAdminPasskeyChallengesForUser(
  userId: ObjectId,
  session?: ClientSession,
): Promise<void> {
  const { passkeyChallenges } = await getAdminCollections();
  await passkeyChallenges.deleteMany(
    { userId },
    session ? { session } : undefined,
  );
}
