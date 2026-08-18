import { DATA_RETENTION_POLICY } from "../../config/dataRetention.js";

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

async function prepareUserAuthenticationStorage():
  Promise<void> {
  const { users } =
    await getAuthCollections();

  /*
   * Users created before session support do not yet have lastLoginAt.
   * Backfilling null keeps the stored document shape consistent without
   * inventing a successful login date.
   */
  await users.updateMany(
    {
      lastLoginAt: {
        $exists: false,
      },
    },
    {
      $set: {
        lastLoginAt: null,
      },
    },
  );

  await users.updateMany(
    {
      deactivatedAt: {
        $exists: false,
      },
    },
    {
      $set: {
        deactivatedAt: null,
      },
    },
  );

  await users.updateMany(
    {
      profileImage: {
        $exists: false,
      },
    },
    {
      $set: {
        profileImage: null,
      },
    },
  );
}


async function prepareAuthenticationAuditRetention():
  Promise<void> {
  const { auditEvents } =
    await getAuthCollections();

  await auditEvents.updateMany(
    {
      createdAt: { $type: "date" },
      deleteAt: { $exists: false },
    },
    [
      {
        $set: {
          deleteAt: {
            $add: [
              "$createdAt",
              DATA_RETENTION_POLICY.authAuditSeconds * 1_000,
            ],
          },
        },
      },
    ],
  );
}

async function prepareSessionAuthenticationStorage():
  Promise<void> {
  const { sessions } =
    await getAuthCollections();

  await sessions.updateMany(
    {
      recentAuthenticationAt: {
        $exists: false,
      },
    },
    {
      $set: {
        recentAuthenticationAt: null,
      },
    },
  );
}

async function prepareChallengeRetentionStorage():
  Promise<void> {
  const { challenges } =
    await getAuthCollections();

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

  if (
    await challenges.indexExists(
      LEGACY_CHALLENGE_TTL_INDEX_NAME,
    )
  ) {
    await challenges.dropIndex(
      LEGACY_CHALLENGE_TTL_INDEX_NAME,
    );
  }

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

  await Promise.all([
    prepareUserAuthenticationStorage(),
    prepareSessionAuthenticationStorage(),
    prepareChallengeRetentionStorage(),
    prepareAuthenticationAuditRetention(),
  ]);

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
      {
        key: {
          roles: 1,
          status: 1,
          createdAt: -1,
        },
        name:
          "users_roles_status_created_at",
      },
      {
        key: {
          emailVerifiedAt: 1,
          createdAt: -1,
        },
        name:
          "users_verification_created_at",
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
          userId: 1,
          revokedAt: 1,
          expiresAt: 1,
          createdAt: 1,
        },
        name:
          "auth_sessions_user_active_created_at",
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
      {
        key: {
          deleteAt: 1,
        },
        name:
          "auth_audit_events_delete_at_ttl",
        expireAfterSeconds: 0,
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
          (error) => {
            authenticationStoragePromise =
              null;

            throw error;
          },
        );
  }

  return authenticationStoragePromise;
}
