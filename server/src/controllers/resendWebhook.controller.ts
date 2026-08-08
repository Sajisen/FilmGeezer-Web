import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  ResendWebhookVerificationError,
  TransactionalEmailConfigurationError,
} from "../features/email/email.errors.js";
import {
  verifyAndApplyResendWebhook,
} from "../features/email/email.webhook.js";

function getHeader(request: Request, name: string): string | null {
  const value = request.get(name);
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function receiveResendWebhook(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (typeof request.body !== "string") {
      response.status(400).json({
        status: "error",
        code: "RESEND_WEBHOOK_INVALID_BODY",
        message: "The webhook body is invalid.",
      });
      return;
    }

    const svixId = getHeader(request, "svix-id");
    const svixTimestamp = getHeader(request, "svix-timestamp");
    const svixSignature = getHeader(request, "svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      response.status(400).json({
        status: "error",
        code: "RESEND_WEBHOOK_INVALID_SIGNATURE",
        message: "The webhook signature headers are missing.",
      });
      return;
    }

    await verifyAndApplyResendWebhook({
      payload: request.body,
      svixId,
      svixTimestamp,
      svixSignature,
    });

    response.status(200).json({
      status: "success",
      code: "RESEND_WEBHOOK_ACCEPTED",
    });
  } catch (error) {
    if (error instanceof TransactionalEmailConfigurationError) {
      response.status(503).json({
        status: "error",
        code: "RESEND_WEBHOOK_NOT_CONFIGURED",
        message: "Transactional email webhook verification is not configured.",
      });
      return;
    }

    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code: "RESEND_WEBHOOK_INVALID_EVENT",
        message: "The webhook event is invalid.",
      });
      return;
    }

    if (error instanceof ResendWebhookVerificationError) {
      response.status(400).json({
        status: "error",
        code: "RESEND_WEBHOOK_INVALID_SIGNATURE",
        message: "The webhook signature could not be verified.",
      });
      return;
    }

    next(error);
  }
}
