import {
  type ObjectId,
} from "mongodb";

import {
  getUserPreferencesCollection,
} from "./preferences.collection.js";

import type {
  UserPreferencesDocument,
  UserPreferencesValues,
} from "./preferences.types.js";

export async function findUserPreferencesByUserId(
  userId: ObjectId,
): Promise<UserPreferencesDocument | null> {
  const collection = await getUserPreferencesCollection();

  return collection.findOne({ userId });
}

export async function insertUserPreferences(
  document: UserPreferencesDocument,
): Promise<void> {
  const collection = await getUserPreferencesCollection();

  await collection.insertOne(document);
}

export async function replaceUserPreferencesIfRevisionMatches(input: {
  userId: ObjectId;
  revision: number;
  values: UserPreferencesValues;
  updatedAt: Date;
}): Promise<UserPreferencesDocument | null> {
  const collection = await getUserPreferencesCollection();

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
    },
  );
}
