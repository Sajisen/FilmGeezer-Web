import type { ObjectId } from "mongodb";

export const TRANSACTIONAL_EMAIL_KIND_VALUES = [
  "verify-email",
  "existing-account-registration-notice",
  "password-reset",
  "email-change-verification",
  "email-changed-notice",
  "account-deactivated-notice",
  "welcome",
  "support-reply-account",
  "support-reply-guest",
] as const;

export type TransactionalEmailKind =
  (typeof TRANSACTIONAL_EMAIL_KIND_VALUES)[number];

export const EMAIL_DELIVERY_STATUS_VALUES = [
  "pending",
  "submitted",
  "delayed",
  "delivered",
  "bounced",
  "complained",
  "failed",
  "suppressed",
] as const;

export type EmailDeliveryStatus =
  (typeof EMAIL_DELIVERY_STATUS_VALUES)[number];

export interface TransactionalEmailSource {
  type:
    | "auth-challenge"
    | "account-event"
    | "support-reply"
    | "user-welcome";
  id: string;
  userId?: ObjectId | null;
}

export interface TransactionalEmailMessage {
  kind: TransactionalEmailKind;
  recipientEmail: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  source: TransactionalEmailSource;
  replyToEmail?: string | null;
}

export interface TransactionalEmailSendReceipt {
  provider: "development" | "resend";
  providerEmailId: string | null;
  submittedAt: Date;
}

export interface EmailDeliveryDocument {
  _id: ObjectId;
  schemaVersion: 1;
  provider: "development" | "resend";
  kind: TransactionalEmailKind;
  idempotencyKey: string;
  providerEmailId: string | null;
  recipientDomain: string;
  sourceType: TransactionalEmailSource["type"];
  sourceId: string;
  userId: ObjectId | null;
  status: EmailDeliveryStatus;
  providerEventId: string | null;
  providerEventAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
