import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  AUTH_EMAIL_VERIFICATION_POLICY,
} from "./auth.constants.js";

import {
  AuthEmailVerificationRequiredError,
  AuthInvalidCredentialsError,
  AuthPersistenceError,
} from "./auth.errors.js";

import {
  initializeAuthStorage,
} from "./auth.indexes.js";

import {
  hashPassword,
  passwordHashNeedsRehash,
  verifyPassword,
} from "./auth.password.js";

import {
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  type AuthRequestMetadata,
} from "./auth.session.js";

import {
  createLocalAuthSessionResult,
  createPreparedLocalAuthSession,
  prepareLocalAuthSession,
  type LocalAuthSessionResult,
} from "./auth.session-creation.service.js";

import {
  parseLoginInput,
  type LoginInput,
} from "./auth.validation.js";

import type {
  AuthChallengeDocument,
} from "./auth.types.js";

import {
  createAuthAuditEvent,
} from "./repositories/authAudit.repository.js";

import {
  findLatestEmailVerificationChallengeForUser,
} from "./repositories/authChallenge.repository.js";

import {
  findAuthCredentialByUserId,
  replaceCredentialPasswordHash,
} from "./repositories/authCredential.repository.js";

import {
  findAuthIdentityByUserAndProvider,
} from "./repositories/authIdentity.repository.js";

import {
  findUserByNormalizedEmail,
  recordSuccessfulLogin,
} from "./repositories/authUser.repository.js";

const LOGIN_TRANSACTION_OPTIONS:
  TransactionOptions = {
    readPreference: "primary",

    readConcern: {
      level: "snapshot",
    },

    writeConcern: {
      w: "majority",
    },

    maxCommitTimeMS: 5_000,
  };

/*
 * Unknown accounts are verified against a real Argon2id hash so the
 * expensive password-verification step is not skipped. The plaintext
 * used to create this one-way dummy hash is not an account credential.
 */
const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$7fff7cXpK6SzkykonWnjuw$2AOO6h2HthwHj1nH4H6zkts//9OsIVzCyQ94lwre9ic";

export type LocalLoginResult =
  LocalAuthSessionResult;

