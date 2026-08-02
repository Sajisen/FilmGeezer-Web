import type { Collection } from "mongodb";

import { getWebDatabase } from "../../config/database.js";

import {
  USER_PREFERENCES_COLLECTION_NAME,
} from "./preferences.constants.js";

import type {
  UserPreferencesDocument,
} from "./preferences.types.js";

export async function getUserPreferencesCollection(): Promise<
  Collection<UserPreferencesDocument>
> {
  const database = await getWebDatabase();

  return database.collection<UserPreferencesDocument>(
    USER_PREFERENCES_COLLECTION_NAME,
  );
}
