import {
  USER_PREFERENCES_SCHEMA_VERSION,
} from "./preferences.constants.js";

import {
  getUserPreferencesCollection,
} from "./preferences.collection.js";

let preferencesStoragePromise: Promise<void> | null = null;

async function preparePreferencesStorage(): Promise<void> {
  const collection = await getUserPreferencesCollection();

  await collection.updateMany(
    { revision: { $exists: false } },
    {
      $set: {
        revision: 1,
      },
    },
  );

  await collection.updateMany(
    {
      schemaVersion: {
        $ne: USER_PREFERENCES_SCHEMA_VERSION,
      },
    },
    {
      $set: {
        schemaVersion: USER_PREFERENCES_SCHEMA_VERSION,
      },
    },
  );

  await collection.createIndexes([
    {
      key: { userId: 1 },
      name: "user_preferences_user_unique",
      unique: true,
    },
    {
      key: { updatedAt: -1 },
      name: "user_preferences_updated_at",
    },
  ]);
}

export function initializePreferencesStorage(): Promise<void> {
  if (!preferencesStoragePromise) {
    preferencesStoragePromise = preparePreferencesStorage().catch(
      (error) => {
        preferencesStoragePromise = null;
        throw error;
      },
    );
  }

  return preferencesStoragePromise;
}
