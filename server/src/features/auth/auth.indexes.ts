import {
  AUTH_EMAIL_VERIFICATION_POLICY,
} from "./auth.constants.js";

import {
  getAuthCollections,
} from "./auth.collections.js";

let authenticationStoragePromise:
  Promise<void> | null = null;

const LEGACY_CHALLENGE_TTL_INDEX_NAME =
  "auth_challenges_expires_at_ttl";

async function prepareChallengeRetentionStorage():
  Promise<void> {
  const {
    challenges,
  } = await getAuthCollections();

  /*
   * Ensure the collection exists before inspecting its indexes. Index
   * creation is idempotent and also preserves the existing unique public
   * challenge identifier rule.
   */
  await challenges.createIndex(
    {
      publicId: 1,
    },
    {
      name:
        "auth_challenges_public_id_unique",

      unique: true,
    },
  );

  /*
   * Earlier versions deleted challenges at expiresAt. Resend now needs
   * the unguessable public ID to remain available briefly after expiry,
   * so validity and physical deletion use separate timestamps.
   */
  if (
    await challenges.indexExists(
      LEGACY_CHALLENGE_TTL_INDEX_NAME,
    )
  ) {
    await challenges.dropIndex(
      LEGACY_CHALLENGE_TTL_INDEX_NAME,
    );
  }

  /*
   * Existing challenge documents do not yet have deleteAt. The update
   * pipeline keeps them for the same retention period as new documents.
   */
  await challenges.updateMany(
    {
      deleteAt: {
        $exists: false,
      },
    },
    [
      {
        $set: {
          deleteAt: {
            $add: [
              "$expiresAt",

              AUTH_EMAIL_VERIFICATION_POLICY
                .retentionAfterExpiryMilliseconds,
            ],
          },
        },
      },
    ],
  );
}

async function createAuthenticationIndexes():
  Promise<void> {
  const {
    users,
    identities,
    credentials,
    sessions,
    challenges,
    auditEvents,
  } = await getAuthCollections();

  await prepareChallengeRetentionStorage();

  await Promise.all([
    users.createIndexes([
      {
        key: {
          emailNormalized: 1,
        },

        name:
          "users_email_normalized_unique",

        unique: true,
      },
      {
        key: {
          status: 1,
          createdAt: -1,
        },

        name:
          "users_status_created_at",
      },
    ]),

    identities.createIndexes([
      {
        key: {
          provider: 1,
          providerSubject: 1,
        },

        name:
          "auth_identities_provider_subject_unique",

        unique: true,
      },
      {
        key: {
          userId: 1,
          provider: 1,
        },

        name:
          "auth_identities_user_provider_unique",

        unique: true,
      },
    ]),

    credentials.createIndexes([
      {
        key: {
          userId: 1,
        },

        name:
          "auth_credentials_user_unique",

        unique: true,
      },
    ]),

    sessions.createIndexes([
      {
        key: {
          tokenHash: 1,
        },

        name:
          "auth_sessions_token_hash_unique",

        unique: true,
      },
      {
        key: {
          userId: 1,
          revokedAt: 1,
          expiresAt: 1,
        },

        name:
          "auth_sessions_user_active_lookup",
      },
      {
        key: {
          expiresAt: 1,
        },

        name:
          "auth_sessions_expires_at_ttl",

        expireAfterSeconds: 0,
      },
      {
        key: {
          userId: 1,
          createdAt: -1,
        },

        name:
          "auth_sessions_user_created_at",
      },
    ]),

    challenges.createIndexes([
      {
        key: {
          publicId: 1,
        },

        name:
          "auth_challenges_public_id_unique",

        unique: true,
      },
      {
        key: {
          secretHash: 1,
        },

        name:
          "auth_challenges_secret_hash_unique",

        unique: true,
      },
      {
        key: {
          userId: 1,
          purpose: 1,
        },

        name:
          "auth_challenges_one_active_per_purpose",

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

        name:
          "auth_challenges_user_purpose_created_at",
      },
      {
        key: {
          deleteAt: 1,
        },

        name:
          "auth_challenges_delete_at_ttl",

        expireAfterSeconds: 0,
      },
    ]),

    auditEvents.createIndexes([
      {
        key: {
          userId: 1,
          createdAt: -1,
        },

        name:
          "auth_audit_events_user_created_at",
      },
      {
        key: {
          eventType: 1,
          createdAt: -1,
        },

        name:
          "auth_audit_events_type_created_at",
      },
      {
        key: {
          createdAt: -1,
        },

        name:
          "auth_audit_events_created_at",
      },
    ]),
  ]);
}

export function initializeAuthStorage():
  Promise<void> {
  if (!authenticationStoragePromise) {
    authenticationStoragePromise =
      createAuthenticationIndexes()
        .catch(
          (
            error,
          ) => {
            authenticationStoragePromise =
              null;

            throw error;
          },
        );
  }

  return authenticationStoragePromise;
}