export const NOTIFICATION_COLLECTION_NAME = "user_notifications";

export const NOTIFICATION_SCHEMA_VERSION = 1 as const;

export const NOTIFICATION_TYPE_VALUES = [
  "welcome",
  "support-reply",
] as const;

export const NOTIFICATION_CATEGORY_VALUES = [
  "account",
  "support",
] as const;

export const NOTIFICATION_ACTION_KIND_VALUES = [
  "welcome",
  "support-conversation",
] as const;

export const NOTIFICATION_LIST_FILTER_VALUES = [
  "all",
  "unread",
] as const;

export const NOTIFICATION_HTTP_POLICY = {
  read: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 180,
  },
  mutation: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 120,
  },
} as const;

export const NOTIFICATION_LIST_POLICY = {
  defaultPage: 1,
  defaultPageSize: 20,
  maximumPageSize: 50,
  defaultSummaryLimit: 6,
  maximumSummaryLimit: 10,
} as const;
