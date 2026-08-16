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
  AuthCredentialDocument,
} from "../auth.types.js";

export interface CreateAuthCredentialInput {
  credentialId: ObjectId;
  userId: ObjectId;
  passwordHash: string;
  createdAt: Date;
}

export async function createAuthCredential(
  input: CreateAuthCredentialInput,
  session: ClientSession,
): Promise<AuthCredentialDocument> {
  const { credentials } =
    await getAuthCollections();

  const credential:
    AuthCredentialDocument = {
      _id: input.credentialId,
      schemaVersion:
        AUTH_SCHEMA_VERSION,

      userId: input.userId,

      passwordAlgorithm: "argon2id",
      passwordHash:
        input.passwordHash,
      passwordChangedAt:
        input.createdAt,

      createdAt: input.createdAt,
      updatedAt: input.createdAt,
    };

  await credentials.insertOne(
    credential,
    {
      session,
    },
  );

  return credential;
}

export async function findAuthCredentialByUserId(
  userId: ObjectId,
  session?: ClientSession,
): Promise<AuthCredentialDocument | null> {
  const { credentials } =
    await getAuthCollections();

  return credentials.findOne(
    {
      userId,
      passwordAlgorithm: "argon2id",
    },
    session
      ? {
          session,
        }
      : undefined,
  );
}

export async function deleteAuthCredentialByUserId(
  userId: ObjectId,
  session: ClientSession,
): Promise<number> {
  const { credentials } =
    await getAuthCollections();

  const result = await credentials.deleteMany(
    { userId },
    { session },
  );

  return result.deletedCount;
}

export interface ReplaceCredentialPasswordHashInput {
  credentialId: ObjectId;
  userId: ObjectId;
  passwordHash: string;
  updatedAt: Date;
}

export async function replaceCredentialPasswordHash(
  input: ReplaceCredentialPasswordHashInput,
  session: ClientSession,
): Promise<boolean> {
  const { credentials } =
    await getAuthCollections();

  /*
   * A transparent Argon2 parameter upgrade does not mean the user changed
   * their password, so passwordChangedAt intentionally remains unchanged.
   */
  const result =
    await credentials.updateOne(
      {
        _id: input.credentialId,
        userId: input.userId,
        passwordAlgorithm: "argon2id",
      },
      {
        $set: {
          passwordHash:
            input.passwordHash,
          updatedAt:
            input.updatedAt,
        },
      },
      {
        session,
      },
    );

  return result.modifiedCount === 1;
}

export interface ResetCredentialPasswordInput {
  credentialId: ObjectId;
  userId: ObjectId;
  expectedPasswordHash: string;
  passwordHash: string;
  changedAt: Date;
}

export async function resetCredentialPassword(
  input: ResetCredentialPasswordInput,
  session: ClientSession,
): Promise<boolean> {
  const { credentials } = await getAuthCollections();

  const result = await credentials.updateOne(
    {
      _id: input.credentialId,
      userId: input.userId,
      passwordAlgorithm: "argon2id",
      passwordHash: input.expectedPasswordHash,
    },
    {
      $set: {
        passwordHash: input.passwordHash,
        passwordChangedAt: input.changedAt,
        updatedAt: input.changedAt,
      },
    },
    { session },
  );

  return result.modifiedCount === 1;
}
