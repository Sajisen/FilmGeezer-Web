import type { ObjectId } from "mongodb";

import type {
  PREFERENCE_CATEGORY_VALUES,
  PREFERENCE_GENRE_VALUES,
  PREFERENCE_LANGUAGE_VALUES,
} from "./preferences.constants.js";

export type PreferenceCategory =
  (typeof PREFERENCE_CATEGORY_VALUES)[number];

export type PreferenceGenre =
  (typeof PREFERENCE_GENRE_VALUES)[number];

export type PreferenceLanguage =
  (typeof PREFERENCE_LANGUAGE_VALUES)[number];

export interface UserPreferencesValues {
  personalizationEnabled: boolean;
  preferredCategories: PreferenceCategory[];
  preferredGenres: PreferenceGenre[];
  hiddenGenres: PreferenceGenre[];
  preferredLanguages: PreferenceLanguage[];
}

export interface UserPreferencesDocument
  extends UserPreferencesValues {
  _id: ObjectId;
  schemaVersion: number;
  userId: ObjectId;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferencesSnapshot
  extends UserPreferencesValues {
  revision: number;
  updatedAt: Date | null;
}

export interface UserPreferencesUpdateInput
  extends UserPreferencesValues {
  revision: number;
}
