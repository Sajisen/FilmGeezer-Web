import { ObjectId, type ClientSession } from "mongodb";

import { ADMIN_SCHEMA_VERSION } from "./admin.constants.js";
import { getAdminCollections } from "./admin.collections.js";

/**
 * Every transaction that adds or removes a strong administrator factor writes
 * the same per-user document. This converts otherwise independent TOTP and
 * passkey documents into one serialized security boundary and prevents a
 * concurrent pair of removals from both observing an outdated factor count.
 */
export async function bumpAdminSecurityRevision(input: {
  userId: ObjectId;
  changedAt: Date;
  session: ClientSession;
}): Promise<void> {
  const { securityStates } = await getAdminCollections();

  await securityStates.updateOne(
    { userId: input.userId },
    {
      $inc: { factorRevision: 1 },
      $set: {
        schemaVersion: ADMIN_SCHEMA_VERSION,
        updatedAt: input.changedAt,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        userId: input.userId,
        createdAt: input.changedAt,
      },
    },
    { upsert: true, session: input.session },
  );
}

/**
 * Backfills the shared revision document for administrators who already had a
 * TOTP factor before passkeys were introduced. Active passkey owners are also
 * included so all later factor mutations share the same write-conflict guard.
 */
export async function initializeAdminSecurityStates(): Promise<void> {
  const { mfaFactors, passkeyCredentials, securityStates } =
    await getAdminCollections();
  const [totpFactorOwners, activePasskeyOwners] = await Promise.all([
    mfaFactors
      .find({}, { projection: { _id: 0, userId: 1 } })
      .toArray(),
    passkeyCredentials
      .find(
        { revokedAt: null },
        { projection: { _id: 0, userId: 1 } },
      )
      .toArray(),
  ]);
  const byHexId = new Map<string, ObjectId>();

  for (const owner of [...totpFactorOwners, ...activePasskeyOwners]) {
    byHexId.set(owner.userId.toHexString(), owner.userId);
  }

  if (byHexId.size === 0) {
    return;
  }

  const initializedAt = new Date();
  await securityStates.bulkWrite(
    [...byHexId.values()].map((userId) => ({
      updateOne: {
        filter: { userId },
        update: {
          $setOnInsert: {
            _id: new ObjectId(),
            schemaVersion: ADMIN_SCHEMA_VERSION,
            userId,
            factorRevision: 0,
            createdAt: initializedAt,
            updatedAt: initializedAt,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );
}