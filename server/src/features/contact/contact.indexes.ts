import {
  CONTACT_MESSAGE_SCHEMA_VERSION,
  CONTACT_THREAD_MESSAGE_SCHEMA_VERSION,
} from "./contact.constants.js";

import {
  getContactMessagesCollection,
  getContactThreadMessagesCollection,
} from "./contact.collection.js";

let contactStoragePromise: Promise<void> | null = null;

async function prepareContactStorage(): Promise<void> {
  const conversations = await getContactMessagesCollection();
  const threadMessages = await getContactThreadMessagesCollection();

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
