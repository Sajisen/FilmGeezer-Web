import { randomUUID } from "node:crypto";

import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  AUTH_RECENT_AUTHENTICATION_POLICY,
} from "../auth/auth.constants.js";

import {
  sendPasswordAddedNoticeEmail,
  sendPasswordChangedNoticeEmail,
} from "../auth/auth.email.js";

import {
  AuthCurrentPasswordInvalidError,
  AuthPasswordAlreadyConfiguredError,
  AuthPasswordReuseError,
  AuthPersistenceError,
  AuthWeakPasswordError,
  isMongoDuplicateKeyError,
} from "../auth/auth.errors.js";

import {
  assessPasswordQuality,
} from "../auth/auth.password-quality.js";

import {
  hashPassword,
  verifyPassword,
} from "../auth/auth.password.js";

import {
  createAuthSessionResult,
  createPreparedAuthSession,
  prepareAuthSession,
  type AuthSessionResult,
} from "../auth/auth.session-creation.service.js";

import {
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  type AuthRequestMetadata,
} from "../auth/auth.session.js";

import type {
  AuthProvider,
  AuthRole,
  FilmGeezerUserDocument,
} from "../auth/auth.types.js";

import {
  parseAccountPasswordChangeInput,
  parseAccountProfileUpdateInput,
  parseRecentAuthenticationInput,
  type AccountPasswordChangeInput,
  type AccountProfileUpdateInput,
  type RecentAuthenticationInput,
} from "../auth/auth.validation.js";

import {
  createAuthAuditEvent,
} from "../auth/repositories/authAudit.repository.js";

import {
  createAuthCredential,
  findAuthCredentialByUserId,
  resetCredentialPassword,
} from "../auth/repositories/authCredential.repository.js";

import {
  createAuthIdentity,
  findAuthIdentityByUserAndProvider,
} from "../auth/repositories/authIdentity.repository.js";

import {
  recordRecentAuthentication,
  revokeAllActiveAuthSessions,
} from "../auth/repositories/authSession.repository.js";

import {
  findActiveUserById,
  recordSessionMutation,
  updateActiveUserDisplayName,
} from "../auth/repositories/authUser.repository.js";

import type {
  AuthenticatedSessionContext,
} from "../auth/auth.session.service.js";

import {
  createProfileImagePath,
} from "../profile-image/profileImage.path.js";

const ACCOUNT_MUTATION_TRANSACTION_OPTIONS:
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

export interface AccountUserSummary {
  userId: string;
  provider: AuthProvider;
  email: string;
  displayName: string;
  profileImagePath: string | null;
  roles: AuthRole[];
  emailVerifiedAt: Date;
  memberSince: Date;
  lastLoginAt: Date | null;
}

export interface AccountDetailsResult {
  account: AccountUserSummary;

  security: {
    passwordConfigured: boolean;
    passwordChangedAt: Date | null;
    googleConnected: boolean;
    googleEmail: string | null;
    recentAuthenticationExpiresAt: Date | null;
  };

  session: {
    createdAt: Date;
    lastSeenAt: Date;
    idleExpiresAt: Date;
    expiresAt: Date;
  };
}

export interface RecentAuthenticationResult {
  confirmedAt: Date;
  expiresAt: Date;
}

export interface AccountProfileUpdateResult {
  user: {
    userId: string;
    provider: AuthProvider;
    email: string;
    displayName: string;
    profileImagePath: string | null;
    roles: AuthRole[];
  };

  changed: boolean;
}

export interface AccountPasswordChangeResult
  extends AuthSessionResult {
  changedAt: Date;
  sessionsRevoked: number;
}

export interface AccountPasswordAddResult {
  addedAt: Date;
}

