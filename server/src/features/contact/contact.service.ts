import { randomBytes } from "node:crypto";

import {
  MongoServerError,
  ObjectId,
} from "mongodb";

import { getMongoClient } from "../../config/database.js";

import {
  initializeSupportEmailAlertStorage,
} from "../email/supportEmailAlert.indexes.js";
import {
  cancelAccountSupportReplyEmailAlert,
} from "../email/supportEmailAlert.service.js";

import {
  CONTACT_MESSAGE_SCHEMA_VERSION,
  CONTACT_RECENT_CONVERSATION_LIMIT,
  CONTACT_THREAD_MESSAGE_LIMIT,
  CONTACT_THREAD_MESSAGE_SCHEMA_VERSION,
} from "./contact.constants.js";

import {
  ContactConversationMessageLimitError,
  ContactConversationNotFoundError,
  ContactPersistenceError,
} from "./contact.errors.js";

import { initializeContactStorage } from "./contact.indexes.js";

import {
  appendOwnedContactConversationMessage,
  findContactThreadMessages,
  findOwnedContactConversation,
  findRecentContactConversations,
  insertContactConversation,
  insertContactThreadMessage,
} from "./contact.repository.js";

import {
  contactReferenceSchema,
  contactReplySchema,
  contactSubmissionSchema,
} from "./contact.validation.js";

import type {
  ContactConversationSummary,
  ContactConversationThread,
  ContactMessageDocument,
  ContactSubmissionResult,
  ContactThreadMessageDocument,
} from "./contact.types.js";

