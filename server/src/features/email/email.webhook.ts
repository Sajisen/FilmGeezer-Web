import { ObjectId } from "mongodb";
import { Resend } from "resend";
import { z } from "zod";

import { env } from "../../config/env.js";
import {
  ResendWebhookVerificationError,
  TransactionalEmailConfigurationError,
} from "./email.errors.js";
import {
  initializeEmailDeliveryStorage,
} from "./email.indexes.js";
import {
  updateEmailDeliveryFromProviderEvent,
} from "./email.repository.js";
import type {
  EmailDeliveryStatus,
} from "./email.types.js";

const resend = new Resend(env.RESEND_API_KEY ?? "re_unconfigured");

const resendEventSchema = z
  .object({
    type: z.string().min(1),
    created_at: z
      .string()
      .min(1)
      .refine(
        (value) => !Number.isNaN(Date.parse(value)),
        "Webhook event timestamp is invalid.",
      ),
    data: z
      .object({
        email_id: z.string().min(1),
        tags: z.record(z.string(), z.string()).optional(),
      })
      .passthrough(),
  })
  .passthrough();

const eventStatusMap: Readonly<Record<string, EmailDeliveryStatus | undefined>> = {
  "email.sent": "submitted",
  "email.delivery_delayed": "delayed",
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
};

function parseDeliveryId(value: string | undefined): ObjectId | null {
  if (!value || !ObjectId.isValid(value)) {
    return null;
  }

  return new ObjectId(value);
}

export async function verifyAndApplyResendWebhook(input: {
  payload: string;
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
}): Promise<void> {
  if (!env.RESEND_WEBHOOK_SECRET) {
    throw new TransactionalEmailConfigurationError(
      "RESEND_WEBHOOK_SECRET is not configured.",
    );
  }

  let verified: unknown;

  try {
    verified = resend.webhooks.verify({
      payload: input.payload,
      headers: {
        id: input.svixId,
        timestamp: input.svixTimestamp,
        signature: input.svixSignature,
      },
      webhookSecret: env.RESEND_WEBHOOK_SECRET,
    });
  } catch (error) {
    throw new ResendWebhookVerificationError({ cause: error });
  }

  const event = resendEventSchema.parse(verified);
  const status = eventStatusMap[event.type];

  if (!status) {
    return;
  }

  /*
   * A Resend account can be reused by other projects. FilmGeezer tags every
   * outbound email, so account-wide webhook subscriptions can safely ignore
   * provider events that do not belong to this application.
   */
  if (event.data.tags?.app !== "filmgeezer") {
    return;
  }

  const deliveryId = parseDeliveryId(event.data.tags.delivery);

  await initializeEmailDeliveryStorage();

  await updateEmailDeliveryFromProviderEvent({
    deliveryId,
    providerEmailId: event.data.email_id,
    providerEventId: input.svixId,
    status,
    eventAt: new Date(event.created_at),
  });
}
