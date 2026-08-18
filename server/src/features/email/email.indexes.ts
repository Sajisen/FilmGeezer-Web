import { DATA_RETENTION_POLICY } from "../../config/dataRetention.js";

import {
  getEmailDeliveryCollection,
} from "./email.collection.js";

let initializePromise: Promise<void> | null = null;

async function createIndexes(): Promise<void> {
  const collection = await getEmailDeliveryCollection();

  await collection.createIndexes([
    {
      key: { idempotencyKey: 1 },
      name: "email_delivery_idempotency_unique",
      unique: true,
    },
    {
      key: { providerEmailId: 1 },
      name: "email_delivery_provider_id_unique",
      unique: true,
      partialFilterExpression: {
        providerEmailId: { $type: "string" },
      },
    },
    {
      key: { sourceType: 1, sourceId: 1, createdAt: -1 },
      name: "email_delivery_source_created_at",
    },
    {
      key: { status: 1, updatedAt: -1 },
      name: "email_delivery_status_updated_at",
    },
    {
      key: { userId: 1, createdAt: -1 },
      name: "email_delivery_user_created_at",
      partialFilterExpression: {
        userId: { $type: "objectId" },
      },
    },
    {
      key: { updatedAt: 1 },
      name: "email_delivery_updated_at_ttl",
      expireAfterSeconds: DATA_RETENTION_POLICY.emailDeliverySeconds,
    },
  ]);
}

export function initializeEmailDeliveryStorage(): Promise<void> {
  if (!initializePromise) {
    initializePromise = createIndexes().catch((error) => {
      initializePromise = null;
      throw error;
    });
  }

  return initializePromise;
}
