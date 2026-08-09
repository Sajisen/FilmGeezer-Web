import {
  MongoServerError,
  ObjectId,
} from "mongodb";

import { getMongoClient } from "../../config/database.js";
import {
  DEFAULT_USER_EMAIL_PREFERENCES,
  USER_EMAIL_PREFERENCES_SCHEMA_VERSION,
  USER_EMAIL_PREFERENCE_EVENT_SCHEMA_VERSION,
} from "./emailPreferences.constants.js";
import {
  EmailPreferencesPersistenceError,
  EmailPreferencesRevisionConflictError,
} from "./emailPreferences.errors.js";
import {
  initializeEmailPreferencesStorage,
} from "./emailPreferences.indexes.js";
import {
  findUserEmailPreferencesByUserId,
  insertUserEmailPreferenceEvent,
  insertUserEmailPreferences,
  replaceUserEmailPreferencesIfRevisionMatches,
} from "./emailPreferences.repository.js";
import {
  userEmailPreferencesUpdateSchema,
} from "./emailPreferences.validation.js";
import type {
  EmailPreferenceCategory,
  UserEmailPreferencesDocument,
  UserEmailPreferencesSnapshot,
  UserEmailPreferencesValues,
} from "./emailPreferences.types.js";

const EMAIL_PREFERENCES_TRANSACTION_OPTIONS = {
  readConcern: {
    level: "snapshot" as const,
  },
  writeConcern: {
    w: "majority" as const,
  },
};

function toSnapshot(
  document: UserEmailPreferencesDocument | null,
): UserEmailPreferencesSnapshot {
  if (!document) {
    return {
      recommendationsAndDiscoveryEmailsEnabled:
        DEFAULT_USER_EMAIL_PREFERENCES
          .recommendationsAndDiscoveryEmailsEnabled,
      productUpdatesEmailsEnabled:
        DEFAULT_USER_EMAIL_PREFERENCES
          .productUpdatesEmailsEnabled,
      revision: 0,
      updatedAt: null,
    };
  }

  return {
    recommendationsAndDiscoveryEmailsEnabled:
      document.recommendationsAndDiscoveryEmailsEnabled,
    productUpdatesEmailsEnabled:
      document.productUpdatesEmailsEnabled,
    revision: document.revision,
    updatedAt: document.updatedAt,
  };
}

function valuesAreEqual(
  first: UserEmailPreferencesValues,
  second: UserEmailPreferencesValues,
): boolean {
  return (
    first.recommendationsAndDiscoveryEmailsEnabled ===
      second.recommendationsAndDiscoveryEmailsEnabled &&
    first.productUpdatesEmailsEnabled ===
      second.productUpdatesEmailsEnabled
  );
}

function createChangedCategories(
  current: UserEmailPreferencesValues,
  next: UserEmailPreferencesValues,
): Array<{
  category: EmailPreferenceCategory;
  previousEnabled: boolean;
  enabled: boolean;
}> {
  const changes: Array<{
    category: EmailPreferenceCategory;
    previousEnabled: boolean;
    enabled: boolean;
  }> = [];

  if (
    current.recommendationsAndDiscoveryEmailsEnabled !==
    next.recommendationsAndDiscoveryEmailsEnabled
  ) {
    changes.push({
      category: "recommendations-and-discovery",
      previousEnabled:
        current.recommendationsAndDiscoveryEmailsEnabled,
      enabled:
        next.recommendationsAndDiscoveryEmailsEnabled,
    });
  }

  if (
    current.productUpdatesEmailsEnabled !==
    next.productUpdatesEmailsEnabled
  ) {
    changes.push({
      category: "product-updates",
      previousEnabled: current.productUpdatesEmailsEnabled,
      enabled: next.productUpdatesEmailsEnabled,
    });
  }

  return changes;
}

export async function getUserEmailPreferences(
  userId: ObjectId,
): Promise<UserEmailPreferencesSnapshot> {
  try {
    await initializeEmailPreferencesStorage();

    return toSnapshot(
      await findUserEmailPreferencesByUserId(userId),
    );
  } catch (error) {
    throw new EmailPreferencesPersistenceError(
      "Your email preferences could not be loaded.",
      { cause: error },
    );
  }
}

export async function updateUserEmailPreferences(
  userId: ObjectId,
  input: unknown,
): Promise<
  UserEmailPreferencesSnapshot & {
    changed: boolean;
  }
> {
  const parsedInput =
    userEmailPreferencesUpdateSchema.parse(input);

  const values: UserEmailPreferencesValues = {
    recommendationsAndDiscoveryEmailsEnabled:
      parsedInput.recommendationsAndDiscoveryEmailsEnabled,
    productUpdatesEmailsEnabled:
      parsedInput.productUpdatesEmailsEnabled,
  };

  try {
    await initializeEmailPreferencesStorage();

    const client = await getMongoClient();
    const session = client.startSession();

    try {
      const result =
        await session.withTransaction(
          async () => {
            const currentDocument =
              await findUserEmailPreferencesByUserId(
                userId,
                session,
              );
            const currentSnapshot =
              toSnapshot(currentDocument);

            if (
              parsedInput.revision !==
              currentSnapshot.revision
            ) {
              throw new EmailPreferencesRevisionConflictError();
            }

            if (
              valuesAreEqual(
                currentSnapshot,
                values,
              )
            ) {
              return {
                ...currentSnapshot,
                changed: false,
              };
            }

            const updatedAt = new Date();
            let updatedDocument: UserEmailPreferencesDocument;

            if (!currentDocument) {
              updatedDocument = {
                _id: new ObjectId(),
                schemaVersion:
                  USER_EMAIL_PREFERENCES_SCHEMA_VERSION,
                userId,
                revision: 1,
                ...values,
                createdAt: updatedAt,
                updatedAt,
              };

              try {
                await insertUserEmailPreferences(
                  updatedDocument,
                  session,
                );
              } catch (error) {
                if (
                  error instanceof MongoServerError &&
                  error.code === 11_000
                ) {
                  throw new EmailPreferencesRevisionConflictError();
                }

                throw error;
              }
            } else {
              const replacedDocument =
                await replaceUserEmailPreferencesIfRevisionMatches(
                  {
                    userId,
                    revision:
                      currentDocument.revision,
                    values,
                    updatedAt,
                  },
                  session,
                );

              if (!replacedDocument) {
                throw new EmailPreferencesRevisionConflictError();
              }

              updatedDocument = replacedDocument;
            }

            const changes = createChangedCategories(
              currentSnapshot,
              values,
            );

            for (const change of changes) {
              await insertUserEmailPreferenceEvent(
                {
                  _id: new ObjectId(),
                  schemaVersion:
                    USER_EMAIL_PREFERENCE_EVENT_SCHEMA_VERSION,
                  userId,
                  category: change.category,
                  previousEnabled: change.previousEnabled,
                  enabled: change.enabled,
                  source: "account-settings",
                  createdAt: updatedAt,
                },
                session,
              );
            }

            return {
              ...toSnapshot(updatedDocument),
              changed: true,
            };
          },
          EMAIL_PREFERENCES_TRANSACTION_OPTIONS,
        );

      if (!result) {
        throw new EmailPreferencesPersistenceError(
          "Your email preferences changed without returning a result.",
        );
      }

      return result;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    if (
      error instanceof EmailPreferencesRevisionConflictError ||
      error instanceof EmailPreferencesPersistenceError
    ) {
      throw error;
    }

    throw new EmailPreferencesPersistenceError(undefined, {
      cause: error,
    });
  }
}
