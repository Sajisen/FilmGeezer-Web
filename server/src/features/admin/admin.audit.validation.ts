import { z } from "zod";

import { ADMIN_AUDIT_EVENT_VALUES } from "./admin.types.js";
import {
  ADMIN_AUDIT_CATEGORY_VALUES,
  ADMIN_AUDIT_OUTCOME_FILTER_VALUES,
} from "./admin.audit.types.js";

const normalizedIdentitySearchSchema = z
  .string()
  .transform((value: string) =>
    value
      .normalize("NFKC")
      .replace(/[\u0000-\u001F\u007F]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim(),
  )
  .pipe(z.string().max(120, "The audit identity filter is too long."));

const optionalDateTimeSchema = z
  .string()
  .trim()
  .pipe(z.iso.datetime({ offset: true }))
  .transform((value) => new Date(value))
  .optional()
  .transform((value) => value ?? null);

export const adminAuditListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(10).max(50).default(25),
    category: z.enum(ADMIN_AUDIT_CATEGORY_VALUES).default("all"),
    event: z
      .union([z.literal("all"), z.enum(ADMIN_AUDIT_EVENT_VALUES)])
      .default("all"),
    outcome: z.enum(ADMIN_AUDIT_OUTCOME_FILTER_VALUES).default("all"),
    actor: normalizedIdentitySearchSchema.default(""),
    target: normalizedIdentitySearchSchema.default(""),
    from: optionalDateTimeSchema,
    to: optionalDateTimeSchema,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.from && value.to && value.from.getTime() > value.to.getTime()) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "The audit end date must be after the start date.",
      });
    }
  });
