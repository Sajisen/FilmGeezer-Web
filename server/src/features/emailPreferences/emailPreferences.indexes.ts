import {
  USER_EMAIL_PREFERENCES_SCHEMA_VERSION,
  USER_EMAIL_PREFERENCE_EVENT_SCHEMA_VERSION,
} from "./emailPreferences.constants.js";
import {
  getUserEmailPreferenceEventsCollection,
  getUserEmailPreferencesCollection,
} from "./emailPreferences.collection.js";

let emailPreferencesStoragePromise: Promise<void> | null = null;

async function prepareEmailPreferencesStorage(): Promise<void> {
  const preferences = await getUserEmailPreferencesCollection();
  const events = await getUserEmailPreferenceEventsCollection();

  await preferences.updateMany(
    {
      recommendationsAndDiscoveryEmailsEnabled: {
        $exists: false,
      },
    },
    {
      $set: {
        recommendationsAndDiscoveryEmailsEnabled: false,
      },
    },
  );

  await preferences.updateMany(
    {
      productUpdatesEmailsEnabled: {
        $exists: false,
      },
    },
    {
      $set: {
        productUpdatesEmailsEnabled: false,
      },
    },
  );

  await preferences.updateMany(
    {
      revision: {
        $exists: false,
      },
    },
    {
      $set: {
        revision: 1,
      },
    },
  );

  await preferences.updateMany(
    {
      schemaVersion: {
        $ne: USER_EMAIL_PREFERENCES_SCHEMA_VERSION,
      },
    },
    {
      $set: {
        schemaVersion: USER_EMAIL_PREFERENCES_SCHEMA_VERSION,
      },
    },
  );

  await events.updateMany(
    {
      schemaVersion: {
        $ne: USER_EMAIL_PREFERENCE_EVENT_SCHEMA_VERSION,
      },
    },
    {
      $set: {
        schemaVersion: USER_EMAIL_PREFERENCE_EVENT_SCHEMA_VERSION,
      },
    },
  );

  await preferences.createIndexes([
    {
      key: { userId: 1 },
      name: "user_email_preferences_user_unique",
      unique: true,
    },
    {
      key: { updatedAt: -1 },
      name: "user_email_preferences_updated_at",
    },
  ]);

  await events.createIndexes([
    {
      key: { userId: 1, createdAt: -1 },
      name: "user_email_preference_events_user_created",
    },
    {
      key: { userId: 1, category: 1, createdAt: -1 },
      name: "user_email_preference_events_user_category_created",
    },
  ]);
}

export function initializeEmailPreferencesStorage(): Promise<void> {
  if (!emailPreferencesStoragePromise) {
    emailPreferencesStoragePromise =
      prepareEmailPreferencesStorage().catch((error) => {
        emailPreferencesStoragePromise = null;
        throw error;
      });
  }

  return emailPreferencesStoragePromise;
}