function createReferenceId(createdAt: Date): string {
  const datePart = createdAt
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "");

  const randomPart = randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `FG-${datePart}-${randomPart}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11_000;
}

function createDecoyResult(): ContactSubmissionResult {
  const submittedAt = new Date();

  return {
    referenceId: createReferenceId(submittedAt),
    submittedAt,
    stored: false,
    linkedToAccount: false,
  };
}

function createPreview(message: string): string {
  const compact = message.replace(/\s+/gu, " ").trim();

  return compact.length > 110
    ? `${compact.slice(0, 107).trimEnd()}…`
    : compact;
}

function toConversationSummary(
  document: ContactMessageDocument,
): ContactConversationSummary {
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
  };
}

export async function submitContactMessage(
  input: unknown,
  accountUserId?: ObjectId,
): Promise<ContactSubmissionResult> {
  const parsedInput = contactSubmissionSchema.parse(input);

  /*
   * The hidden field is intentionally never populated by the real UI.
   * Automated submissions receive the same success shape without being
   * persisted, so the endpoint does not teach a bot how it was detected.
   */
  if (parsedInput.companyWebsite.trim().length > 0) {
    return createDecoyResult();
  }

  try {
    await initializeContactStorage();
    const client = await getMongoClient();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const createdAt = new Date();
      const referenceId = createReferenceId(createdAt);
      const conversationId = new ObjectId();

      const conversation: ContactMessageDocument = {
        _id: conversationId,
        schemaVersion: CONTACT_MESSAGE_SCHEMA_VERSION,
        referenceId,
        ...(accountUserId ? { userId: accountUserId } : {}),
        category: parsedInput.category,
        name: parsedInput.name,
        email: parsedInput.email,
        emailNormalized: parsedInput.email,
        subject: parsedInput.subject,
        message: parsedInput.message,
        status: "new",
        source: "filmgeezer-web",
        messageCount: 1,
        lastSenderRole: "user",
        lastMessagePreview: parsedInput.message,
        lastMessageAt: createdAt,
        createdAt,
        updatedAt: createdAt,
        resolvedAt: null,
      };

      const firstMessage: ContactThreadMessageDocument = {
        _id: new ObjectId(),
        schemaVersion: CONTACT_THREAD_MESSAGE_SCHEMA_VERSION,
        conversationId,
        senderRole: "user",
        ...(accountUserId ? { senderId: accountUserId } : {}),
        body: parsedInput.message,
        createdAt,
      };

      const session = client.startSession();

      try {
        await session.withTransaction(async () => {
          await insertContactConversation(conversation, session);
          await insertContactThreadMessage(firstMessage, session);
        });

        console.info("[contact] New support request stored.", {
          referenceId,
          category: conversation.category,
          linkedToAccount: Boolean(accountUserId),
        });

        return {
          referenceId,
          submittedAt: createdAt,
          stored: true,
          linkedToAccount: Boolean(accountUserId),
        };
      } catch (error) {
        if (isDuplicateKeyError(error) && attempt < 2) {
          continue;
        }

        throw error;
      } finally {
        await session.endSession();
      }
    }

    throw new Error("A unique contact reference could not be generated.");
  } catch (error) {
    throw new ContactPersistenceError(undefined, {
      cause: error,
    });
  }
}

export async function getRecentContactConversations(
  userId: ObjectId,
): Promise<ContactConversationSummary[]> {
  try {
    await initializeContactStorage();

    const conversations = await findRecentContactConversations(
      userId,
      CONTACT_RECENT_CONVERSATION_LIMIT,
    );

    return conversations.map(toConversationSummary);
  } catch (error) {
    throw new ContactPersistenceError(
      "Your recent support requests could not be loaded.",
      { cause: error },
    );
  }
}

export async function getContactConversationThread(
  userId: ObjectId,
  referenceInput: unknown,
): Promise<ContactConversationThread> {
  const referenceId = contactReferenceSchema.parse(referenceInput);

  try {
    await initializeContactStorage();

    const conversation = await findOwnedContactConversation(
      userId,
      referenceId,
    );

    if (!conversation) {
      throw new ContactConversationNotFoundError();
    }

    const storedMessages = await findContactThreadMessages(
      conversation._id,
      CONTACT_THREAD_MESSAGE_LIMIT,
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
      const dateDifference =
        first.createdAt.getTime() - second.createdAt.getTime();

      return dateDifference !== 0
        ? dateDifference
        : first.id.localeCompare(second.id);
    });

    return {
      conversation: {
        ...toConversationSummary(conversation),
        updatedAt: conversation.updatedAt,
      },
      messages,
    };
  } catch (error) {
    if (error instanceof ContactConversationNotFoundError) {
      throw error;
    }

    throw new ContactPersistenceError(
      "The support conversation could not be loaded.",
      { cause: error },
    );
  }
}

export async function replyToContactConversation(
  userId: ObjectId,
  referenceInput: unknown,
  input: unknown,
): Promise<ContactConversationThread> {
  const referenceId = contactReferenceSchema.parse(referenceInput);
  const parsedInput = contactReplySchema.parse(input);

  try {
    await Promise.all([
      initializeContactStorage(),
      initializeSupportEmailAlertStorage(),
    ]);

    const conversation = await findOwnedContactConversation(
      userId,
      referenceId,
    );

    if (!conversation) {
      throw new ContactConversationNotFoundError();
    }

    if (conversation.messageCount >= CONTACT_THREAD_MESSAGE_LIMIT) {
      throw new ContactConversationMessageLimitError();
    }

    const client = await getMongoClient();
    const session = client.startSession();
    const createdAt = new Date();

    const message: ContactThreadMessageDocument = {
      _id: new ObjectId(),
      schemaVersion: CONTACT_THREAD_MESSAGE_SCHEMA_VERSION,
      conversationId: conversation._id,
      senderRole: "user",
      senderId: userId,
      body: parsedInput.message,
      createdAt,
    };

    try {
      let appended = false;

      await session.withTransaction(async () => {
        appended = await appendOwnedContactConversationMessage(
          {
            conversationId: conversation._id,
            userId,
            message,
            updatedAt: createdAt,
            maximumMessages: CONTACT_THREAD_MESSAGE_LIMIT,
          },
          session,
        );

        if (appended) {
          /*
           * A user who replies in-app has already seen the conversation. Any
           * still-pending grouped email alert for earlier administrator
           * messages is no longer useful, so cancel it in the same transaction.
           */
          await cancelAccountSupportReplyEmailAlert(
            {
              conversationId: conversation._id,
              userId,
              cancelledAt: createdAt,
            },
            session,
          );
        }
      });

      if (!appended) {
        const current = await findOwnedContactConversation(
          userId,
          referenceId,
        );

        if (!current) {
          throw new ContactConversationNotFoundError();
        }

        throw new ContactConversationMessageLimitError();
      }
    } finally {
      await session.endSession();
    }

    return getContactConversationThread(userId, referenceId);
  } catch (error) {
    if (
      error instanceof ContactConversationNotFoundError ||
      error instanceof ContactConversationMessageLimitError
    ) {
      throw error;
    }

    throw new ContactPersistenceError(
      "The reply could not be saved.",
      { cause: error },
    );
  }
}
