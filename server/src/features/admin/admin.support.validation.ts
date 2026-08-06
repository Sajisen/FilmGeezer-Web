import { z } from "zod";

import {
  CONTACT_CATEGORY_VALUES,
  CONTACT_FIELD_LIMITS,
  CONTACT_STATUS_VALUES,
} from "../contact/contact.constants.js";
import { contactReferenceSchema } from "../contact/contact.validation.js";
import {
  ADMIN_SUPPORT_REQUESTER_FILTER_VALUES,
  ADMIN_SUPPORT_STATUS_FILTER_VALUES,
} from "./admin.support.types.js";

const normalizedSearchSchema = z
  .string()
  .transform((value) =>
    value
      .normalize("NFKC")
      .replace(/[\u0000-\u001F\u007F]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim(),
  )
  .pipe(z.string().max(120, "The support search is too long."));

const replyTextSchema = z
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
  )
  .pipe(
    z
      .string()
      .min(CONTACT_FIELD_LIMITS.reply.minimum, "Enter a reply.")
      .max(CONTACT_FIELD_LIMITS.reply.maximum, "The reply is too long."),
  );

export const adminSupportListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(10).max(50).default(20),
    status: z.enum(ADMIN_SUPPORT_STATUS_FILTER_VALUES).default("open"),
    category: z
      .union([z.literal("all"), z.enum(CONTACT_CATEGORY_VALUES)])
      .default("all"),
    requester: z
      .enum(ADMIN_SUPPORT_REQUESTER_FILTER_VALUES)
      .default("all"),
    search: normalizedSearchSchema.default(""),
  })
  .strict();

export const adminSupportReferenceSchema = contactReferenceSchema;

export const adminSupportReplySchema = z
  .object({
    message: replyTextSchema,
  })
  .strict();

export const adminSupportStatusSchema = z
  .object({
    status: z.enum(CONTACT_STATUS_VALUES),
  })
  .strict();
