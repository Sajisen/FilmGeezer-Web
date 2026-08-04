import { ADMIN_SCHEMA_VERSION } from "./admin.constants.js";
import { getAdminCollections } from "./admin.collections.js";

let initializationPromise: Promise<void> | null = null;

async function createAdminIndexes(): Promise<void> {
  const { sessions, auditEvents, mfaFactors, mfaChallenges } =
    await getAdminCollections();

  await sessions.updateMany(
    { schemaVersion: { $ne: ADMIN_SCHEMA_VERSION } },
    [
      {
        $set: {
          schemaVersion: ADMIN_SCHEMA_VERSION,
          accessLevel: { $ifNull: ["$accessLevel", "full"] },
          recentAuthenticationAt: {
            $ifNull: ["$recentAuthenticationAt", "$createdAt"],
          },
          mfaVerifiedAt: { $ifNull: ["$mfaVerifiedAt", null] },
        },
      },
    ],
  );

  await Promise.all([
    sessions.createIndex(
      { tokenHash: 1 },
      { name: "admin_sessions_token_hash_unique", unique: true },
    ),
    sessions.createIndex(
      { userId: 1, revokedAt: 1, expiresAt: -1 },
      { name: "admin_sessions_user_active" },
    ),
    sessions.createIndex(
      { expiresAt: 1 },
      { name: "admin_sessions_expiry_ttl", expireAfterSeconds: 24 * 60 * 60 },
    ),
    auditEvents.createIndex(
      { createdAt: -1 },
      { name: "admin_audit_created_at" },
    ),
    auditEvents.createIndex(
      { actorUserId: 1, createdAt: -1 },
      { name: "admin_audit_actor_created_at" },
    ),
    auditEvents.createIndex(
      { targetUserId: 1, createdAt: -1 },
      { name: "admin_audit_target_created_at" },
    ),
    mfaFactors.createIndex(
      { userId: 1 },
      { name: "admin_mfa_factor_user_unique", unique: true },
    ),
    mfaChallenges.createIndex(
      { publicId: 1 },
      { name: "admin_mfa_challenge_public_id_unique", unique: true },
    ),
    mfaChallenges.createIndex(
      { tokenHash: 1 },
      {
        name: "admin_mfa_challenge_token_hash_unique",
        unique: true,
        partialFilterExpression: { tokenHash: { $type: "string" } },
      },
    ),
    mfaChallenges.createIndex(
      { userId: 1, purpose: 1, consumedAt: 1, expiresAt: -1 },
      { name: "admin_mfa_challenge_user_purpose" },
    ),
    mfaChallenges.createIndex(
      { expiresAt: 1 },
      { name: "admin_mfa_challenge_expiry_ttl", expireAfterSeconds: 24 * 60 * 60 },
    ),
  ]);
}

export function initializeAdminStorage(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = createAdminIndexes().catch((error) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}
