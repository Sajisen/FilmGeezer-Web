import {
  CONTACT_MESSAGE_SCHEMA_VERSION,
  CONTACT_THREAD_MESSAGE_SCHEMA_VERSION,
} from "./contact.constants.js";

import {
  getContactMessagesCollection,
  getContactThreadMessagesCollection,
} from "./contact.collection.js";
import { createContactDeleteAt } from "./contact.retention.js";

let contactStoragePromise: Promise<void> | null = null;

async function prepareContactRetentionStorage(): Promise<void> {
  const conversations = await getContactMessagesCollection();
  const threadMessages = await getContactThreadMessagesCollection();

  await conversations.updateMany(
    { status: { $in: ["new", "in-review"] } },
    { $set: { deleteAt: null } },
  );

  const openConversationIds = await conversations
    .find(
      { status: { $in: ["new", "in-review"] } },
      { projection: { _id: 1 } },
    )
    .map((document) => document._id)
    .toArray();

  if (openConversationIds.length > 0) {
    await threadMessages.updateMany(
      { conversationId: { $in: openConversationIds } },
      { $set: { deleteAt: null } },
    );
  }

  const retainedConversations = await conversations
    .find(
      { status: { $in: ["resolved", "spam"] } },
      {
        projection: {
          _id: 1,
          status: 1,
          resolvedAt: 1,
          updatedAt: 1,
        },
      },
    )
    .toArray();

  for (const conversation of retainedConversations) {
    const retentionStartedAt =
      conversation.status === "resolved"
        ? conversation.resolvedAt ?? conversation.updatedAt
        : conversation.updatedAt;
    const deleteAt = createContactDeleteAt(
      conversation.status,
      retentionStartedAt,
    );

    await conversations.updateOne(
      { _id: conversation._id },
      { $set: { deleteAt } },
    );

    await threadMessages.updateMany(
      { conversationId: conversation._id },
      { $set: { deleteAt } },
    );
  }
}

async function prepareContactStorage(): Promise<void> {
  const conversations = await getContactMessagesCollection();
  const threadMessages = await getContactThreadMessagesCollection();

  await prepareContactRetentionStorage();

  /*
   * Schema version 1 stored the original message directly on the support
   * request document. Version 2 keeps that field for backward compatibility
   * and adds compact conversation metadata. Existing requests can therefore
   * be displayed without a risky destructive migration.
   */
  await conversations.updateMany(
    {
      schemaVersion: {
        $ne: CONTACT_MESSAGE_SCHEMA_VERSION,
      },
    },
    [
      {
        $set: {
          schemaVersion: CONTACT_MESSAGE_SCHEMA_VERSION,
          messageCount: {
            $ifNull: ["$messageCount", 1],
          },
          lastSenderRole: {
            $ifNull: ["$lastSenderRole", "user"],
          },
          lastMessagePreview: {
            $ifNull: ["$lastMessagePreview", "$message"],
          },
          lastMessageAt: {
            $ifNull: ["$lastMessageAt", "$updatedAt", "$createdAt"],
          },
        },
      },
    ],
  );

  await conversations.createIndexes([
    {
      key: { referenceId: 1 },
      name: "contact_reference_unique",
      unique: true,
    },
    {
      key: { lastMessageAt: -1, _id: -1 },
      name: "contact_last_message_at_id",
    },
    {
      key: { status: 1, lastMessageAt: -1 },
      name: "contact_status_last_message_at",
    },
    {
      key: { category: 1, lastMessageAt: -1 },
      name: "contact_category_last_message_at",
    },
    {
      key: { userId: 1, lastMessageAt: -1 },
      name: "contact_user_last_message_at",
      sparse: true,
    },
    {
      key: { emailNormalized: 1, lastMessageAt: -1 },
      name: "contact_email_last_message_at",
    },
    {
      key: { userId: 1, status: 1, lastMessageAt: -1 },
      name: "contact_requester_status_last_message_at",
    },
    {
      key: { deleteAt: 1 },
      name: "contact_delete_at_ttl",
      expireAfterSeconds: 0,
    },
  ]);

  await threadMessages.updateMany(
    {
      schemaVersion: {
        $ne: CONTACT_THREAD_MESSAGE_SCHEMA_VERSION,
      },
    },
    {
      $set: {
        schemaVersion: CONTACT_THREAD_MESSAGE_SCHEMA_VERSION,
      },
    },
  );

  await threadMessages.createIndexes([
    {
      key: { conversationId: 1, createdAt: 1, _id: 1 },
      name: "contact_thread_conversation_created_at",
    },
    {
      key: { senderId: 1, createdAt: -1 },
      name: "contact_thread_sender_created_at",
      sparse: true,
    },
    {
      key: { deleteAt: 1 },
      name: "contact_thread_delete_at_ttl",
      expireAfterSeconds: 0,
    },
  ]);
}

export function initializeContactStorage(): Promise<void> {
  if (!contactStoragePromise) {
    contactStoragePromise = prepareContactStorage().catch((error) => {
      contactStoragePromise = null;
      throw error;
    });
  }

  return contactStoragePromise;
}
