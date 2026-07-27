import {
  ObjectId,
  type ClientSession,
} from "mongodb";
import { AUTH_SCHEMA_VERSION } from "../auth.constants.js";
import { getAuthCollections } from "../auth.collections.js";
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
  const { credentials } = await getAuthCollections();

  const credential: AuthCredentialDocument = {
    _id: input.credentialId,
    schemaVersion: AUTH_SCHEMA_VERSION,

    userId: input.userId,

    passwordAlgorithm: "argon2id",
    passwordHash: input.passwordHash,
    passwordChangedAt: input.createdAt,

    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };

  await credentials.insertOne(credential, {
    session,
  });

  return credential;
}