import {
  ObjectId,
  type ClientSession,
  type Filter,
} from "mongodb";

import { getUserNotificationsCollection } from "./notification.collection.js";
import type {
  NotificationListQuery,
  UserNotificationDocument,
} from "./notification.types.js";

export async function upsertUserNotification(
  document: UserNotificationDocument,
  session?: ClientSession,
): Promise<void> {
  const notifications = await getUserNotificationsCollection();

  await notifications.updateOne(
    {
      userId: document.userId,
      dedupeKey: document.dedupeKey,
    },
    {
      $setOnInsert: document,
    },
    {
      upsert: true,
      session,
    },
  );
}

export async function findUserNotifications(
  userId: ObjectId,
  query: NotificationListQuery,
): Promise<{
  documents: UserNotificationDocument[];
  totalItems: number;
  unreadCount: number;
}> {
  const notifications = await getUserNotificationsCollection();
  const filter: Filter<UserNotificationDocument> = {
    userId,
    ...(query.filter === "unread" ? { readAt: null } : {}),
  };

  const [documents, totalItems, unreadCount] = await Promise.all([
    notifications
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .toArray(),
    notifications.countDocuments(filter),
    notifications.countDocuments({ userId, readAt: null }),
  ]);

  return {
    documents,
    totalItems,
    unreadCount,
  };
}

export async function findNotificationSummary(
  userId: ObjectId,
  limit: number,
): Promise<{
  documents: UserNotificationDocument[];
  unreadCount: number;
}> {
  const notifications = await getUserNotificationsCollection();

  const [documents, unreadCount] = await Promise.all([
    notifications
      .find({ userId })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .toArray(),
    notifications.countDocuments({ userId, readAt: null }),
  ]);

  return {
    documents,
    unreadCount,
  };
}

export async function findOwnedNotification(
  userId: ObjectId,
  notificationId: ObjectId,
): Promise<UserNotificationDocument | null> {
  const notifications = await getUserNotificationsCollection();

  return notifications.findOne({
    _id: notificationId,
    userId,
  });
}

export async function markOwnedNotificationRead(
  userId: ObjectId,
  notificationId: ObjectId,
  readAt: Date,
): Promise<boolean> {
  const notifications = await getUserNotificationsCollection();

  const result = await notifications.updateOne(
    {
      _id: notificationId,
      userId,
      readAt: null,
    },
    {
      $set: {
        readAt,
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function markAllOwnedNotificationsRead(
  userId: ObjectId,
  readAt: Date,
): Promise<number> {
  const notifications = await getUserNotificationsCollection();

  const result = await notifications.updateMany(
    {
      userId,
      readAt: null,
    },
    {
      $set: {
        readAt,
      },
    },
  );

  return result.modifiedCount;
}
