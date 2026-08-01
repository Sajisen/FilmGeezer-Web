import {
  ObjectId,
  type ClientSession,
} from "mongodb";

import {
  AUTH_SCHEMA_VERSION,
} from "../auth.constants.js";

import {
  getAuthCollections,
} from "../auth.collections.js";

import type {
  FilmGeezerUserDocument,
} from "../auth.types.js";

export interface CreatePendingUserInput {
  userId: ObjectId;
  emailNormalized: string;
  emailDisplay: string;
  displayName: string;
  createdAt: Date;
}

export async function createPendingUser(
  input: CreatePendingUserInput,
  session: ClientSession,
): Promise<FilmGeezerUserDocument> {
  const { users } =
    await getAuthCollections();

  const user:
    FilmGeezerUserDocument = {
      _id: input.userId,
      schemaVersion:
        AUTH_SCHEMA_VERSION,

      emailNormalized:
        input.emailNormalized,
      emailDisplay:
        input.emailDisplay,
      displayName:
        input.displayName,

      status: "pending",
      roles: ["user"],

      emailVerifiedAt: null,
      lastLoginAt: null,
      suspendedAt: null,
      deactivatedAt: null,
      deletedAt: null,

      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };

  await users.insertOne(
    user,
    {
      session,
    },
  );

  return user;
}

export async function findUserByNormalizedEmail(
  emailNormalized: string,
  session?: ClientSession,
): Promise<FilmGeezerUserDocument | null> {
  const { users } =
    await getAuthCollections();

  return users.findOne(
    {
      emailNormalized,
    },
    session
      ? {
          session,
        }
      : undefined,
  );
}

export async function findPendingUserById(
  userId: ObjectId,
  session?: ClientSession,
): Promise<FilmGeezerUserDocument | null> {
  const { users } =
    await getAuthCollections();

  return users.findOne(
    {
      _id: userId,
      status: "pending",
      emailVerifiedAt: null,
      suspendedAt: null,
      deactivatedAt: null,
      deletedAt: null,
    },
    session
      ? {
          session,
        }
      : undefined,
  );
}

export interface ActivatePendingUserInput {
  userId: ObjectId;
  verifiedAt: Date;
}

export async function activatePendingUser(
  input: ActivatePendingUserInput,
  session: ClientSession,
): Promise<boolean> {
  const { users } =
    await getAuthCollections();

  const result =
    await users.updateOne(
      {
        _id: input.userId,
        status: "pending",
        emailVerifiedAt: null,
        suspendedAt: null,
        deactivatedAt: null,
        deletedAt: null,
      },
      {
        $set: {
          status: "active",
          emailVerifiedAt:
            input.verifiedAt,

          /*
           * Successful verification immediately establishes the first
           * authenticated session, so the activation time is also the
           * account's first successful sign-in time.
           */
          lastLoginAt:
            input.verifiedAt,

          updatedAt:
            input.verifiedAt,
        },
      },
      {
        session,
      },
    );

  return result.modifiedCount === 1;
}

export interface RecordSuccessfulLoginInput {
  userId: ObjectId;
  loggedInAt: Date;
}

export async function recordSuccessfulLogin(
  input: RecordSuccessfulLoginInput,
  session: ClientSession,
): Promise<boolean> {
  const { users } =
    await getAuthCollections();

  /*
   * This write both rechecks the account state and serializes concurrent
   * login transactions for the same user. The latter allows the active
   * session limit to be enforced consistently inside the transaction.
   */
  const result =
    await users.updateOne(
      {
        _id: input.userId,
        status: "active",
        emailVerifiedAt: {
          $ne: null,
        },
        suspendedAt: null,
        deactivatedAt: null,
        deletedAt: null,
      },
      {
        $set: {
          lastLoginAt:
            input.loggedInAt,
          updatedAt:
            input.loggedInAt,
        },
      },
      {
        session,
      },
    );

  return result.modifiedCount === 1;
}

export async function findActiveUserById(
  userId: ObjectId,
  session?: ClientSession,
): Promise<FilmGeezerUserDocument | null> {
  const { users } =
    await getAuthCollections();

  return users.findOne(
    {
      _id: userId,
      status: "active",
      emailVerifiedAt: {
        $ne: null,
      },
      suspendedAt: null,
      deactivatedAt: null,
      deletedAt: null,
    },
    session
      ? {
          session,
        }
      : undefined,
  );
}

