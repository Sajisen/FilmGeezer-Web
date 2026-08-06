import { z } from "zod";

import {
  sanitizeFileSize,
  sanitizeTelegramUrl,
} from "../contentLinks/contentLinks.service.js";
import {
  ADMIN_CONTENT_MEDIA_TYPE_FILTER_VALUES,
  ADMIN_CONTENT_MEDIA_TYPE_VALUES,
  ADMIN_CONTENT_STATUS_FILTER_VALUES,
} from "./admin.content.types.js";

const normalizedSearchSchema = z
  .string()
  .transform((value: string) =>
    value
      .normalize("NFKC")
      .replace(/[\u0000-\u001F\u007F]/gu, " ")
      .replace(/\s+/gu, " ")
      .trim(),
  )
  .pipe(z.string().max(120, "The content search is too long."));


const revisionTokenSchema = z
  .string()
  .regex(
    /^[a-f0-9]{64}$/u,
    "The content revision token is invalid.",
  );

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
      .min(5, "Enter a short reason for this content-status change.")
      .max(300, "The administrator reason is too long."),
  );

const entryIdSchema = z
  .string()
  .trim()
  .min(1, "Every link entry needs an ID.")
  .max(64, "Link-entry IDs must not exceed 64 characters.")
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9_-]*$/u,
    "Link-entry IDs may use letters, numbers, underscores, and hyphens.",
  );

const telegramUrlSchema = z
  .string()
  .trim()
  .min(1, "Enter a Telegram URL.")
  .max(2_048, "The Telegram URL is too long.")
  .refine(
    (value) => sanitizeTelegramUrl(value) !== null,
    "Use a valid t.me or telegram.me URL.",
  )
  .transform((value) => sanitizeTelegramUrl(value) as string);

const fileSizeSchema = z
  .string()
  .trim()
  .max(32, "The file-size label is too long.")
  .refine(
    (value) => value === "" || sanitizeFileSize(value) !== undefined,
    "Use a size such as 950 MB or 1.4 GB.",
  )
  .transform((value) =>
    value === "" ? null : (sanitizeFileSize(value) ?? null),
  );

const movieQualityLinkSchema = z
  .object({
    url: telegramUrlSchema,
    size: fileSizeSchema.nullish().transform((value) => value ?? null),
  })
  .strict();

const nullableMovieQualityLinkSchema = z
  .union([movieQualityLinkSchema, z.null()]);

const seriesOptionSchema = z
  .object({
    id: entryIdSchema,
    url: telegramUrlSchema,
    isMain: z.boolean(),
    active: z.boolean(),
  })
  .strict();

const movieSourceSchema = z
  .object({
    id: entryIdSchema,
    isMain: z.boolean(),
    active: z.boolean(),
    links: z
      .object({
        "720p": nullableMovieQualityLinkSchema,
        "1080p": nullableMovieQualityLinkSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (!value.links["720p"] && !value.links["1080p"]) {
      context.addIssue({
        code: "custom",
        path: ["links"],
        message: "Each movie source needs at least one quality link.",
      });
    }
  });

function validateUniqueIds(
  values: Array<{ id: string }>,
  context: z.RefinementCtx,
): void {
  const seen = new Set<string>();

  values.forEach((value, index) => {
    const normalized = value.id.toLowerCase();

    if (seen.has(normalized)) {
      context.addIssue({
        code: "custom",
        path: [index, "id"],
        message: "Link-entry IDs must be unique.",
      });
    }

    seen.add(normalized);
  });
}

function validateMainSelection(
  values: Array<{ isMain: boolean; active: boolean }>,
  context: z.RefinementCtx,
): void {
  const activeValues = values.filter((value) => value.active);
  const activeMainValues = activeValues.filter((value) => value.isMain);

  if (activeValues.length === 0) {
    context.addIssue({
      code: "custom",
      message: "Keep at least one active link entry.",
    });
    return;
  }

  if (activeMainValues.length !== 1) {
    context.addIssue({
      code: "custom",
      message: "Select exactly one active main link entry.",
    });
  }

  if (values.some((value) => value.isMain && !value.active)) {
    context.addIssue({
      code: "custom",
      message: "The main link entry must be active.",
    });
  }
}

const seriesSaveSchema = z
  .object({
    expectedRevision: z.number().int().min(0),
    expectedRevisionToken: revisionTokenSchema,
    kind: z.literal("series"),
    options: z.array(seriesOptionSchema).min(1).max(10),
  })
  .strict()
  .superRefine((value, context) => {
    validateUniqueIds(value.options, context);
    validateMainSelection(value.options, context);

    const urls = new Set<string>();
    value.options.forEach((option, index) => {
      if (urls.has(option.url)) {
        context.addIssue({
          code: "custom",
          path: ["options", index, "url"],
          message: "Series link URLs must be unique.",
        });
      }
      urls.add(option.url);
    });
  });

const movieSaveSchema = z
  .object({
    expectedRevision: z.number().int().min(0),
    expectedRevisionToken: revisionTokenSchema,
    kind: z.literal("movie"),
    sources: z.array(movieSourceSchema).min(1).max(8),
  })
  .strict()
  .superRefine((value, context) => {
    validateUniqueIds(value.sources, context);
    validateMainSelection(value.sources, context);
  });

export const adminContentListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10_000).default(1),
    pageSize: z.coerce.number().int().min(10).max(50).default(20),
    mediaType: z
      .enum(ADMIN_CONTENT_MEDIA_TYPE_FILTER_VALUES)
      .default("all"),
    status: z.enum(ADMIN_CONTENT_STATUS_FILTER_VALUES).default("all"),
    search: normalizedSearchSchema.default(""),
  })
  .strict();

export const adminContentTmdbSearchQuerySchema = z
  .object({
    mediaType: z.enum(ADMIN_CONTENT_MEDIA_TYPE_VALUES),
    query: normalizedSearchSchema.pipe(
      z.string().min(2, "Enter at least two characters to search TMDB."),
    ),
    page: z.coerce.number().int().min(1).max(100).default(1),
  })
  .strict();

export const adminContentMediaTypeSchema = z.enum(
  ADMIN_CONTENT_MEDIA_TYPE_VALUES,
);

export const adminContentTmdbIdSchema = z.coerce
  .number()
  .int()
  .positive("The TMDB ID must be a positive whole number.")
  .max(2_147_483_647, "The TMDB ID is too large.");

export const adminContentSaveSchema = z.discriminatedUnion("kind", [
  seriesSaveSchema,
  movieSaveSchema,
]);

export const adminContentStatusSchema = z
  .object({
    expectedRevision: z.number().int().min(0),
    expectedRevisionToken: revisionTokenSchema,
    active: z.boolean(),
    reason: adminReasonSchema,
  })
  .strict();
