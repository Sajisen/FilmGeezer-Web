import { z } from "zod";

import {
  WATCHLIST_GUEST_MERGE_MAX_ITEMS,
} from "./watchlist.constants.js";

const mediaTypeSchema = z.enum(["movie", "tv"]);

const tmdbIdSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

const titleSchema = z
  .string()
  .trim()
  .min(1)
  .max(240);

const yearSchema = z
  .string()
  .trim()
  .max(32);

function isAllowedPosterUrl(value: string): boolean {
  if (value === "") {
    return true;
  }

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "image.tmdb.org" &&
      url.pathname.startsWith("/t/p/")
    );
  } catch {
    return false;
  }
}

const posterUrlSchema = z
  .string()
  .trim()
  .max(512)
  .refine(isAllowedPosterUrl, {
    message: "Use a valid TMDB poster URL.",
  });

export const watchlistItemInputSchema = z
  .object({
    mediaType: mediaTypeSchema,
    tmdbId: tmdbIdSchema,
    title: titleSchema,
    posterUrl: posterUrlSchema,
    year: yearSchema,
  })
  .strict();

export const watchlistIdentitySchema = z
  .object({
    mediaType: mediaTypeSchema,
    tmdbId: z.coerce
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

const guestMergeItemSchema = watchlistItemInputSchema.extend({
  addedAt: z.iso.datetime({ offset: true }),
});

export const watchlistMergeInputSchema = z
  .object({
    items: z
      .array(guestMergeItemSchema)
      .max(WATCHLIST_GUEST_MERGE_MAX_ITEMS),
  })
  .strict();
