import { z } from "zod";

import {
  NOTIFICATION_LIST_FILTER_VALUES,
  NOTIFICATION_LIST_POLICY,
} from "./notification.constants.js";

function parsePositiveInteger(
  value: unknown,
  fallback: number,
): number {
  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? parsed
    : Number.NaN;
}

export const notificationListQuerySchema = z
  .object({
    filter: z
      .enum(NOTIFICATION_LIST_FILTER_VALUES)
      .default("all"),
    page: z.preprocess(
      (value) =>
        parsePositiveInteger(
          value,
          NOTIFICATION_LIST_POLICY.defaultPage,
        ),
      z.number().int().min(1).max(10_000),
    ),
    pageSize: z.preprocess(
      (value) =>
        parsePositiveInteger(
          value,
          NOTIFICATION_LIST_POLICY.defaultPageSize,
        ),
      z
        .number()
        .int()
        .min(1)
        .max(NOTIFICATION_LIST_POLICY.maximumPageSize),
    ),
  })
  .strict();

export const notificationSummaryQuerySchema = z
  .object({
    limit: z.preprocess(
      (value) =>
        parsePositiveInteger(
          value,
          NOTIFICATION_LIST_POLICY.defaultSummaryLimit,
        ),
      z
        .number()
        .int()
        .min(1)
        .max(NOTIFICATION_LIST_POLICY.maximumSummaryLimit),
    ),
  })
  .strict();

export const notificationIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/iu, "The notification identifier is invalid.");
