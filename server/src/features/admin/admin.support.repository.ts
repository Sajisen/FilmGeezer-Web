import type {
  ClientSession,
  Filter,
  ObjectId,
} from "mongodb";

import {
  getContactMessagesCollection,
  getContactThreadMessagesCollection,
} from "../contact/contact.collection.js";
import type {
  ContactMessageDocument,
  ContactMessageStatus,
  ContactThreadMessageDocument,
} from "../contact/contact.types.js";
import type { AdminSupportListQuery } from "./admin.support.types.js";

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function createSearchFilter(
  search: string,
): Filter<ContactMessageDocument> | null {
  if (!search) {
    return null;
  }

  const normalizedReference = search.trim().toUpperCase();

  if (/^FG-\d{8}-[A-F0-9]{8}$/u.test(normalizedReference)) {
    return { referenceId: normalizedReference };
  }

  if (normalizedReference.startsWith("FG-")) {
    return {
      referenceId: {
        $regex: `^${escapeRegularExpression(normalizedReference)}`,
      },
    };
  }

  if (search.includes("@")) {
    return {
      emailNormalized: {
        $regex: `^${escapeRegularExpression(search.toLowerCase())}`,
      },
    };
  }

  return { $text: { $search: search } };
}

function createListFilter(
  input: AdminSupportListQuery,
): Filter<ContactMessageDocument> {
  const filters: Filter<ContactMessageDocument>[] = [];

  if (input.status === "open") {
    filters.push({ status: { $in: ["new", "in-review"] } });
  } else if (input.status !== "all") {
    filters.push({ status: input.status });
  }

  if (input.category !== "all") {
    filters.push({ category: input.category });
  }

  if (input.requester === "account") {
    filters.push({ userId: { $exists: true } });
  } else if (input.requester === "guest") {
    filters.push({ userId: { $exists: false } });
  }

  const searchFilter = createSearchFilter(input.search);

  if (searchFilter) {
    filters.push(searchFilter);
  }

  if (filters.length === 0) {
    return {};
  }

  if (filters.length === 1) {
    return filters[0] ?? {};
  }

  return { $and: filters };
}

export async function findAdminSupportConversations(
  input: AdminSupportListQuery,
): Promise<{
  documents: ContactMessageDocument[];
  totalItems: number;
}> {
  const collection = await getContactMessagesCollection();
  const filter = createListFilter(input);
  const skip = (input.page - 1) * input.pageSize;

  const [documents, totalItems] = await Promise.all([
    collection
      .find(filter)
      .sort({ lastMessageAt: -1, _id: -1 })
      .skip(skip)
      .limit(input.pageSize)
      .toArray(),
    collection.countDocuments(filter),
  ]);

  return { documents, totalItems };
}

export async function findAdminSupportConversation(
  referenceId: string,
  session?: ClientSession,
): Promise<ContactMessageDocument | null> {
  const collection = await getContactMessagesCollection();

  return collection.findOne(
    { referenceId },
    session ? { session } : undefined,
  );
}

export async function findAdminSupportThreadMessages(
  conversationId: ObjectId,
): Promise<ContactThreadMessageDocument[]> {
  const collection = await getContactThreadMessagesCollection();

  return collection
    .find({ conversationId })
    .sort({ createdAt: 1, _id: 1 })
    .limit(100)
    .toArray();
}

export async function appendAdminSupportMessage(
  input: {
    conversationId: ObjectId;
    message: ContactThreadMessageDocument;
    createdAt: Date;
    maximumMessages: number;
  },
  session: ClientSession,
): Promise<boolean> {
  const conversations = await getContactMessagesCollection();
  const messages = await getContactThreadMessagesCollection();

  const result = await conversations.updateOne(
    {
      _id: input.conversationId,
      status: { $ne: "spam" },
      messageCount: { $lt: input.maximumMessages },
    },
    {
      $set: {
        status: "in-review",
        lastSenderRole: "admin",
        lastMessagePreview: input.message.body,
        lastMessageAt: input.createdAt,
        updatedAt: input.createdAt,
        resolvedAt: null,
      },
      $inc: { messageCount: 1 },
    },
    { session },
  );

  if (result.matchedCount !== 1) {
    return false;
  }

  await messages.insertOne(input.message, { session });
  return true;
}

export async function updateAdminSupportStatus(
  input: {
    conversationId: ObjectId;
    previousStatus: ContactMessageStatus;
    nextStatus: ContactMessageStatus;
    updatedAt: Date;
  },
  session: ClientSession,
): Promise<boolean> {
  const collection = await getContactMessagesCollection();

  const result = await collection.updateOne(
    {
      _id: input.conversationId,
      status: input.previousStatus,
    },
    {
      $set: {
        status: input.nextStatus,
        updatedAt: input.updatedAt,
        resolvedAt:
          input.nextStatus === "resolved" ? input.updatedAt : null,
      },
    },
    { session },
  );

  return result.matchedCount === 1;
}
