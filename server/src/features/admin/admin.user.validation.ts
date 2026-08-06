import { z } from "zod";

import {
  ADMIN_USER_ROLE_FILTER_VALUES,
  ADMIN_USER_STATUS_FILTER_VALUES,
  ADMIN_USER_VERIFICATION_FILTER_VALUES,
} from "./admin.user.types.js";

const normalizedSearchSchema = z
  .string()
  .transform((value: string) =>
    value
      .normalize("NFKC")
      .replace(/[\u0000-\u001F\u007F]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim(),
  )
  .pipe(z.string().max(120, "The user search is too long."));

const adminReasonSchema = z
  .string()
  .transform((value: string) =>
    value
      .normalize("NFKC")
      .replace(/[\u0000-\u001F\u007F]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim(),
  )
  .pipe(
    z
      .string()
      .min(5, "Enter a short reason for this administrator action.")
      .max(300, "The administrator reason is too long."),
  );

export const adminUserListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(10).max(50).default(20),
    status: z.enum(ADMIN_USER_STATUS_FILTER_VALUES).default("all"),
    role: z.enum(ADMIN_USER_ROLE_FILTER_VALUES).default("all"),
    verification: z
      .enum(ADMIN_USER_VERIFICATION_FILTER_VALUES)
      .default("all"),
    search: normalizedSearchSchema.default(""),
  })
  .strict();

export const adminUserIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/u, "The FilmGeezer user ID is invalid.");

export const adminUserSessionIdSchema = z
  .string()
  .trim()
  .regex(/^[a-fA-F0-9]{24}$/u, "The FilmGeezer session ID is invalid.");

export const adminUserStatusReasonSchema = z
  .object({
    reason: adminReasonSchema,
  })
  .strict();
