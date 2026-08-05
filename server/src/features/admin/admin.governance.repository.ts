import type { ClientSession } from "mongodb";

import { getAdminCollections } from "./admin.collections.js";
import { ADMIN_SCHEMA_VERSION } from "./admin.constants.js";

export const ADMIN_MEMBERSHIP_GOVERNANCE_ID =
  "administrator-membership" as const;

export async function initializeAdminGovernanceState(): Promise<void> {
  const { governanceStates } = await getAdminCollections();
  const now = new Date();

  await governanceStates.updateOne(
    { _id: ADMIN_MEMBERSHIP_GOVERNANCE_ID },
    {
      $setOnInsert: {
        schemaVersion: ADMIN_SCHEMA_VERSION,
        revision: 0,
        createdAt: now,
      },
      $set: {
        updatedAt: now,
      },
    },
    { upsert: true },
  );
}

export async function touchAdminMembershipGovernanceState(
  changedAt: Date,
  session: ClientSession,
): Promise<void> {
  const { governanceStates } = await getAdminCollections();

  await governanceStates.updateOne(
    { _id: ADMIN_MEMBERSHIP_GOVERNANCE_ID },
    {
      $inc: { revision: 1 },
      $set: {
        schemaVersion: ADMIN_SCHEMA_VERSION,
        updatedAt: changedAt,
      },
      $setOnInsert: {
        createdAt: changedAt,
      },
    },
    {
      upsert: true,
      session,
    },
  );
}
