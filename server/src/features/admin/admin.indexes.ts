import { ADMIN_SCHEMA_VERSION } from "./admin.constants.js";
import { getAdminCollections } from "./admin.collections.js";
import { migrateLegacyAdminRecoveryCodes } from "./admin.recovery.repository.js";
import { initializeAdminSecurityStates } from "./admin.security.repository.js";
import { initializeAdminGovernanceState } from "./admin.governance.repository.js";

let initializationPromise: Promise<void> | null = null;

async function createAdminIndexes(): Promise<void> {
  const {
    sessions,
    auditEvents,
    mfaFactors,
    mfaChallenges,
    recoveryFactors,
    passkeyCredentials,
    passkeyChallenges,
    securityStates,
  } = await getAdminCollections();

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
      {
        name: "admin_sessions_expiry_ttl",
        expireAfterSeconds: 24 * 60 * 60,
      },
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
      {
        name: "admin_mfa_challenge_expiry_ttl",
        expireAfterSeconds: 24 * 60 * 60,
      },
    ),
    recoveryFactors.createIndex(
      { userId: 1 },
      { name: "admin_recovery_factor_user_unique", unique: true },
    ),
    passkeyCredentials.createIndex(
      { credentialId: 1 },
      { name: "admin_passkey_credential_id_unique", unique: true },
    ),
    passkeyCredentials.createIndex(
      { userId: 1, revokedAt: 1, createdAt: 1 },
      { name: "admin_passkey_user_active" },
    ),
    passkeyChallenges.createIndex(
      { publicId: 1 },
      { name: "admin_passkey_challenge_public_id_unique", unique: true },
    ),
    passkeyChallenges.createIndex(
      { userId: 1, purpose: 1, consumedAt: 1, expiresAt: -1 },
      { name: "admin_passkey_challenge_user_purpose" },
    ),
    passkeyChallenges.createIndex(
      { parentMfaChallengeId: 1, consumedAt: 1 },
      {
        name: "admin_passkey_challenge_parent",
        partialFilterExpression: {
          parentMfaChallengeId: { $type: "objectId" },
        },
      },
    ),
    securityStates.createIndex(
      { userId: 1 },
      { name: "admin_security_state_user_unique", unique: true },
    ),
    passkeyChallenges.createIndex(
      { expiresAt: 1 },
      {
        name: "admin_passkey_challenge_expiry_ttl",
        expireAfterSeconds: 24 * 60 * 60,
      },
    ),
  ]);

  await migrateLegacyAdminRecoveryCodes();
  await initializeAdminSecurityStates();
  await initializeAdminGovernanceState();
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
