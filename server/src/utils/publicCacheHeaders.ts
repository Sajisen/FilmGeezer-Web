import type { Response } from "express";

/**
 * Public collection responses are identical for every visitor. Keep a short
 * browser/proxy freshness window while allowing a longer stale response during
 * background revalidation. Personalised endpoints must not use this helper.
 */
export function setPublicCollectionCacheHeaders(res: Response) {
  res.setHeader(
    "Cache-Control",
    "public, max-age=300, stale-while-revalidate=3600",
  );
}