export interface RecordSessionMutationInput {
  userId: ObjectId;
  changedAt: Date;
}

export async function recordSessionMutation(
  input: RecordSessionMutationInput,
  session: ClientSession,
): Promise<boolean> {
  const { users } =
    await getAuthCollections();

  /*
   * Login and logout transactions both update this user document. The
   * shared write serializes concurrent session creation and revocation
   * for one account, so logout-all cannot race past a simultaneous login.
   */
  const result =
    await users.updateOne(
      {
        _id: input.userId,
      },
      {
        $set: {
          updatedAt:
            input.changedAt,
        },
      },
      {
        session,
      },
    );

  return result.matchedCount === 1;
}

export async function findPasswordResetEligibleUserById(
  userId: ObjectId,
  session?: ClientSession,
): Promise<FilmGeezerUserDocument | null> {
  const { users } = await getAuthCollections();

  return users.findOne(
    {
      _id: userId,
      status: { $in: ["pending", "active"] },
      suspendedAt: null,
      deactivatedAt: null,
      deletedAt: null,
    },
    session ? { session } : undefined,
  );
}

export interface RecordPasswordResetMutationInput {
  userId: ObjectId;
  changedAt: Date;
}

export async function recordPasswordResetMutation(
  input: RecordPasswordResetMutationInput,
  session: ClientSession,
): Promise<boolean> {
  const { users } = await getAuthCollections();

  const result = await users.updateOne(
    {
      _id: input.userId,
      status: { $in: ["pending", "active"] },
      suspendedAt: null,
      deactivatedAt: null,
      deletedAt: null,
    },
    {
      $set: { updatedAt: input.changedAt },
    },
    { session },
  );

  return result.matchedCount === 1;
}

export interface UpdateActiveUserDisplayNameInput {
  userId: ObjectId;
  displayName: string;
  updatedAt: Date;
}

export async function updateActiveUserDisplayName(
  input: UpdateActiveUserDisplayNameInput,
  session?: ClientSession,
): Promise<FilmGeezerUserDocument | null> {
  const { users } =
    await getAuthCollections();

  return users.findOneAndUpdate(
    {
      _id: input.userId,
      status: "active",
      emailVerifiedAt: {
        $ne: null,
      },
      suspendedAt: null,
      deactivatedAt: null,
      deletedAt: null,
    },
    {
      $set: {
        displayName: input.displayName,
        updatedAt: input.updatedAt,
      },
    },
    {
      returnDocument: "after",
      ...(session
        ? {
            session,
          }
        : {}),
    },
  );
}

export interface UpdateActiveUserEmailInput {
  userId: ObjectId;
  expectedEmailNormalized: string;
  emailNormalized: string;
  emailDisplay: string;
  verifiedAt: Date;
}

export async function updateActiveUserEmail(
  input: UpdateActiveUserEmailInput,
  session: ClientSession,
): Promise<FilmGeezerUserDocument | null> {
  const { users } = await getAuthCollections();

  return users.findOneAndUpdate(
    {
      _id: input.userId,
      status: "active",
      emailVerifiedAt: { $ne: null },
      suspendedAt: null,
      deactivatedAt: null,
      deletedAt: null,
      emailNormalized: input.expectedEmailNormalized,
    },
    {
      $set: {
        emailNormalized: input.emailNormalized,
        emailDisplay: input.emailDisplay,
        emailVerifiedAt: input.verifiedAt,
        updatedAt: input.verifiedAt,
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
}

export interface DeactivateActiveUserInput {
  userId: ObjectId;
  deactivatedAt: Date;
}

export async function deactivateActiveUser(
  input: DeactivateActiveUserInput,
  session: ClientSession,
): Promise<FilmGeezerUserDocument | null> {
  const { users } =
    await getAuthCollections();

  return users.findOneAndUpdate(
    {
      _id: input.userId,
      status: "active",
      emailVerifiedAt: {
        $ne: null,
      },
      suspendedAt: null,
      deactivatedAt: null,
      deletedAt: null,
    },
    {
      $set: {
        status: "deactivated",
        deactivatedAt:
          input.deactivatedAt,
        updatedAt:
          input.deactivatedAt,
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
}

