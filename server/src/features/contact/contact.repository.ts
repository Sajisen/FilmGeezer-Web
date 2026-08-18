import type {
  ClientSession,
  ObjectId,
} from "mongodb";

import {
  getContactMessagesCollection,
  getContactThreadMessagesCollection,
} from "./contact.collection.js";

import type {
  ContactMessageDocument,
  ContactThreadMessageDocument,
} from "./contact.types.js";

export async function insertContactConversation(
  document: ContactMessageDocument,
  session?: ClientSession,
): Promise<void> {
  const collection = await getContactMessagesCollection();

  await collection.insertOne(document, { session });
}

export async function insertContactThreadMessage(
  document: ContactThreadMessageDocument,
  session?: ClientSession,
): Promise<void> {
  const collection = await getContactThreadMessagesCollection();

  await collection.insertOne(document, { session });
}

export async function findRecentContactConversations(
  userId: ObjectId,
  limit: number,
): Promise<ContactMessageDocument[]> {
  const collection = await getContactMessagesCollection();

  return collection
    .find({
      userId,
      status: { $ne: "spam" },
    })
    .sort({ lastMessageAt: -1, _id: -1 })
    .limit(limit)
    .toArray();
}

export async function findOwnedContactConversation(
  userId: ObjectId,
  referenceId: string,
  session?: ClientSession,
): Promise<ContactMessageDocument | null> {
  const collection = await getContactMessagesCollection();

  return collection.findOne(
    {
      userId,
      referenceId,
      status: { $ne: "spam" },
    },
    { session },
  );
}

export async function findContactThreadMessages(
  conversationId: ObjectId,
  limit: number,
): Promise<ContactThreadMessageDocument[]> {
  const collection = await getContactThreadMessagesCollection();

  return collection
    .find({ conversationId })
    .sort({ createdAt: 1, _id: 1 })
    .limit(limit)
    .toArray();
}

export async function appendOwnedContactConversationMessage(
  input: {
    conversationId: ObjectId;
    userId: ObjectId;
    message: ContactThreadMessageDocument;
    updatedAt: Date;
    maximumMessages: number;
  },
  session: ClientSession,
): Promise<boolean> {
  const conversations = await getContactMessagesCollection();
  const messages = await getContactThreadMessagesCollection();

  const updateResult = await conversations.updateOne(
    {
      _id: input.conversationId,
      userId: input.userId,
      status: { $ne: "spam" },
      messageCount: { $lt: input.maximumMessages },
    },
    {
      $set: {
        status: "new",
        lastSenderRole: "user",
        lastMessagePreview: input.message.body,
        lastMessageAt: input.updatedAt,
        updatedAt: input.updatedAt,
        resolvedAt: null,
        deleteAt: null,
      },
      $inc: {
        messageCount: 1,
      },
    },
    { session },
  );

  if (updateResult.matchedCount !== 1) {
    return false;
  }

  await messages.updateMany(
    { conversationId: input.conversationId },
    { $set: { deleteAt: null } },
    { session },
  );

  await insertContactThreadMessage(input.message, session);
  return true;
}
