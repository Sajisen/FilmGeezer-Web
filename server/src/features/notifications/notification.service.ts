import {
  ObjectId,
  type ClientSession,
} from "mongodb";

import {
  NOTIFICATION_SCHEMA_VERSION,
} from "./notification.constants.js";
import {
  NotificationNotFoundError,
  NotificationPersistenceError,
} from "./notification.errors.js";
import { initializeNotificationStorage } from "./notification.indexes.js";
import {
  findNotificationSummary,
  findOwnedNotification,
  findUserNotifications,
  markAllOwnedNotificationsRead,
  markOwnedNotificationRead,
  upsertUserNotification,
} from "./notification.repository.js";
import type {
  NotificationListResult,
  NotificationSummaryResult,
  UserNotificationDocument,
  UserNotificationItem,
} from "./notification.types.js";
import {
  notificationIdSchema,
  notificationListQuerySchema,
  notificationSummaryQuerySchema,
} from "./notification.validation.js";

function toItem(
  document: UserNotificationDocument,
): UserNotificationItem {
  return {
    id: document._id.toHexString(),
    type: document.type,
    category: document.category,
    title: document.title,
    message: document.message,
    action: document.action,
    sourceReference: document.sourceReference,
    createdAt: document.createdAt,
    readAt: document.readAt,
  };
}

export async function createWelcomeNotification(
  input: {
    userId: ObjectId;
    createdAt: Date;
  },
  session: ClientSession,
): Promise<void> {
  await upsertUserNotification(
    {
      _id: new ObjectId(),
      schemaVersion: NOTIFICATION_SCHEMA_VERSION,
      userId: input.userId,
      type: "welcome",
      category: "account",
      title: "Welcome to FilmGeezer",
      message:
        "Your account is ready. Discover something worth watching, shape your recommendations, and keep every favourite in one place.",
      action: {
        kind: "welcome",
        label: "Open welcome",
        href: "/notifications",
      },
      dedupeKey: "account-welcome",
      sourceReference: null,
      createdAt: input.createdAt,
      readAt: null,
    },
    session,
  );
}

export async function createSupportReplyNotification(
  input: {
    userId: ObjectId;
    messageId: ObjectId;
    referenceId: string;
    subject: string;
    createdAt: Date;
  },
  session: ClientSession,
): Promise<void> {
  const compactSubject = input.subject.replace(/\s+/gu, " ").trim();
  const subjectCharacters = Array.from(compactSubject);
  const displayedSubject =
    subjectCharacters.length > 72
      ? `${subjectCharacters.slice(0, 69).join("").trimEnd()}…`
      : compactSubject;

  await upsertUserNotification(
    {
      _id: new ObjectId(),
      schemaVersion: NOTIFICATION_SCHEMA_VERSION,
      userId: input.userId,
      type: "support-reply",
      category: "support",
      title: "FilmGeezer Support replied",
      message: displayedSubject
        ? `There is a new reply to “${displayedSubject}”.`
        : `There is a new reply to support request ${input.referenceId}.`,
      action: {
        kind: "support-conversation",
        label: "View reply",
        href: `/contact?request=${encodeURIComponent(input.referenceId)}`,
      },
      dedupeKey: `support-reply:${input.messageId.toHexString()}`,
      sourceReference: input.referenceId,
      createdAt: input.createdAt,
      readAt: null,
    },
    session,
  );
}

export async function listNotifications(
  userId: ObjectId,
  input: unknown,
): Promise<NotificationListResult> {
  const query = notificationListQuerySchema.parse(input);

  try {
    await initializeNotificationStorage();
    const result = await findUserNotifications(userId, query);

    return {
      items: result.documents.map(toItem),
      unreadCount: result.unreadCount,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: result.totalItems,
        totalPages: Math.max(
          1,
          Math.ceil(result.totalItems / query.pageSize),
        ),
      },
    };
  } catch (error) {
    throw new NotificationPersistenceError(
      "Your notifications could not be loaded.",
      { cause: error },
    );
  }
}

export async function getNotificationSummary(
  userId: ObjectId,
  input: unknown,
): Promise<NotificationSummaryResult> {
  const query = notificationSummaryQuerySchema.parse(input);

  try {
    await initializeNotificationStorage();
    const result = await findNotificationSummary(userId, query.limit);

    return {
      items: result.documents.map(toItem),
      unreadCount: result.unreadCount,
    };
  } catch (error) {
    throw new NotificationPersistenceError(
      "Your notification summary could not be loaded.",
      { cause: error },
    );
  }
}

export async function getNotification(
  userId: ObjectId,
  input: unknown,
): Promise<UserNotificationItem> {
  const notificationId = new ObjectId(notificationIdSchema.parse(input));

  try {
    await initializeNotificationStorage();
    const notification = await findOwnedNotification(
      userId,
      notificationId,
    );

    if (!notification) {
      throw new NotificationNotFoundError();
    }

    return toItem(notification);
  } catch (error) {
    if (error instanceof NotificationNotFoundError) {
      throw error;
    }

    throw new NotificationPersistenceError(
      "The notification could not be loaded.",
      { cause: error },
    );
  }
}

export async function markNotificationRead(
  userId: ObjectId,
  input: unknown,
): Promise<{
  notification: UserNotificationItem;
  changed: boolean;
}> {
  const notificationId = new ObjectId(notificationIdSchema.parse(input));

  try {
    await initializeNotificationStorage();
    const existing = await findOwnedNotification(userId, notificationId);

    if (!existing) {
      throw new NotificationNotFoundError();
    }

    if (existing.readAt) {
      return {
        notification: toItem(existing),
        changed: false,
      };
    }

    const readAt = new Date();
    const changed = await markOwnedNotificationRead(
      userId,
      notificationId,
      readAt,
    );

    if (!changed) {
      const current = await findOwnedNotification(userId, notificationId);

      if (!current) {
        throw new NotificationNotFoundError();
      }

      return {
        notification: toItem(current),
        changed: false,
      };
    }

    return {
      notification: toItem({
        ...existing,
        readAt,
      }),
      changed: true,
    };
  } catch (error) {
    if (error instanceof NotificationNotFoundError) {
      throw error;
    }

    throw new NotificationPersistenceError(
      "The notification could not be updated.",
      { cause: error },
    );
  }
}

export async function markAllNotificationsRead(
  userId: ObjectId,
): Promise<{
  changedCount: number;
  readAt: Date;
}> {
  try {
    await initializeNotificationStorage();
    const readAt = new Date();
    const changedCount = await markAllOwnedNotificationsRead(
      userId,
      readAt,
    );

    return {
      changedCount,
      readAt,
    };
  } catch (error) {
    throw new NotificationPersistenceError(
      "Your notifications could not be updated.",
      { cause: error },
    );
  }
}
