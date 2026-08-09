import type { ObjectId } from "mongodb";

import type {
  EMAIL_PREFERENCE_CATEGORY_VALUES,
} from "./emailPreferences.constants.js";

export type EmailPreferenceCategory =
  (typeof EMAIL_PREFERENCE_CATEGORY_VALUES)[number];

export interface UserEmailPreferencesValues {
  recommendationsAndDiscoveryEmailsEnabled: boolean;
  productUpdatesEmailsEnabled: boolean;
}

export interface UserEmailPreferencesDocument
  extends UserEmailPreferencesValues {
  _id: ObjectId;
  schemaVersion: number;
  userId: ObjectId;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserEmailPreferencesSnapshot
  extends UserEmailPreferencesValues {
  revision: number;
  updatedAt: Date | null;
}

export interface UserEmailPreferencesUpdateInput
  extends UserEmailPreferencesValues {
  revision: number;
}

export interface UserEmailPreferenceEventDocument {
  _id: ObjectId;
  schemaVersion: number;
  userId: ObjectId;
  category: EmailPreferenceCategory;
  previousEnabled: boolean;
  enabled: boolean;
  source: "account-settings";
  createdAt: Date;
}
