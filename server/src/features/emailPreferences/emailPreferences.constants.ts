export const USER_EMAIL_PREFERENCES_COLLECTION_NAME =
  "user_email_preferences";

export const USER_EMAIL_PREFERENCE_EVENTS_COLLECTION_NAME =
  "user_email_preference_events";

export const USER_EMAIL_PREFERENCES_SCHEMA_VERSION = 1;
export const USER_EMAIL_PREFERENCE_EVENT_SCHEMA_VERSION = 1;

export const EMAIL_PREFERENCE_CATEGORY_VALUES = [
  "recommendations-and-discovery",
  "product-updates",
] as const;

export const DEFAULT_USER_EMAIL_PREFERENCES = {
  recommendationsAndDiscoveryEmailsEnabled: false,
  productUpdatesEmailsEnabled: false,
} as const;

export const EMAIL_PREFERENCES_HTTP_POLICY = {
  jsonBodyLimit: "4kb",
  read: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 300,
  },
  mutation: {
    rateLimitWindowMilliseconds: 60 * 60 * 1_000,
    maximumRequestsPerWindow: 30,
  },
} as const;
