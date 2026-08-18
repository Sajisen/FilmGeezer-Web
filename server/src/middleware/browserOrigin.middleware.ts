import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  isAllowedCorsOrigin,
} from "../config/cors.js";

/**
 * CORS controls whether another browser origin can read FilmGeezer API
 * responses, but CORS by itself does not reject the underlying request.
 *
 * Reject browser requests that explicitly identify an untrusted Origin so
 * cross-site pages cannot use visitors' browsers to generate needless API
 * traffic. Requests without Origin remain allowed because direct navigation,
 * crawlers, health tooling, and legitimate server-to-server clients may omit
 * the header. This is a browser-abuse reduction layer, not an authentication
 * boundary: sensitive routes still rely on sessions, authorization, CSRF, and
 * recent-authentication checks.
 */
export function rejectUntrustedBrowserOrigin(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const origin = request.get("origin");

  if (!origin || isAllowedCorsOrigin(origin)) {
    next();
    return;
  }

  response.setHeader("Cache-Control", "no-store");
  response.status(403).json({
    status: "error",
    code: "API_ORIGIN_REJECTED",
    message: "This request origin is not allowed.",
  });
}
