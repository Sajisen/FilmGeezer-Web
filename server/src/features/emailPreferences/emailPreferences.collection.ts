import type { Collection } from "mongodb";

import { getWebDatabase } from "../../config/database.js";
import {
  USER_EMAIL_PREFERENCES_COLLECTION_NAME,
  USER_EMAIL_PREFERENCE_EVENTS_COLLECTION_NAME,
} from "./emailPreferences.constants.js";
import type {
  UserEmailPreferenceEventDocument,
  UserEmailPreferencesDocument,
} from "./emailPreferences.types.js";

export async function getUserEmailPreferencesCollection(): Promise<
  Collection<UserEmailPreferencesDocument>
> {
  const database = await getWebDatabase();

  return database.collection<UserEmailPreferencesDocument>(
    USER_EMAIL_PREFERENCES_COLLECTION_NAME,
  );
}

export async function getUserEmailPreferenceEventsCollection(): Promise<
  Collection<UserEmailPreferenceEventDocument>
> {
  const database = await getWebDatabase();

  return database.collection<UserEmailPreferenceEventDocument>(
    USER_EMAIL_PREFERENCE_EVENTS_COLLECTION_NAME,
  );
}
