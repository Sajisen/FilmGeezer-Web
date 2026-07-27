import { getAuthCollections } from "./auth.collections.js";

let authenticationStoragePromise: Promise<void> | null = null;

async function createAuthenticationIndexes(): Promise<void> {
  const {
    users,
    identities,
    credentials,
    sessions,
    challenges,
    auditEvents,
  } = await getAuthCollections();

  await Promise.all([
    users.createIndexes([
      {
        key: {
          emailNormalized: 1,
        },
        name: "users_email_normalized_unique",
        unique: true,
      },
      {
        key: {
          status: 1,
          createdAt: -1,
        },
        name: "users_status_created_at",
      },
    ]),

    identities.createIndexes([
      {
        key: {
          provider: 1,
          providerSubject: 1,
        },
        name: "auth_identities_provider_subject_unique",
        unique: true,
      },
      {
        key: {
          userId: 1,
          provider: 1,
        },
        name: "auth_identities_user_provider_unique",
        unique: true,
      },
    ]),

    credentials.createIndexes([
      {
        key: {
          userId: 1,
        },
        name: "auth_credentials_user_unique",
        unique: true,
      },
    ]),

    sessions.createIndexes([
      {
        key: {
          tokenHash: 1,
        },
        name: "auth_sessions_token_hash_unique",
        unique: true,
      },
      {
        key: {
          userId: 1,
          revokedAt: 1,
          expiresAt: 1,
        },
        name: "auth_sessions_user_active_lookup",
      },
      {
        key: {
          expiresAt: 1,
        },
        name: "auth_sessions_expires_at_ttl",
        expireAfterSeconds: 0,
      },
      {
        key: {
          userId: 1,
          createdAt: -1,
        },
        name: "auth_sessions_user_created_at",
      },
    ]),

    challenges.createIndexes([
      {
        key: {
          secretHash: 1,
        },
        name: "auth_challenges_secret_hash_unique",
        unique: true,
      },
      {
        key: {
          userId: 1,
          purpose: 1,
        },
        name: "auth_challenges_one_active_per_purpose",
        unique: true,
        partialFilterExpression: {
          consumedAt: null,
          invalidatedAt: null,
        },
      },
      {
        key: {
          userId: 1,
          purpose: 1,
          createdAt: -1,
        },
        name: "auth_challenges_user_purpose_created_at",
      },
      {
        key: {
          expiresAt: 1,
        },
        name: "auth_challenges_expires_at_ttl",
        expireAfterSeconds: 0,
      },
    ]),

    auditEvents.createIndexes([
      {
        key: {
          userId: 1,
          createdAt: -1,
        },
        name: "auth_audit_events_user_created_at",
      },
      {
        key: {
          eventType: 1,
          createdAt: -1,
        },
        name: "auth_audit_events_type_created_at",
      },
      {
        key: {
          createdAt: -1,
        },
        name: "auth_audit_events_created_at",
      },
    ]),
  ]);
}

export function initializeAuthStorage(): Promise<void> {
  if (!authenticationStoragePromise) {
    authenticationStoragePromise =
      createAuthenticationIndexes().catch((error) => {
        authenticationStoragePromise = null;
        throw error;
      });
  }

  return authenticationStoragePromise;
}