import { ObjectId } from "mongodb";

import { getMongoClient } from "../../config/database.js";
import {
  CONTACT_THREAD_MESSAGE_LIMIT,
  CONTACT_THREAD_MESSAGE_SCHEMA_VERSION,
} from "../contact/contact.constants.js";
import { initializeContactStorage } from "../contact/contact.indexes.js";
import { initializeNotificationStorage } from "../notifications/notification.indexes.js";
import { createSupportReplyNotification } from "../notifications/notification.service.js";
import type {
  ContactMessageDocument,
  ContactThreadMessageDocument,
} from "../contact/contact.types.js";
import { initializeAdminStorage } from "./admin.indexes.js";
import { createAdminAuditEvent } from "./admin.repository.js";
import {
  AdminSupportConversationNotFoundError,
  AdminSupportGuestReplyUnavailableError,
  AdminSupportMessageLimitError,
  AdminSupportPersistenceError,
  AdminSupportSpamReplyBlockedError,
} from "./admin.support.errors.js";
import {
  appendAdminSupportMessage,
  findAdminSupportConversation,
  findAdminSupportConversations,
  findAdminSupportThreadMessages,
  updateAdminSupportStatus,
} from "./admin.support.repository.js";
import type {
  AdminSupportConversationSummary,
  AdminSupportConversationThread,
  AdminSupportListQuery,
  AdminSupportListResult,
} from "./admin.support.types.js";
import {
  adminSupportListQuerySchema,
  adminSupportReferenceSchema,
  adminSupportReplySchema,
  adminSupportStatusSchema,
} from "./admin.support.validation.js";
import type { AdminSessionContext } from "./admin.types.js";

function createPreview(value: string): string {
  const compact = value.replace(/\s+/gu, " ").trim();

  return compact.length > 120
    ? `${compact.slice(0, 117).trimEnd()}…`
    : compact;
}

function toSummary(
  document: ContactMessageDocument,
): AdminSupportConversationSummary {
  return {
    referenceId: document.referenceId,
    category: document.category,
    subject: document.subject,
    status: document.status,
    preview: createPreview(document.lastMessagePreview),
    messageCount: document.messageCount,
    lastSenderRole: document.lastSenderRole,
    lastMessageAt: document.lastMessageAt,
    createdAt: document.createdAt,
    requester: {
      userId: document.userId?.toHexString() ?? null,
      name: document.name,
      email: document.email,
      linkedToAccount: document.userId !== undefined,
    },
  };
}

async function ensureStorage(): Promise<void> {
  await Promise.all([
    initializeContactStorage(),
    initializeNotificationStorage(),
    initializeAdminStorage(),
  ]);
}

async function loadThreadFromDocument(
  conversation: ContactMessageDocument,
): Promise<AdminSupportConversationThread> {
  const storedMessages = await findAdminSupportThreadMessages(
    conversation._id,
  );

  const hasStoredInitialMessage = storedMessages.some(
    (message) =>
      message.senderRole === "user" &&
      message.createdAt.getTime() === conversation.createdAt.getTime() &&
      message.body === conversation.message,
  );

  const messages = [
    ...(hasStoredInitialMessage
      ? []
      : [
          {
            id: `initial-${conversation._id.toHexString()}`,
            senderRole: "user" as const,
            body: conversation.message,
            createdAt: conversation.createdAt,
          },
        ]),
    ...storedMessages.map((message) => ({
      id: message._id.toHexString(),
      senderRole: message.senderRole,
      body: message.body,
      createdAt: message.createdAt,
    })),
  ].sort((first, second) => {
    const difference =
      first.createdAt.getTime() - second.createdAt.getTime();

    return difference !== 0
      ? difference
      : first.id.localeCompare(second.id);
  });

  const linkedToAccount = conversation.userId !== undefined;

  return {
    conversation: {
      ...toSummary(conversation),
      updatedAt: conversation.updatedAt,
      resolvedAt: conversation.resolvedAt,
    },
    messages,
    delivery: linkedToAccount
      ? {
          channel: "in-app",
          available: true,
          message:
            "Administrator replies appear in the requester’s FilmGeezer Contact conversation.",
        }
      : {
          channel: "email",
          available: false,
          message:
            "Transactional guest-email delivery is not configured yet. Do not create a reply that the requester cannot receive.",
        },
  };
}

export async function listAdminSupportConversations(
  input: unknown,
): Promise<AdminSupportListResult> {
  const query = adminSupportListQuerySchema.parse(input);

  try {
    await ensureStorage();
    const result = await findAdminSupportConversations(query);
    const totalPages = Math.max(
      1,
      Math.ceil(result.totalItems / query.pageSize),
    );

    return {
      items: result.documents.map(toSummary),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: result.totalItems,
        totalPages,
      },
    };
  } catch (error) {
    throw new AdminSupportPersistenceError(
      "The support inbox could not be loaded.",
      { cause: error },
    );
  }
}

