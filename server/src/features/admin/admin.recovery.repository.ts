import {
  ObjectId,
  type ClientSession,
} from "mongodb";

import { getMongoClient } from "../../config/database.js";
import { ADMIN_SCHEMA_VERSION } from "./admin.constants.js";
import { getAdminCollections } from "./admin.collections.js";
import type {
  AdminRecoveryFactorDocument,
} from "./admin.types.js";

export async function findAdminRecoveryFactorByUserId(
  userId: ObjectId,
  session?: ClientSession,
): Promise<AdminRecoveryFactorDocument | null> {
  const { recoveryFactors } = await getAdminCollections();

  return recoveryFactors.findOne(
    { userId },
    session ? { session } : undefined,
  );
}

export async function replaceAdminRecoveryFactorCodes(input: {
  userId: ObjectId;
  hashes: string[];
  updatedAt: Date;
}, session?: ClientSession): Promise<void> {
  const { recoveryFactors } = await getAdminCollections();

  await recoveryFactors.updateOne(
    { userId: input.userId },
    {
      $set: {
        recoveryCodeHashes: input.hashes,
        updatedAt: input.updatedAt,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        schemaVersion: ADMIN_SCHEMA_VERSION,
        userId: input.userId,
        createdAt: input.updatedAt,
      },
    },
    {
      upsert: true,
      ...(session ? { session } : {}),
    },
  );
}

export async function consumeAdminRecoveryFactorCode(input: {
  userId: ObjectId;
  recoveryCodeHash: string;
  consumedAt: Date;
}, session?: ClientSession): Promise<boolean> {
  const { recoveryFactors } = await getAdminCollections();

  const result = await recoveryFactors.updateOne(
    {
      userId: input.userId,
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

export async function deleteAdminRecoveryFactor(
  userId: ObjectId,
  session?: ClientSession,
): Promise<void> {
  const { recoveryFactors } = await getAdminCollections();
  await recoveryFactors.deleteOne(
    { userId },
    session ? { session } : undefined,
  );
}

/**
 * Moves legacy recovery hashes out of the TOTP document.  The operation is
 * deliberately idempotent: an existing dedicated record always wins, then
 * the legacy copy is cleared so a consumed code can never reappear if a
 * future read falls back to an old TOTP document.
 */
export async function migrateLegacyAdminRecoveryCodes(): Promise<void> {
  const { mfaFactors, recoveryFactors } = await getAdminCollections();
  const legacyFactors = await mfaFactors
    .find(
      { "recoveryCodeHashes.0": { $exists: true } },
      {
        projection: {
          userId: 1,
          recoveryCodeHashes: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    )
    .toArray();

  if (legacyFactors.length === 0) {
    return;
  }

  const client = await getMongoClient();

  for (const factor of legacyFactors) {
    const session = client.startSession();

    try {
      await session.withTransaction(async () => {
        await recoveryFactors.updateOne(
          { userId: factor.userId },
          {
            $setOnInsert: {
              _id: new ObjectId(),
              schemaVersion: ADMIN_SCHEMA_VERSION,
              userId: factor.userId,
              recoveryCodeHashes: factor.recoveryCodeHashes,
              createdAt: factor.createdAt,
              updatedAt: factor.updatedAt,
            },
          },
          { upsert: true, session },
        );

        const dedicated = await recoveryFactors.findOne(
          { userId: factor.userId },
          { projection: { _id: 1 }, session },
        );

        if (!dedicated) {
          throw new Error("Administrator recovery-code migration failed.");
        }

        await mfaFactors.updateOne(
          { _id: factor._id },
          {
            $set: {
              recoveryCodeHashes: [],
              updatedAt: new Date(),
            },
          },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
  }
}
