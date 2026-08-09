import { getSupportEmailAlertCollection } from "./supportEmailAlert.collection.js";

let initializePromise: Promise<void> | null = null;

async function createIndexes(): Promise<void> {
  const collection = await getSupportEmailAlertCollection();

  await collection.createIndexes([
    {
      key: { conversationId: 1 },
      name: "support_email_alert_conversation_unique",
      unique: true,
    },
    {
      key: {
        pendingMessageCount: 1,
        sendAfter: 1,
        leaseExpiresAt: 1,
      },
      name: "support_email_alert_due_scan",
    },
    {
      key: { userId: 1, updatedAt: -1 },
      name: "support_email_alert_user_updated_at",
    },
  ]);
}

export function initializeSupportEmailAlertStorage(): Promise<void> {
  if (!initializePromise) {
    initializePromise = createIndexes().catch((error) => {
      initializePromise = null;
      throw error;
    });
  }

  return initializePromise;
}
