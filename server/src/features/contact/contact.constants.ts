export const CONTACT_MESSAGES_COLLECTION_NAME = "contact_messages";
export const CONTACT_THREAD_MESSAGES_COLLECTION_NAME =
  "contact_thread_messages";

export const CONTACT_MESSAGE_SCHEMA_VERSION = 2 as const;
export const CONTACT_THREAD_MESSAGE_SCHEMA_VERSION = 1 as const;

export const CONTACT_CATEGORY_VALUES = [
  "general",
  "bug",
  "content",
  "account",
  "feedback",
] as const;

export const CONTACT_STATUS_VALUES = [
  "new",
  "in-review",
  "resolved",
  "spam",
] as const;

export const CONTACT_SENDER_ROLE_VALUES = [
  "user",
  "admin",
] as const;

export const CONTACT_RECENT_CONVERSATION_LIMIT = 5;
export const CONTACT_THREAD_MESSAGE_LIMIT = 100;

export const CONTACT_HTTP_POLICY = {
  submission: {
    rateLimitWindowMilliseconds: 60 * 60 * 1_000,
    maximumRequestsPerWindow: 10,
    requestBodyLimit: "16kb",
  },
  historyRead: {
    rateLimitWindowMilliseconds: 15 * 60 * 1_000,
    maximumRequestsPerWindow: 120,
  },
  reply: {
    rateLimitWindowMilliseconds: 60 * 60 * 1_000,
    maximumRequestsPerWindow: 30,
    requestBodyLimit: "8kb",
  },
} as const;

export const CONTACT_FIELD_LIMITS = {
  name: {
    minimum: 2,
    maximum: 80,
  },
  email: {
    maximum: 254,
  },
  subject: {
    minimum: 5,
    maximum: 120,
  },
  message: {
    minimum: 20,
    maximum: 3_000,
  },
  reply: {
    minimum: 2,
    maximum: 3_000,
  },
  honeypot: {
    maximum: 200,
  },
} as const;
