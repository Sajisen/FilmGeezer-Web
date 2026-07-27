import {
  ObjectId,
  type ClientSession,
} from "mongodb";
import { AUTH_SCHEMA_VERSION } from "../auth.constants.js";
import { getAuthCollections } from "../auth.collections.js";
import type {
  AuthIdentityDocument,
  AuthProvider,
} from "../auth.types.js";

export interface CreateAuthIdentityInput {
  identityId: ObjectId;
  userId: ObjectId;

  provider: AuthProvider;
  providerSubject: string;

  createdAt: Date;
}

export async function createAuthIdentity(
  input: CreateAuthIdentityInput,
  session: ClientSession,
): Promise<AuthIdentityDocument> {
  const { identities } = await getAuthCollections();

  const identity: AuthIdentityDocument = {
    _id: input.identityId,
    schemaVersion: AUTH_SCHEMA_VERSION,

    userId: input.userId,
    provider: input.provider,
    providerSubject: input.providerSubject,

    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };

  await identities.insertOne(identity, {
    session,
  });

  return identity;
}