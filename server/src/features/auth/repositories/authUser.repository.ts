import {
  ObjectId,
  type ClientSession,
} from "mongodb";
import { AUTH_SCHEMA_VERSION } from "../auth.constants.js";
import { getAuthCollections } from "../auth.collections.js";
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
  const { users } = await getAuthCollections();

  const user: FilmGeezerUserDocument = {
    _id: input.userId,
    schemaVersion: AUTH_SCHEMA_VERSION,

    emailNormalized: input.emailNormalized,
    emailDisplay: input.emailDisplay,
    displayName: input.displayName,

    status: "pending",
    roles: ["user"],

    emailVerifiedAt: null,
    suspendedAt: null,
    deletedAt: null,

    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };

  await users.insertOne(user, {
    session,
  });

  return user;
}