async function recordLoginFailure(
  input: {
    userId: ObjectId | null;
    reason: string;
    ipHash: string | null;
    userAgentSummary: string | null;
    createdAt: Date;
  },
): Promise<void> {
  try {
    await createAuthAuditEvent({
      auditEventId:
        new ObjectId(),

      userId:
        input.userId,

      eventType:
        "login-failed",

      outcome:
        "failure",

      ipHash:
        input.ipHash,

      userAgentSummary:
        input.userAgentSummary,

      details: {
        reason:
          input.reason,
      },

      createdAt:
        input.createdAt,
    });
  } catch (error) {
    /*
     * Authentication has already failed. A secondary audit failure must
     * not change the public result or expose database details.
     */
    console.error(
      "[auth-login] Failed-login audit could not be recorded.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

function createVerificationRequiredReceipt(
  challenge:
    AuthChallengeDocument | null,
) {
  if (!challenge) {
    return {
      challengeId: null,
      expiresAt: null,
      resendAvailableAt: null,
    };
  }

  return {
    challengeId:
      challenge.publicId,

    expiresAt:
      challenge.expiresAt,

    resendAvailableAt:
      challenge.lastSentAt
        ? new Date(
            challenge.lastSentAt.getTime() +
              AUTH_EMAIL_VERIFICATION_POLICY
                .resendCooldownMilliseconds,
          )
        : null,
  };
}

export async function loginLocalUser(
  input: LoginInput,
  requestMetadata: AuthRequestMetadata,
): Promise<LocalLoginResult> {
  const login =
    parseLoginInput(input);

  await initializeAuthStorage();

  const attemptedAt =
    new Date();

  const ipHash =
    hashAuthIpAddress(
      requestMetadata.ipAddress,
    );

  const userAgentSummary =
    summarizeAuthUserAgent(
      requestMetadata.userAgent,
    );

  const user =
    await findUserByNormalizedEmail(
      login.emailNormalized,
    );

  const credential = user
    ? await findAuthCredentialByUserId(
        user._id,
      )
    : null;

  let passwordIsValid: boolean;

  try {
    passwordIsValid =
      await verifyPassword(
        credential?.passwordHash ??
          DUMMY_PASSWORD_HASH,
        login.password,
      );
  } catch (error) {
    throw new AuthPersistenceError(
      "The local credential could not be verified.",
      {
        cause: error,
      },
    );
  }

  if (
    !user ||
    !credential ||
    !passwordIsValid
  ) {
    await recordLoginFailure({
      userId:
        user?._id ?? null,
      reason:
        "invalid-credentials",
      ipHash,
      userAgentSummary,
      createdAt:
        attemptedAt,
    });

    throw new AuthInvalidCredentialsError();
  }

  if (
    user.status === "pending" &&
    user.emailVerifiedAt === null &&
    user.suspendedAt === null &&
    user.deletedAt === null
  ) {
    const latestChallenge =
      await findLatestEmailVerificationChallengeForUser(
        user._id,
      );

    await recordLoginFailure({
      userId: user._id,
      reason:
        "email-verification-required",
      ipHash,
      userAgentSummary,
      createdAt:
        attemptedAt,
    });

    throw new AuthEmailVerificationRequiredError(
      createVerificationRequiredReceipt(
        latestChallenge,
      ),
    );
  }

  if (
    user.status !== "active" ||
    user.emailVerifiedAt === null ||
    user.suspendedAt !== null ||
    user.deletedAt !== null
  ) {
    await recordLoginFailure({
      userId: user._id,
      reason:
        "account-unavailable",
      ipHash,
      userAgentSummary,
      createdAt:
        attemptedAt,
    });

    /*
     * Suspended and deleted account states are not disclosed by the
     * public login endpoint.
     */
    throw new AuthInvalidCredentialsError();
  }

  const identity =
    await findAuthIdentityByUserAndProvider(
      user._id,
      "local",
    );

  if (!identity) {
    throw new AuthPersistenceError(
      "The local authentication identity could not be found.",
    );
  }

  const replacementPasswordHash =
    passwordHashNeedsRehash(
      credential.passwordHash,
    )
      ? await hashPassword(
          login.password,
        )
      : null;

  const preparedSession =
    prepareLocalAuthSession(
      requestMetadata,
      attemptedAt,
    );

  const loginAuditEventId =
    new ObjectId();

  const client =
    await getMongoClient();

  const mongoSession =
    client.startSession();

  try {
    const result =
      await mongoSession.withTransaction(
        async () => {
          const userWasUpdated =
            await recordSuccessfulLogin(
              {
                userId: user._id,
                loggedInAt:
                  attemptedAt,
              },
              mongoSession,
            );

          if (!userWasUpdated) {
            throw new AuthInvalidCredentialsError();
          }

          const sessionsRevokedForLimit =
            await createPreparedLocalAuthSession(
              user._id,
              preparedSession,
              mongoSession,
            );

          if (replacementPasswordHash) {
            const hashWasReplaced =
              await replaceCredentialPasswordHash(
                {
                  credentialId:
                    credential._id,
                  userId:
                    user._id,
                  passwordHash:
                    replacementPasswordHash,
                  updatedAt:
                    attemptedAt,
                },
                mongoSession,
              );

            if (!hashWasReplaced) {
              throw new AuthPersistenceError(
                "The local credential hash could not be upgraded.",
              );
            }
          }

          await createAuthAuditEvent(
            {
              auditEventId:
                loginAuditEventId,

              userId: user._id,

              eventType:
                "login-succeeded",

              outcome:
                "success",

              ipHash,
              userAgentSummary,

              details: {
                provider: "local",

                passwordHashReplaced:
                  replacementPasswordHash !==
                  null,

                sessionsRevokedForLimit,
              },

              createdAt:
                attemptedAt,
            },
            mongoSession,
          );

          return createLocalAuthSessionResult(
            user,
            preparedSession,
          );
        },
        LOGIN_TRANSACTION_OPTIONS,
      );

    if (!result) {
      throw new AuthPersistenceError(
        "Login completed without returning a session.",
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof
        AuthInvalidCredentialsError ||
      error instanceof
        AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The FilmGeezer session could not be created.",
      {
        cause: error,
      },
    );
  } finally {
    await mongoSession.endSession();
  }
}
