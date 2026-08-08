import type { ClientSession, ObjectId } from "mongodb";

import {
  SUPPORT_EMAIL_ALERT_LEASE_MILLISECONDS,
  SUPPORT_EMAIL_ALERT_QUIET_PERIOD_MILLISECONDS,
  SUPPORT_EMAIL_ALERT_SCHEMA_VERSION,
} from "./supportEmailAlert.constants.js";
import { getSupportEmailAlertCollection } from "./supportEmailAlert.collection.js";
import type { SupportEmailAlertDocument } from "./supportEmailAlert.types.js";

export async function scheduleSupportEmailAlert(
  input: {
    conversationId: ObjectId;
    userId: ObjectId;
    referenceId: string;
    messageId: ObjectId;
    createdAt: Date;
  },
  session: ClientSession,
): Promise<void> {
  const collection = await getSupportEmailAlertCollection();
  const sendAfter = new Date(
    input.createdAt.getTime() + SUPPORT_EMAIL_ALERT_QUIET_PERIOD_MILLISECONDS,
  );

  await collection.updateOne(
    { conversationId: input.conversationId },
    {
      $setOnInsert: {
        _id: input.conversationId,
        schemaVersion: SUPPORT_EMAIL_ALERT_SCHEMA_VERSION,
        conversationId: input.conversationId,
        leaseToken: null,
        leaseExpiresAt: null,
        lastAttemptAt: null,
        lastErrorAt: null,
        lastSentAt: null,
        lastSentMessageId: null,
        createdAt: input.createdAt,
      },
      $set: {
        userId: input.userId,
        referenceId: input.referenceId,
        latestMessageId: input.messageId,
        lastPendingAt: input.createdAt,
        sendAfter,
        failureCount: 0,
        updatedAt: input.createdAt,
      },
      $inc: {
        pendingMessageCount: 1,
        batchSequence: 1,
      },
    },
    {
      upsert: true,
      session,
    },
  );
}

export async function cancelPendingSupportEmailAlert(
  input: {
    conversationId: ObjectId;
    userId: ObjectId;
    cancelledAt: Date;
  },
  session: ClientSession,
): Promise<void> {
  const collection = await getSupportEmailAlertCollection();

  await collection.updateOne(
    {
      conversationId: input.conversationId,
      userId: input.userId,
      pendingMessageCount: { $gt: 0 },
    },
    {
      $set: {
        pendingMessageCount: 0,
        leaseToken: null,
        leaseExpiresAt: null,
        failureCount: 0,
        updatedAt: input.cancelledAt,
      },
      $inc: {
        batchSequence: 1,
      },
    },
    { session },
  );
}

export async function findSupportEmailAlertByConversationId(
  conversationId: ObjectId,
): Promise<SupportEmailAlertDocument | null> {
  const collection = await getSupportEmailAlertCollection();
  return collection.findOne({ conversationId });
}

export async function claimDueSupportEmailAlert(input: {
  now: Date;
  leaseToken: string;
}): Promise<SupportEmailAlertDocument | null> {
  const collection = await getSupportEmailAlertCollection();
  const leaseExpiresAt = new Date(
    input.now.getTime() + SUPPORT_EMAIL_ALERT_LEASE_MILLISECONDS,
  );

  return collection.findOneAndUpdate(
    {
      pendingMessageCount: { $gt: 0 },
      sendAfter: { $lte: input.now },
      $or: [
        { leaseToken: null },
        { leaseExpiresAt: null },
        { leaseExpiresAt: { $lte: input.now } },
      ],
    },
    {
      $set: {
        leaseToken: input.leaseToken,
        leaseExpiresAt,
        lastAttemptAt: input.now,
        updatedAt: input.now,
      },
    },
    {
      sort: { sendAfter: 1, _id: 1 },
      returnDocument: "after",
    },
  );
}

export async function isSupportEmailAlertClaimCurrent(input: {
  alertId: ObjectId;
  leaseToken: string;
  batchSequence: number;
}): Promise<boolean> {
  const collection = await getSupportEmailAlertCollection();

  const document = await collection.findOne(
    {
      _id: input.alertId,
      leaseToken: input.leaseToken,
      batchSequence: input.batchSequence,
      pendingMessageCount: { $gt: 0 },
    },
    {
      projection: { _id: 1 },
    },
  );

  return document !== null;
}

export async function markSupportEmailAlertSent(input: {
  alertId: ObjectId;
  leaseToken: string;
  claimedMessageCount: number;
  latestMessageId: ObjectId;
  sentAt: Date;
}): Promise<boolean> {
  const collection = await getSupportEmailAlertCollection();

  const result = await collection.updateOne(
    {
      _id: input.alertId,
      leaseToken: input.leaseToken,
      pendingMessageCount: { $gte: input.claimedMessageCount },
    },
    {
      $inc: {
        pendingMessageCount: -input.claimedMessageCount,
      },
      $set: {
        leaseToken: null,
        leaseExpiresAt: null,
        failureCount: 0,
        lastErrorAt: null,
        lastSentAt: input.sentAt,
        lastSentMessageId: input.latestMessageId,
        updatedAt: input.sentAt,
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function markSupportEmailAlertFailed(input: {
  alertId: ObjectId;
  leaseToken: string;
  batchSequence: number;
  failedAt: Date;
  retryAt: Date;
}): Promise<boolean> {
  const collection = await getSupportEmailAlertCollection();

  const result = await collection.updateOne(
    {
      _id: input.alertId,
      leaseToken: input.leaseToken,
      batchSequence: input.batchSequence,
    },
    {
      $set: {
        leaseToken: null,
        leaseExpiresAt: null,
        sendAfter: input.retryAt,
        lastErrorAt: input.failedAt,
        updatedAt: input.failedAt,
      },
      $inc: {
        failureCount: 1,
      },
    },
  );

  return result.modifiedCount === 1;
}

export async function discardSupportEmailAlert(input: {
  alertId: ObjectId;
  leaseToken: string;
  discardedAt: Date;
}): Promise<void> {
  const collection = await getSupportEmailAlertCollection();

  await collection.updateOne(
    {
      _id: input.alertId,
      leaseToken: input.leaseToken,
    },
    {
      $set: {
        pendingMessageCount: 0,
        leaseToken: null,
        leaseExpiresAt: null,
        failureCount: 0,
        updatedAt: input.discardedAt,
      },
      $inc: {
        batchSequence: 1,
      },
    },
  );
}

export async function releaseSupportEmailAlertLease(input: {
  alertId: ObjectId;
  leaseToken: string;
  releasedAt: Date;
}): Promise<void> {
  const collection = await getSupportEmailAlertCollection();

  await collection.updateOne(
    {
      _id: input.alertId,
      leaseToken: input.leaseToken,
    },
    {
      $set: {
        leaseToken: null,
        leaseExpiresAt: null,
        updatedAt: input.releasedAt,
      },
    },
  );
}
