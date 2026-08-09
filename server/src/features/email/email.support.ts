import type { ObjectId } from "mongodb";

import { env } from "../../config/env.js";
import {
  createAccountSupportReplyTemplate,
  createGuestSupportReplyTemplate,
} from "./email.templates.js";
import {
  sendTransactionalEmail,
} from "./email.service.js";

export async function sendSupportReplyEmail(input: {
  messageId: ObjectId;
  userId: ObjectId | null;
  recipientEmail: string;
  displayName: string;
  referenceId: string;
  subject: string;
  replyBody: string;
  replyCount?: number;
  idempotencyKey?: string;
}): Promise<void> {
  const idempotencyKey =
    input.idempotencyKey ??
    `support-reply/${input.messageId.toHexString()}`;
  const source = {
    type: "support-reply" as const,
    id: input.messageId.toHexString(),
    userId: input.userId,
  };

  if (input.userId) {
    const conversationUrl = new URL("/contact", `${env.CLIENT_APP_ORIGIN}/`);
    conversationUrl.searchParams.set("request", input.referenceId);

    const template = createAccountSupportReplyTemplate({
      displayName: input.displayName,
      referenceId: input.referenceId,
      subject: input.subject,
      conversationUrl: conversationUrl.toString(),
      replyCount: Math.max(1, input.replyCount ?? 1),
      publicAppUrl: env.CLIENT_APP_ORIGIN,
    });

    await sendTransactionalEmail({
      kind: "support-reply-account",
      recipientEmail: input.recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      idempotencyKey,
      source,
    });

    return;
  }

  const contactUrl = new URL("/contact", `${env.CLIENT_APP_ORIGIN}/`).toString();
  const template = createGuestSupportReplyTemplate({
    displayName: input.displayName,
    referenceId: input.referenceId,
    subject: input.subject,
    replyBody: input.replyBody,
    contactUrl,
    publicAppUrl: env.CLIENT_APP_ORIGIN,
  });

  await sendTransactionalEmail({
    kind: "support-reply-guest",
    recipientEmail: input.recipientEmail,
    subject: template.subject,
    html: template.html,
    text: template.text,
    idempotencyKey,
    source,
  });
}