function createAccountUserSummary(
  user: FilmGeezerUserDocument,
  provider: AuthProvider,
): AccountUserSummary {
  if (!user.emailVerifiedAt) {
    throw new AuthPersistenceError(
      "The active account is missing its verification date.",
    );
  }

  return {
    userId: user._id.toHexString(),
    provider,
    email: user.emailDisplay,
    displayName: user.displayName,
    profileImagePath:
      createProfileImagePath(user),
    roles: [...user.roles],
    emailVerifiedAt: user.emailVerifiedAt,
    memberSince: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function createRecentAuthenticationExpiry(
  confirmedAt: Date | null,
): Date | null {
  if (!confirmedAt) {
    return null;
  }

  const expiresAt = new Date(
    confirmedAt.getTime() +
      AUTH_RECENT_AUTHENTICATION_POLICY
        .validForMilliseconds,
  );

  return expiresAt.getTime() > Date.now()
    ? expiresAt
    : null;
}

function createAuditMetadata(
  requestMetadata: AuthRequestMetadata,
) {
  return {
    ipHash: hashAuthIpAddress(
      requestMetadata.ipAddress,
    ),

    userAgentSummary:
      summarizeAuthUserAgent(
        requestMetadata.userAgent,
      ),
  };
}

export async function getAccountDetails(
  auth: AuthenticatedSessionContext,
): Promise<AccountDetailsResult> {
  const [user, credential, googleIdentity] =
    await Promise.all([
      findActiveUserById(auth.userId),
      findAuthCredentialByUserId(
        auth.userId,
      ),
      findAuthIdentityByUserAndProvider(
        auth.userId,
        "google",
      ),
    ]);

  if (!user) {
    throw new AuthPersistenceError(
      "The FilmGeezer account details could not be loaded.",
    );
  }

  return {
    account:
      createAccountUserSummary(
        user,
        auth.provider,
      ),

    security: {
      passwordConfigured:
        credential !== null,

      passwordChangedAt:
        credential?.passwordChangedAt ??
        null,

      googleConnected:
        googleIdentity !== null,

      googleEmail:
        googleIdentity?.providerEmailDisplay ?? null,

      recentAuthenticationExpiresAt:
        createRecentAuthenticationExpiry(
          auth.recentAuthenticationAt,
        ),
    },

    session: {
      createdAt: auth.createdAt,
      lastSeenAt: auth.lastSeenAt,
      idleExpiresAt:
        auth.idleExpiresAt,
      expiresAt: auth.expiresAt,
    },
  };
}

export async function confirmAccountPassword(
  input: RecentAuthenticationInput,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
): Promise<RecentAuthenticationResult> {
  const parsedInput =
    parseRecentAuthenticationInput(
      input,
    );

  const credential =
    await findAuthCredentialByUserId(
      auth.userId,
    );

  if (!credential) {
    throw new AuthPersistenceError(
      "The local account credential could not be loaded.",
    );
  }

  const confirmedAt = new Date();
  const auditMetadata =
    createAuditMetadata(
      requestMetadata,
    );

  const passwordIsValid =
    await verifyPassword(
      credential.passwordHash,
      parsedInput.password,
    );

  if (!passwordIsValid) {
    try {
      await createAuthAuditEvent({
        auditEventId:
          new ObjectId(),
        userId: auth.userId,
        eventType:
          "reauthentication-failed",
        outcome: "failure",
        ...auditMetadata,
        details: {
          provider: "local",
        },
        createdAt: confirmedAt,
      });
    } catch (error) {
      console.error(
        "[account-reauthentication] Failure audit could not be recorded.",
        {
          name:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );
    }

    throw new AuthCurrentPasswordInvalidError();
  }

  const successAuditEventId =
    new ObjectId();

  const client =
    await getMongoClient();

  const session =
    client.startSession();

  try {
    await session.withTransaction(
      async () => {
        const wasRecorded =
          await recordRecentAuthentication(
            {
              sessionId: auth.sessionId,
              userId: auth.userId,
              confirmedAt,
            },
            session,
          );

        if (!wasRecorded) {
          throw new AuthPersistenceError(
            "The recent authentication state could not be recorded.",
          );
        }

        await createAuthAuditEvent(
          {
            auditEventId:
              successAuditEventId,
            userId: auth.userId,
            eventType:
              "reauthentication-succeeded",
            outcome: "success",
            ...auditMetadata,
            details: {
              provider: "local",
            },
            createdAt: confirmedAt,
          },
          session,
        );
      },
      ACCOUNT_MUTATION_TRANSACTION_OPTIONS,
    );
  } catch (error) {
    if (error instanceof AuthPersistenceError) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The recent authentication state could not be saved.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }

  return {
    confirmedAt,
    expiresAt: new Date(
      confirmedAt.getTime() +
        AUTH_RECENT_AUTHENTICATION_POLICY
          .validForMilliseconds,
    ),
  };
}

export async function updateAccountProfile(
  input: AccountProfileUpdateInput,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
): Promise<AccountProfileUpdateResult> {
  const parsedInput =
    parseAccountProfileUpdateInput(
      input,
    );

  const changed =
    parsedInput.displayName !==
    auth.displayName;

  if (!changed) {
    return {
      user: {
        userId:
          auth.userId.toHexString(),
        provider: auth.provider,
        email: auth.email,
        displayName:
          auth.displayName,
        profileImagePath:
          auth.profileImagePath,
        roles: [...auth.roles],
      },
      changed: false,
    };
  }

  const updatedAt = new Date();
  const auditMetadata =
    createAuditMetadata(
      requestMetadata,
    );

  const auditEventId =
    new ObjectId();

  const client =
    await getMongoClient();

  const session =
    client.startSession();

  try {
    const result =
      await session.withTransaction(
        async () => {
          const user =
            await updateActiveUserDisplayName(
              {
                userId: auth.userId,
                displayName:
                  parsedInput.displayName,
                updatedAt,
              },
              session,
            );

          if (!user) {
            throw new AuthPersistenceError(
              "The FilmGeezer profile could not be updated.",
            );
          }

          await createAuthAuditEvent(
            {
              auditEventId,
              userId: user._id,
              eventType:
                "profile-updated",
              outcome: "success",
              ...auditMetadata,
              details: {
                field: "displayName",
              },
              createdAt: updatedAt,
            },
            session,
          );

          return user;
        },
        ACCOUNT_MUTATION_TRANSACTION_OPTIONS,
      );

    if (!result) {
      throw new AuthPersistenceError(
        "Profile update completed without returning a user.",
      );
    }

    return {
      user: {
        userId:
          result._id.toHexString(),
        provider: auth.provider,
        email: result.emailDisplay,
        displayName:
          result.displayName,
        profileImagePath:
          createProfileImagePath(result),
        roles: [...result.roles],
      },
      changed: true,
    };
  } catch (error) {
    if (error instanceof AuthPersistenceError) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The FilmGeezer profile could not be updated.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }
}

export async function addAccountPassword(
  input: AccountPasswordChangeInput,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
): Promise<AccountPasswordAddResult> {
  const parsedInput =
    parseAccountPasswordChangeInput(
      input,
    );

  const passwordQuality =
    assessPasswordQuality({
      password:
        parsedInput.newPassword,
      emailNormalized:
        auth.email
          .trim()
          .toLowerCase(),
      displayName:
        auth.displayName,
    });

  if (!passwordQuality.accepted) {
    throw new AuthWeakPasswordError(
      passwordQuality.rejectionReason ??
        "common-or-predictable",
    );
  }

  const [credential, localIdentity] =
    await Promise.all([
      findAuthCredentialByUserId(
        auth.userId,
      ),
      findAuthIdentityByUserAndProvider(
        auth.userId,
        "local",
      ),
    ]);

  if (credential || localIdentity) {
    throw new AuthPasswordAlreadyConfiguredError();
  }

  const passwordHash = await hashPassword(
    parsedInput.newPassword,
  );

  const addedAt = new Date();
  const passwordAddedAuditId =
    new ObjectId();
  const auditMetadata =
    createAuditMetadata(
      requestMetadata,
    );

  const client = await getMongoClient();
  const session = client.startSession();

  try {
    await session.withTransaction(
      async () => {
        const user =
          await findActiveUserById(
            auth.userId,
            session,
          );

        if (!user) {
          throw new AuthPersistenceError(
            "The active account could not be loaded.",
          );
        }

        const [existingCredential, existingLocalIdentity] =
          await Promise.all([
            findAuthCredentialByUserId(
              user._id,
              session,
            ),
            findAuthIdentityByUserAndProvider(
              user._id,
              "local",
              session,
            ),
          ]);

        if (
          existingCredential ||
          existingLocalIdentity
        ) {
          throw new AuthPasswordAlreadyConfiguredError();
        }

        await createAuthIdentity(
          {
            identityId: new ObjectId(),
            userId: user._id,
            provider: "local",
            providerSubject:
              randomUUID(),
            createdAt: addedAt,
          },
          session,
        );

        await createAuthCredential(
          {
            credentialId: new ObjectId(),
            userId: user._id,
            passwordHash,
            createdAt: addedAt,
          },
          session,
        );

        await createAuthAuditEvent(
          {
            auditEventId:
              passwordAddedAuditId,
            userId: user._id,
            eventType: "password-changed",
            outcome: "success",
            ...auditMetadata,
            details: {
              source:
                "account-add-password",
              passwordAdded: true,
              sessionsRevoked: 0,
              sessionRotated: false,
            },
            createdAt: addedAt,
          },
          session,
        );
      },
      ACCOUNT_MUTATION_TRANSACTION_OPTIONS,
    );
  } catch (error) {
    if (
      error instanceof AuthPersistenceError ||
      error instanceof AuthPasswordAlreadyConfiguredError
    ) {
      throw error;
    }

    if (isMongoDuplicateKeyError(error)) {
      throw new AuthPasswordAlreadyConfiguredError();
    }

    throw new AuthPersistenceError(
      "The FilmGeezer password could not be added.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }

  try {
    await sendPasswordAddedNoticeEmail({
      recipientEmail: auth.email,
      displayName: auth.displayName,
      addedAt,
      idempotencyKey:
        `password-added-notice/${passwordAddedAuditId.toHexString()}`,
      userId:
        auth.userId.toHexString(),
    });
  } catch (error) {
    /*
     * The new local credential has already committed. Email-provider
     * availability must not undo a successful sign-in-method change.
     */
    console.error(
      "[account-password] Password-added security email could not be submitted.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }

  return {
    addedAt,
  };
}

export async function changeAccountPassword(
  input: AccountPasswordChangeInput,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
): Promise<AccountPasswordChangeResult> {
  const parsedInput =
    parseAccountPasswordChangeInput(
      input,
    );

  const passwordQuality =
    assessPasswordQuality({
      password:
        parsedInput.newPassword,
      emailNormalized:
        auth.email
          .trim()
          .toLowerCase(),
      displayName:
        auth.displayName,
    });

  if (!passwordQuality.accepted) {
    throw new AuthWeakPasswordError(
      passwordQuality.rejectionReason ??
        "common-or-predictable",
    );
  }

  const credential =
    await findAuthCredentialByUserId(
      auth.userId,
    );

  if (!credential) {
    throw new AuthPersistenceError(
      "The local account credential could not be loaded.",
    );
  }

  const passwordWasReused =
    await verifyPassword(
      credential.passwordHash,
      parsedInput.newPassword,
    );

  if (passwordWasReused) {
    throw new AuthPasswordReuseError();
  }

  const changedAt = new Date();

  const newPasswordHash =
    await hashPassword(
      parsedInput.newPassword,
    );

  const preparedSession =
    prepareAuthSession(
      requestMetadata,
      changedAt,
    );

  const passwordChangedAuditId =
    new ObjectId();

  const client =
    await getMongoClient();

  const session =
    client.startSession();

  let result:
    AccountPasswordChangeResult | null =
      null;

  try {
    result =
      await session.withTransaction(
        async () => {
          const user =
            await findActiveUserById(
              auth.userId,
              session,
            );

          if (!user) {
            throw new AuthPersistenceError(
              "The active account could not be loaded.",
            );
          }

          const userWasLocked =
            await recordSessionMutation(
              {
                userId: user._id,
                changedAt,
              },
              session,
            );

          if (!userWasLocked) {
            throw new AuthPersistenceError(
              "The account could not be prepared for a password change.",
            );
          }

          const passwordWasChanged =
            await resetCredentialPassword(
              {
                credentialId:
                  credential._id,
                userId: user._id,
                expectedPasswordHash:
                  credential.passwordHash,
                passwordHash:
                  newPasswordHash,
                changedAt,
              },
              session,
            );

          if (!passwordWasChanged) {
            throw new AuthPersistenceError(
              "The password changed concurrently. Try again.",
            );
          }

          const sessionsRevoked =
            await revokeAllActiveAuthSessions(
              {
                userId: user._id,
                revokedAt: changedAt,
                reason:
                  "password-changed",
              },
              session,
            );

          await createPreparedAuthSession(
            user._id,
            auth.provider,
            preparedSession,
            session,
          );

          const auditMetadata =
            createAuditMetadata(
              requestMetadata,
            );

          await createAuthAuditEvent(
            {
              auditEventId:
                passwordChangedAuditId,
              userId: user._id,
              eventType:
                "password-changed",
              outcome: "success",
              ...auditMetadata,
              details: {
                source:
                  "authenticated-account",
                sessionsRevoked,
                sessionRotated: true,
                sessionProvider:
                  auth.provider,
              },
              createdAt: changedAt,
            },
            session,
          );

          return {
            ...createAuthSessionResult(
              user,
              auth.provider,
              preparedSession,
            ),
            changedAt,
            sessionsRevoked,
          } satisfies
            AccountPasswordChangeResult;
        },
        ACCOUNT_MUTATION_TRANSACTION_OPTIONS,
      );

    if (!result) {
      throw new AuthPersistenceError(
        "Password change completed without returning a result.",
      );
    }
  } catch (error) {
    if (
      error instanceof
        AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The FilmGeezer password could not be changed.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }

  const completedResult = result;

  if (!completedResult) {
    throw new AuthPersistenceError(
      "Password change completed without a usable result.",
    );
  }

  try {
    await sendPasswordChangedNoticeEmail({
      recipientEmail: auth.email,
      displayName: auth.displayName,
      changedAt,
      idempotencyKey:
        `password-changed-notice/${passwordChangedAuditId.toHexString()}`,
      userId:
        auth.userId.toHexString(),
    });
  } catch (error) {
    /*
     * The credential mutation has already committed. Provider availability
     * must never roll back a successful password change or invalidate the
     * freshly rotated session.
     */
    console.error(
      "[account-password] Password-change security email could not be submitted.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }

  return completedResult;
}
