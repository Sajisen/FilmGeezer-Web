import type { ObjectId } from "mongodb";

import type { SUPPORT_EMAIL_ALERT_SCHEMA_VERSION } from "./supportEmailAlert.constants.js";

export interface SupportEmailAlertDocument {
  _id: ObjectId;
  schemaVersion: typeof SUPPORT_EMAIL_ALERT_SCHEMA_VERSION;
  conversationId: ObjectId;
  userId: ObjectId;
  referenceId: string;
  latestMessageId: ObjectId;
  pendingMessageCount: number;
  batchSequence: number;
  lastPendingAt: Date;
  sendAfter: Date;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  failureCount: number;
  lastAttemptAt: Date | null;
  lastErrorAt: Date | null;
  lastSentAt: Date | null;
  lastSentMessageId: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
