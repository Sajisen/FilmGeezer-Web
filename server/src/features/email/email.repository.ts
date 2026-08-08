import {
  ObjectId,
} from "mongodb";

import {
  getEmailDeliveryCollection,
} from "./email.collection.js";
import type {
  EmailDeliveryDocument,
  EmailDeliveryStatus,
  TransactionalEmailKind,
  TransactionalEmailSource,
} from "./email.types.js";

export async function findEmailDeliveryByIdempotencyKey(
  idempotencyKey: string,
): Promise<EmailDeliveryDocument | null> {
  const collection = await getEmailDeliveryCollection();
  return collection.findOne({ idempotencyKey });
}

export async function upsertPendingEmailDelivery(input: {
  provider: "development" | "resend";
  kind: TransactionalEmailKind;
  idempotencyKey: string;
  recipientDomain: string;
  source: TransactionalEmailSource;
  createdAt: Date;
}): Promise<EmailDeliveryDocument> {
  const collection = await getEmailDeliveryCollection();

  await collection.updateOne(
    { idempotencyKey: input.idempotencyKey },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        schemaVersion: 1,
        provider: input.provider,
        kind: input.kind,
        idempotencyKey: input.idempotencyKey,
        providerEmailId: null,
        recipientDomain: input.recipientDomain,
        sourceType: input.source.type,
        sourceId: input.source.id,
        userId: input.source.userId ?? null,
        status: "pending",
        providerEventId: null,
        providerEventAt: null,
        createdAt: input.createdAt,
        updatedAt: input.createdAt,
      },
    },
    { upsert: true },
  );

  const document = await collection.findOne({
    idempotencyKey: input.idempotencyKey,
  });

  if (!document) {
    throw new Error("The transactional email delivery record was not created.");
  }

  return document;
}

export async function markEmailDeliverySubmitted(input: {
  idempotencyKey: string;
  providerEmailId: string | null;
  submittedAt: Date;
}): Promise<void> {
  const collection = await getEmailDeliveryCollection();

  if (input.providerEmailId) {
    await collection.updateOne(
      {
        idempotencyKey: input.idempotencyKey,
        providerEmailId: null,
      },
      {
        $set: {
          providerEmailId: input.providerEmailId,
          updatedAt: input.submittedAt,
        },
      },
    );
  }

  /*
   * A delivery webhook can arrive immediately after Resend accepts a message.
   * Only advance pending/failed local attempts to submitted; never downgrade a
   * delivery state that a faster webhook has already moved further forward.
   */
  await collection.updateOne(
    {
      idempotencyKey: input.idempotencyKey,
      status: { $in: ["pending", "failed"] },
    },
    {
      $set: {
        status: "submitted",
        providerEventAt: input.submittedAt,
        updatedAt: input.submittedAt,
      },
    },
  );
}

export async function markEmailDeliveryFailed(input: {
  idempotencyKey: string;
  failedAt: Date;
}): Promise<void> {
  const collection = await getEmailDeliveryCollection();

  await collection.updateOne(
    {
      idempotencyKey: input.idempotencyKey,
      status: { $in: ["pending", "submitted"] },
    },
    {
      $set: {
        status: "failed",
        providerEventAt: input.failedAt,
        updatedAt: input.failedAt,
      },
    },
  );
}

export async function updateEmailDeliveryFromProviderEvent(input: {
  deliveryId: ObjectId | null;
  providerEmailId: string;
  providerEventId: string;
  status: EmailDeliveryStatus;
  eventAt: Date;
}): Promise<boolean> {
  const collection = await getEmailDeliveryCollection();

  const identityFilter = input.deliveryId
    ? {
        _id: input.deliveryId,
        provider: "resend" as const,
        $or: [
          { providerEmailId: null },
          { providerEmailId: input.providerEmailId },
        ],
      }
    : {
        provider: "resend" as const,
        providerEmailId: input.providerEmailId,
      };

  const result = await collection.updateOne(
    {
      $and: [
        identityFilter,
        {
          providerEventId: { $ne: input.providerEventId },
        },
        {
          $or: [
            { providerEventAt: null },
            { providerEventAt: { $lte: input.eventAt } },
          ],
        },
      ],
    },
    {
      $set: {
        providerEmailId: input.providerEmailId,
        providerEventId: input.providerEventId,
        status: input.status,
        providerEventAt: input.eventAt,
        updatedAt: new Date(),
      },
    },
  );

  return result.modifiedCount > 0;
}

export async function findLatestEmailDeliveryForSource(input: {
  sourceType: TransactionalEmailSource["type"];
  sourceId: string;
}): Promise<EmailDeliveryDocument | null> {
  const collection = await getEmailDeliveryCollection();

  return collection.findOne(
    {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
    {
      sort: { createdAt: -1 },
    },
  );
}
