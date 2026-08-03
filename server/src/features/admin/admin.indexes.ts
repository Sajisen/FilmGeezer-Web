import { getAdminCollections } from "./admin.collections.js";

let initializationPromise: Promise<void> | null = null;

async function createAdminIndexes(): Promise<void> {
  const { sessions, auditEvents } = await getAdminCollections();

  await Promise.all([
    sessions.createIndex(
      { tokenHash: 1 },
      {
        name: "admin_sessions_token_hash_unique",
        unique: true,
      },
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