import { z } from "zod";

import {
  CONTACT_CATEGORY_VALUES,
  CONTACT_FIELD_LIMITS,
} from "./contact.constants.js";

const singleLineTextSchema = z
  .string()
  .transform((value) =>
    value
      .normalize("NFKC")
      .replace(/[\u0000-\u001F\u007F]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim(),
  );

const messageTextSchema = z
  .string()
  .transform((value) =>
    value
      .normalize("NFKC")
      .replace(/\r\n?/gu, "\n")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "")
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n")
      .trim(),
  );

export const contactSubmissionSchema = z
  .object({
    category: z.enum(CONTACT_CATEGORY_VALUES),

    name: singleLineTextSchema.pipe(
      z
        .string()
        .min(
          CONTACT_FIELD_LIMITS.name.minimum,
          "Enter your name.",
        )
        .max(
          CONTACT_FIELD_LIMITS.name.maximum,
          "Your name is too long.",
        ),
    ),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(
        CONTACT_FIELD_LIMITS.email.maximum,
        "The email address is too long.",
      )
      .email("Enter a valid email address."),

    subject: singleLineTextSchema.pipe(
      z
        .string()
        .min(
          CONTACT_FIELD_LIMITS.subject.minimum,
          "Add a short subject.",
        )
        .max(
          CONTACT_FIELD_LIMITS.subject.maximum,
          "The subject is too long.",
        ),
    ),

    message: messageTextSchema.pipe(
      z
        .string()
        .min(
          CONTACT_FIELD_LIMITS.message.minimum,
          "Add a little more detail so we can understand the request.",
        )
        .max(
          CONTACT_FIELD_LIMITS.message.maximum,
          "The message is too long.",
        ),
    ),

    companyWebsite: z
      .string()
      .max(CONTACT_FIELD_LIMITS.honeypot.maximum)
      .optional()
      .default(""),
  })
  .strict();

export const contactReferenceSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^FG-\d{8}-[A-F0-9]{8}$/u,
    "The support reference is invalid.",
  );

export const contactReplySchema = z
  .object({
    message: messageTextSchema.pipe(
      z
        .string()
        .min(
          CONTACT_FIELD_LIMITS.reply.minimum,
          "Enter a reply.",
        )
        .max(
          CONTACT_FIELD_LIMITS.reply.maximum,
          "The reply is too long.",
        ),
    ),
  })
  .strict();
