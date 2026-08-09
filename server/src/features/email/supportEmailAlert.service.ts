import { randomUUID } from "node:crypto";

import type { ClientSession, ObjectId } from "mongodb";

import { getContactMessagesCollection } from "../contact/contact.collection.js";
import { findActiveUserById } from "../auth/repositories/authUser.repository.js";
import {
  SUPPORT_EMAIL_ALERT_MAX_BATCHES_PER_PASS,
  SUPPORT_EMAIL_ALERT_RETRY_BASE_MILLISECONDS,
  SUPPORT_EMAIL_ALERT_RETRY_MAX_MILLISECONDS,
} from "./supportEmailAlert.constants.js";
import {
  cancelPendingSupportEmailAlert,
  claimDueSupportEmailAlert,
  discardSupportEmailAlert,
  isSupportEmailAlertClaimCurrent,
  markSupportEmailAlertFailed,
  markSupportEmailAlertSent,
  releaseSupportEmailAlertLease,
  scheduleSupportEmailAlert,
} from "./supportEmailAlert.repository.js";
import { sendSupportReplyEmail } from "./email.support.js";

export async function queueAccountSupportReplyEmailAlert(
  input: {
    conversationId: ObjectId;
    userId: ObjectId;
    referenceId: string;
    messageId: ObjectId;
    createdAt: Date;
  },
  session: ClientSession,
): Promise<void> {
  await scheduleSupportEmailAlert(input, session);
}

export async function cancelAccountSupportReplyEmailAlert(
  input: {
    conversationId: ObjectId;
    userId: ObjectId;
    cancelledAt: Date;
  },
  session: ClientSession,
): Promise<void> {
  await cancelPendingSupportEmailAlert(input, session);
}

function createRetryAt(failureCount: number, failedAt: Date): Date {
  const exponent = Math.min(Math.max(failureCount, 0), 4);
  const delay = Math.min(
    SUPPORT_EMAIL_ALERT_RETRY_BASE_MILLISECONDS * 2 ** exponent,
    SUPPORT_EMAIL_ALERT_RETRY_MAX_MILLISECONDS,
  );

  return new Date(failedAt.getTime() + delay);
}

async function processClaimedSupportEmailAlert(): Promise<boolean> {
  const now = new Date();
  const leaseToken = randomUUID();
  const alert = await claimDueSupportEmailAlert({ now, leaseToken });

  if (!alert) {
    return false;
  }

  const claimedMessageCount = alert.pendingMessageCount;
  const claimedBatchSequence = alert.batchSequence;
  const claimedLatestMessageId = alert.latestMessageId;

  try {
    const conversations = await getContactMessagesCollection();
    const conversation = await conversations.findOne({
      _id: alert.conversationId,
      userId: alert.userId,
    });

    if (!conversation) {
      await discardSupportEmailAlert({
        alertId: alert._id,
        leaseToken,
        discardedAt: new Date(),
      });
      return true;
    }

    const currentUser = await findActiveUserById(alert.userId);
    const recipientEmail = currentUser?.emailDisplay ?? conversation.email;
    const displayName = currentUser?.displayName ?? conversation.name;

    const claimIsCurrent = await isSupportEmailAlertClaimCurrent({
      alertId: alert._id,
      leaseToken,
      batchSequence: claimedBatchSequence,
    });

    if (!claimIsCurrent) {
      await releaseSupportEmailAlertLease({
        alertId: alert._id,
        leaseToken,
        releasedAt: new Date(),
      });
      return true;
    }

    await sendSupportReplyEmail({
      messageId: claimedLatestMessageId,
      userId: alert.userId,
      recipientEmail,
      displayName,
      referenceId: conversation.referenceId,
      subject: conversation.subject,
      replyBody: "",
      replyCount: claimedMessageCount,
      idempotencyKey: `support-reply-account/${alert.conversationId.toHexString()}/${claimedBatchSequence}`,
    });

    const sentAt = new Date();
    const completed = await markSupportEmailAlertSent({
      alertId: alert._id,
      leaseToken,
      claimedMessageCount,
      latestMessageId: claimedLatestMessageId,
      sentAt,
    });

    if (!completed) {
      /*
       * A new administrator reply or a user response can change the batching
       * record while Resend is accepting the email. Release any surviving
       * lease without touching the newer quiet-period schedule.
       */
      await releaseSupportEmailAlertLease({
        alertId: alert._id,
        leaseToken,
        releasedAt: sentAt,
      });
    }

    console.info("[support-email] Grouped account alert submitted.", {
      referenceId: conversation.referenceId,
      replyCount: claimedMessageCount,
    });
  } catch (error) {
    const failedAt = new Date();
    const retryAt = createRetryAt(alert.failureCount, failedAt);

    try {
      const failureRecorded = await markSupportEmailAlertFailed({
        alertId: alert._id,
        leaseToken,
        batchSequence: claimedBatchSequence,
        failedAt,
        retryAt,
      });

      if (!failureRecorded) {
        await releaseSupportEmailAlertLease({
          alertId: alert._id,
          leaseToken,
          releasedAt: failedAt,
        });
      }
    } catch (stateError) {
      console.error("[support-email] Failed alert state could not be updated.", {
        name: stateError instanceof Error ? stateError.name : "UnknownError",
        referenceId: alert.referenceId,
      });
    }

    console.error("[support-email] Grouped account alert could not be sent.", {
      name: error instanceof Error ? error.name : "UnknownError",
      referenceId: alert.referenceId,
    });
  }

  return true;
}

export async function processDueSupportEmailAlerts(): Promise<void> {
  for (
    let processed = 0;
    processed < SUPPORT_EMAIL_ALERT_MAX_BATCHES_PER_PASS;
    processed += 1
  ) {
    const found = await processClaimedSupportEmailAlert();

    if (!found) {
      return;
    }
  }
}
