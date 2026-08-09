import type {
  ClientSession,
  ObjectId,
} from "mongodb";

import {
  getUserEmailPreferenceEventsCollection,
  getUserEmailPreferencesCollection,
} from "./emailPreferences.collection.js";
import type {
  UserEmailPreferenceEventDocument,
  UserEmailPreferencesDocument,
  UserEmailPreferencesValues,
} from "./emailPreferences.types.js";

export async function findUserEmailPreferencesByUserId(
  userId: ObjectId,
  session?: ClientSession,
): Promise<UserEmailPreferencesDocument | null> {
  const collection = await getUserEmailPreferencesCollection();

  return collection.findOne(
    { userId },
    session ? { session } : undefined,
  );
}

export async function insertUserEmailPreferences(
  document: UserEmailPreferencesDocument,
  session: ClientSession,
): Promise<void> {
  const collection = await getUserEmailPreferencesCollection();

  await collection.insertOne(document, { session });
}

export async function replaceUserEmailPreferencesIfRevisionMatches(
  input: {
    userId: ObjectId;
    revision: number;
    values: UserEmailPreferencesValues;
    updatedAt: Date;
  },
  session: ClientSession,
): Promise<UserEmailPreferencesDocument | null> {
  const collection = await getUserEmailPreferencesCollection();

  return collection.findOneAndUpdate(
    {
      userId: input.userId,
      revision: input.revision,
    },
    {
      $set: {
        ...input.values,
        updatedAt: input.updatedAt,
      },
      $inc: {
        revision: 1,
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
}

export async function insertUserEmailPreferenceEvent(
  document: UserEmailPreferenceEventDocument,
  session: ClientSession,
): Promise<void> {
  const collection = await getUserEmailPreferenceEventsCollection();

  await collection.insertOne(document, { session });
}
