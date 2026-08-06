import type { Collection } from "mongodb";

import { getWebDatabase } from "../../config/database.js";
import { NOTIFICATION_COLLECTION_NAME } from "./notification.constants.js";
import type { UserNotificationDocument } from "./notification.types.js";

export async function getUserNotificationsCollection(): Promise<
  Collection<UserNotificationDocument>
> {
  const database = await getWebDatabase();

  return database.collection<UserNotificationDocument>(
    NOTIFICATION_COLLECTION_NAME,
  );
}
