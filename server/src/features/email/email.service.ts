import { Resend } from "resend";

import { env } from "../../config/env.js";
import {
  TransactionalEmailConfigurationError,
  TransactionalEmailDeliveryError,
  TransactionalEmailPersistenceError,
} from "./email.errors.js";
import {
  initializeEmailDeliveryStorage,
} from "./email.indexes.js";
import {
  findEmailDeliveryByIdempotencyKey,
  markEmailDeliveryFailed,
  markEmailDeliverySubmitted,
  upsertPendingEmailDelivery,
} from "./email.repository.js";
import type {
  TransactionalEmailMessage,
  TransactionalEmailSendReceipt,
} from "./email.types.js";

let resendClient: Resend | null = null;

function getRecipientDomain(email: string): string {
  const separator = email.lastIndexOf("@");
  return separator >= 0 ? email.slice(separator + 1).toLowerCase() : "unknown";
}

function getResendClient(): Resend {
  if (!env.RESEND_API_KEY) {
    throw new TransactionalEmailConfigurationError(
      "RESEND_API_KEY is required for production transactional email.",
    );
  }

  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }

  return resendClient;
}

function getSenderAddress(): string {
  if (!env.RESEND_FROM_EMAIL) {
    throw new TransactionalEmailConfigurationError(
      "RESEND_FROM_EMAIL is required for production transactional email.",
    );
  }

  return `FilmGeezer <${env.RESEND_FROM_EMAIL}>`;
}

function getReplyToAddress(
  message: TransactionalEmailMessage,
): string | undefined {
  const replyTo = message.replyToEmail ?? env.RESEND_REPLY_TO_EMAIL;
  return replyTo ?? undefined;
}

export function isTransactionalEmailConfigured(): boolean {
  return (
    env.NODE_ENV !== "production" ||
    Boolean(
      env.RESEND_API_KEY &&
        env.RESEND_FROM_EMAIL &&
        env.RESEND_REPLY_TO_EMAIL,
    )
  );
}

export async function sendTransactionalEmail(
  message: TransactionalEmailMessage,
): Promise<TransactionalEmailSendReceipt> {
  await initializeEmailDeliveryStorage();

  const existing = await findEmailDeliveryByIdempotencyKey(
    message.idempotencyKey,
  );

  if (existing?.providerEmailId && existing.status !== "failed") {
    return {
      provider: existing.provider,
      providerEmailId: existing.providerEmailId,
      submittedAt: existing.providerEventAt ?? existing.updatedAt,
    };
  }

  const provider = env.NODE_ENV === "production" ? "resend" : "development";
  const createdAt = new Date();

  let delivery;

  try {
    delivery = await upsertPendingEmailDelivery({
      provider,
      kind: message.kind,
      idempotencyKey: message.idempotencyKey,
      recipientDomain: getRecipientDomain(message.recipientEmail),
      source: message.source,
      createdAt,
    });
  } catch (error) {
    throw new TransactionalEmailPersistenceError(
      "The email delivery attempt could not be prepared.",
      { cause: error },
    );
  }

  if (env.NODE_ENV !== "production") {
    const submittedAt = new Date();

    console.log(
      [
        "",
        "==================================================",
        `FilmGeezer development email: ${message.kind}`,
        "==================================================",
        `Recipient: ${message.recipientEmail}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "==================================================",
        "",
      ].join("\n"),
    );

    await markEmailDeliverySubmitted({
      idempotencyKey: message.idempotencyKey,
      providerEmailId: `development:${message.idempotencyKey}`,
      submittedAt,
    });

    return {
      provider: "development",
      providerEmailId: `development:${message.idempotencyKey}`,
      submittedAt,
    };
  }

  const client = getResendClient();
  let providerEmailId: string;

  try {
    const { data, error } = await client.emails.send(
      {
        from: getSenderAddress(),
        to: [message.recipientEmail],
        replyTo: getReplyToAddress(message),
        subject: message.subject,
        html: message.html,
        text: message.text,
        tags: [
          {
            name: "app",
            value: "filmgeezer",
          },
          {
            name: "kind",
            value: message.kind.replaceAll("-", "_"),
          },
          {
            name: "delivery",
            value: delivery._id.toHexString(),
          },
        ],
      },
      {
        idempotencyKey: message.idempotencyKey,
      },
    );

    if (error || !data?.id) {
      throw new TransactionalEmailDeliveryError(
        "Resend did not accept the transactional email.",
        { cause: error ?? undefined },
      );
    }

    providerEmailId = data.id;
  } catch (error) {
    const failedAt = new Date();

    try {
      await markEmailDeliveryFailed({
        idempotencyKey: message.idempotencyKey,
        failedAt,
      });
    } catch (persistenceError) {
      console.error("[email] Failed delivery state could not be recorded.", {
        name:
          persistenceError instanceof Error
            ? persistenceError.name
            : "UnknownError",
      });
    }

    if (
      error instanceof TransactionalEmailConfigurationError ||
      error instanceof TransactionalEmailDeliveryError
    ) {
      throw error;
    }

    throw new TransactionalEmailDeliveryError(
      "The transactional email provider request failed.",
      { cause: error },
    );
  }

  const submittedAt = new Date();

  try {
    await markEmailDeliverySubmitted({
      idempotencyKey: message.idempotencyKey,
      providerEmailId,
      submittedAt,
    });
  } catch (error) {
    /*
     * Resend has already accepted the email at this point. Do not mark the
     * message as failed or invite an unsafe retry. The provider idempotency
     * key and the delivery tag let a retry/webhook reconcile the same message.
     */
    throw new TransactionalEmailPersistenceError(
      "Resend accepted the email, but its delivery state could not be stored.",
      { cause: error },
    );
  }

  return {
    provider: "resend",
    providerEmailId,
    submittedAt,
  };
}
