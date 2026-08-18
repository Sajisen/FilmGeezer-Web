import { DATA_RETENTION_POLICY } from "../../config/dataRetention.js";
import { getUserNotificationsCollection } from "./notification.collection.js";

let notificationStoragePromise: Promise<void> | null = null;

async function createNotificationIndexes(): Promise<void> {
  const notifications = await getUserNotificationsCollection();

  await notifications.createIndexes([
    {
      key: {
        userId: 1,
        createdAt: -1,
        _id: -1,
      },
      name: "user_notifications_user_created_at",
    },
    {
      key: {
        userId: 1,
        readAt: 1,
        createdAt: -1,
      },
      name: "user_notifications_user_read_created_at",
    },
    {
      key: {
        userId: 1,
        dedupeKey: 1,
      },
      name: "user_notifications_user_dedupe_unique",
      unique: true,
    },
    {
      key: { createdAt: 1 },
      name: "user_notifications_created_at_ttl",
      expireAfterSeconds: DATA_RETENTION_POLICY.notificationsSeconds,
    },
  ]);
}

export function initializeNotificationStorage(): Promise<void> {
  if (!notificationStoragePromise) {
    notificationStoragePromise = createNotificationIndexes().catch(
      (error) => {
        notificationStoragePromise = null;
        throw error;
      },
    );
  }

  return notificationStoragePromise;
}
