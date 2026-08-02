import {
  MongoServerError,
  ObjectId,
} from "mongodb";

import {
  DEFAULT_USER_PREFERENCES,
  PREFERENCE_CATEGORY_VALUES,
  PREFERENCE_GENRE_VALUES,
  PREFERENCE_LANGUAGE_VALUES,
  USER_PREFERENCES_SCHEMA_VERSION,
} from "./preferences.constants.js";

import {
  PreferencesPersistenceError,
  PreferencesRevisionConflictError,
} from "./preferences.errors.js";

import {
  initializePreferencesStorage,
} from "./preferences.indexes.js";

import {
  findUserPreferencesByUserId,
  insertUserPreferences,
  replaceUserPreferencesIfRevisionMatches,
} from "./preferences.repository.js";

import {
  userPreferencesUpdateSchema,
} from "./preferences.validation.js";

import type {
  PreferenceCategory,
  PreferenceGenre,
  PreferenceLanguage,
  UserPreferencesDocument,
  UserPreferencesSnapshot,
  UserPreferencesValues,
} from "./preferences.types.js";

function orderByAllowedValues<T extends string>(
  values: T[],
  allowedValues: readonly T[],
): T[] {
  const selectedValues = new Set(values);

  return allowedValues.filter((value) => selectedValues.has(value));
}

function normalizeValues(
  values: UserPreferencesValues,
): UserPreferencesValues {
  return {
    personalizationEnabled: values.personalizationEnabled,
    preferredCategories: orderByAllowedValues<PreferenceCategory>(
      values.preferredCategories,
      PREFERENCE_CATEGORY_VALUES,
    ),
    preferredGenres: orderByAllowedValues<PreferenceGenre>(
      values.preferredGenres,
      PREFERENCE_GENRE_VALUES,
    ),
    hiddenGenres: orderByAllowedValues<PreferenceGenre>(
      values.hiddenGenres,
      PREFERENCE_GENRE_VALUES,
    ),
    preferredLanguages: orderByAllowedValues<PreferenceLanguage>(
      values.preferredLanguages,
      PREFERENCE_LANGUAGE_VALUES,
    ),
  };
}

function toSnapshot(
  document: UserPreferencesDocument | null,
): UserPreferencesSnapshot {
  if (!document) {
    return {
      personalizationEnabled:
        DEFAULT_USER_PREFERENCES.personalizationEnabled,
      preferredCategories: [
        ...DEFAULT_USER_PREFERENCES.preferredCategories,
      ],
      preferredGenres: [],
      hiddenGenres: [],
      preferredLanguages: [],
      revision: 0,
      updatedAt: null,
    };
  }

  return {
    personalizationEnabled: document.personalizationEnabled,
    preferredCategories: [...document.preferredCategories],
    preferredGenres: [...document.preferredGenres],
    hiddenGenres: [...document.hiddenGenres],
    preferredLanguages: [...document.preferredLanguages],
    revision: document.revision,
    updatedAt: document.updatedAt,
  };
}

function valuesAreEqual(
  first: UserPreferencesValues,
  second: UserPreferencesValues,
): boolean {
  return (
    first.personalizationEnabled === second.personalizationEnabled &&
    first.preferredCategories.join("\u0000") ===
      second.preferredCategories.join("\u0000") &&
    first.preferredGenres.join("\u0000") ===
      second.preferredGenres.join("\u0000") &&
    first.hiddenGenres.join("\u0000") ===
      second.hiddenGenres.join("\u0000") &&
    first.preferredLanguages.join("\u0000") ===
      second.preferredLanguages.join("\u0000")
  );
}

export async function getUserPreferences(
  userId: ObjectId,
): Promise<UserPreferencesSnapshot> {
  try {
    await initializePreferencesStorage();

    return toSnapshot(await findUserPreferencesByUserId(userId));
  } catch (error) {
    throw new PreferencesPersistenceError(
      "The entertainment preferences could not be loaded.",
      { cause: error },
    );
  }
}

export async function updateUserPreferences(
  userId: ObjectId,
  input: unknown,
): Promise<UserPreferencesSnapshot & { changed: boolean }> {
  const parsedInput = userPreferencesUpdateSchema.parse(input);
  const values = normalizeValues(parsedInput);

  try {
    await initializePreferencesStorage();

    const currentDocument = await findUserPreferencesByUserId(userId);
    const currentSnapshot = toSnapshot(currentDocument);

    if (parsedInput.revision !== currentSnapshot.revision) {
      throw new PreferencesRevisionConflictError();
    }

    if (valuesAreEqual(currentSnapshot, values)) {
      return {
        ...currentSnapshot,
        changed: false,
      };
    }

    const updatedAt = new Date();

    if (!currentDocument) {
      const document: UserPreferencesDocument = {
        _id: new ObjectId(),
        schemaVersion: USER_PREFERENCES_SCHEMA_VERSION,
        userId,
        revision: 1,
        ...values,
        createdAt: updatedAt,
        updatedAt,
      };

      try {
        await insertUserPreferences(document);
      } catch (error) {
        if (error instanceof MongoServerError && error.code === 11_000) {
          throw new PreferencesRevisionConflictError();
        }

        throw error;
      }

      return {
        ...toSnapshot(document),
        changed: true,
      };
    }

    const updatedDocument =
      await replaceUserPreferencesIfRevisionMatches({
        userId,
        revision: currentDocument.revision,
        values,
        updatedAt,
      });

    if (!updatedDocument) {
      throw new PreferencesRevisionConflictError();
    }

    return {
      ...toSnapshot(updatedDocument),
      changed: true,
    };
  } catch (error) {
    if (error instanceof PreferencesRevisionConflictError) {
      throw error;
    }

    throw new PreferencesPersistenceError(undefined, {
      cause: error,
    });
  }
}
