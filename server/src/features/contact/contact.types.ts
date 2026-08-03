import type { ObjectId } from "mongodb";

import type {
  CONTACT_CATEGORY_VALUES,
  CONTACT_MESSAGE_SCHEMA_VERSION,
  CONTACT_SENDER_ROLE_VALUES,
  CONTACT_STATUS_VALUES,
  CONTACT_THREAD_MESSAGE_SCHEMA_VERSION,
} from "./contact.constants.js";

export type ContactCategory = (typeof CONTACT_CATEGORY_VALUES)[number];

export type ContactMessageStatus = (typeof CONTACT_STATUS_VALUES)[number];

export type ContactSenderRole = (typeof CONTACT_SENDER_ROLE_VALUES)[number];

export interface ContactMessageDocument {
  _id: ObjectId;
  schemaVersion: typeof CONTACT_MESSAGE_SCHEMA_VERSION;
  referenceId: string;
  userId?: ObjectId;
  category: ContactCategory;
  name: string;
  email: string;
  emailNormalized: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  source: "filmgeezer-web";
  messageCount: number;
  lastSenderRole: ContactSenderRole;
  lastMessagePreview: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
}

export interface ContactThreadMessageDocument {
  _id: ObjectId;
  schemaVersion: typeof CONTACT_THREAD_MESSAGE_SCHEMA_VERSION;
  conversationId: ObjectId;
  senderRole: ContactSenderRole;
  senderId?: ObjectId;
  body: string;
  createdAt: Date;
}

export interface ContactSubmissionResult {
  referenceId: string;
  submittedAt: Date;
  stored: boolean;
  linkedToAccount: boolean;
}

export interface ContactConversationSummary {
  referenceId: string;
  category: ContactCategory;
  subject: string;
  status: ContactMessageStatus;
  preview: string;
  messageCount: number;
  lastSenderRole: ContactSenderRole;
  lastMessageAt: Date;
  createdAt: Date;
}

export interface ContactConversationThread {
  conversation: ContactConversationSummary & {
    updatedAt: Date;
  };
  messages: Array<{
    id: string;
    senderRole: ContactSenderRole;
    body: string;
    createdAt: Date;
  }>;
}