export async function getAdminSupportConversation(
  referenceInput: unknown,
): Promise<AdminSupportConversationThread> {
  const referenceId = adminSupportReferenceSchema.parse(referenceInput);

  try {
    await ensureStorage();
    const conversation = await findAdminSupportConversation(referenceId);

    if (!conversation) {
      throw new AdminSupportConversationNotFoundError();
    }

    return loadThreadFromDocument(conversation);
  } catch (error) {
    if (error instanceof AdminSupportConversationNotFoundError) {
      throw error;
    }

    throw new AdminSupportPersistenceError(
      "The support conversation could not be loaded.",
      { cause: error },
    );
  }
}

export async function replyToAdminSupportConversation(
  admin: AdminSessionContext,
  referenceInput: unknown,
  input: unknown,
): Promise<AdminSupportConversationThread> {
  const referenceId = adminSupportReferenceSchema.parse(referenceInput);
  const parsedInput = adminSupportReplySchema.parse(input);

  try {
    await ensureStorage();
    const client = await getMongoClient();
    const session = client.startSession();
    const createdAt = new Date();

    try {
      await session.withTransaction(async () => {
        const conversation = await findAdminSupportConversation(
          referenceId,
          session,
        );

        if (!conversation) {
          throw new AdminSupportConversationNotFoundError();
        }

        const targetUserId = conversation.userId;

        if (!targetUserId) {
          throw new AdminSupportGuestReplyUnavailableError();
        }

        if (conversation.status === "spam") {
          throw new AdminSupportSpamReplyBlockedError();
        }

        if (conversation.messageCount >= CONTACT_THREAD_MESSAGE_LIMIT) {
          throw new AdminSupportMessageLimitError();
        }

        const message: ContactThreadMessageDocument = {
          _id: new ObjectId(),
          schemaVersion: CONTACT_THREAD_MESSAGE_SCHEMA_VERSION,
          conversationId: conversation._id,
          senderRole: "admin",
          senderId: admin.userId,
          body: parsedInput.message,
          createdAt,
        };

        const appended = await appendAdminSupportMessage(
          {
            conversationId: conversation._id,
            message,
            createdAt,
            maximumMessages: CONTACT_THREAD_MESSAGE_LIMIT,
          },
          session,
        );

        if (!appended) {
          throw new AdminSupportMessageLimitError();
        }

        await createSupportReplyNotification(
          {
            userId: targetUserId,
            messageId: message._id,
            referenceId,
            subject: conversation.subject,
            createdAt,
          },
          session,
        );

        await createAdminAuditEvent(
          {
            auditEventId: new ObjectId(),
            actorUserId: admin.userId,
            targetUserId,
            eventType: "admin-support-replied",
            outcome: "success",
            details: {
              referenceId,
              adminSessionId: admin.sessionId.toHexString(),
              previousStatus: conversation.status,
              nextStatus: "in-review",
              messageLength: parsedInput.message.length,
            },
            createdAt,
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    return getAdminSupportConversation(referenceId);
  } catch (error) {
    if (
      error instanceof AdminSupportConversationNotFoundError ||
      error instanceof AdminSupportGuestReplyUnavailableError ||
      error instanceof AdminSupportMessageLimitError ||
      error instanceof AdminSupportSpamReplyBlockedError
    ) {
      throw error;
    }

    throw new AdminSupportPersistenceError(
      "The administrator reply could not be saved.",
      { cause: error },
    );
  }
}

export async function changeAdminSupportStatus(
  admin: AdminSessionContext,
  referenceInput: unknown,
  input: unknown,
): Promise<AdminSupportConversationThread> {
  const referenceId = adminSupportReferenceSchema.parse(referenceInput);
  const parsedInput = adminSupportStatusSchema.parse(input);

  try {
    await ensureStorage();
    const client = await getMongoClient();
    const session = client.startSession();
    const updatedAt = new Date();

    try {
      await session.withTransaction(async () => {
        const conversation = await findAdminSupportConversation(
          referenceId,
          session,
        );

        if (!conversation) {
          throw new AdminSupportConversationNotFoundError();
        }

        if (conversation.status === parsedInput.status) {
          return;
        }

        const updated = await updateAdminSupportStatus(
          {
            conversationId: conversation._id,
            previousStatus: conversation.status,
            nextStatus: parsedInput.status,
            updatedAt,
          },
          session,
        );

        if (!updated) {
          throw new AdminSupportPersistenceError(
            "The support request changed before its status could be updated.",
          );
        }

        await createAdminAuditEvent(
          {
            auditEventId: new ObjectId(),
            actorUserId: admin.userId,
            targetUserId: conversation.userId ?? null,
            eventType: "admin-support-status-updated",
            outcome: "success",
            details: {
              referenceId,
              adminSessionId: admin.sessionId.toHexString(),
              previousStatus: conversation.status,
              nextStatus: parsedInput.status,
            },
            createdAt: updatedAt,
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    return getAdminSupportConversation(referenceId);
  } catch (error) {
    if (
      error instanceof AdminSupportConversationNotFoundError ||
      error instanceof AdminSupportPersistenceError
    ) {
      throw error;
    }

    throw new AdminSupportPersistenceError(
      "The support-request status could not be updated.",
      { cause: error },
    );
  }
}
