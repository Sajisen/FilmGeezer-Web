import type {
  NextFunction,
  Request,
  Response,
} from "express";
import helmet from "helmet";

import { env } from "../config/env.js";

const ONE_YEAR_IN_SECONDS = 31_536_000;

export const applyStandardSecurityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
      frameAncestors: ["'none'"],
      objectSrc: ["'none'"],
    },
  },

  /*
   * FilmGeezer's browser UI and API intentionally live on different origins
   * but the same HTTPS site (filmgeezer.site and api.filmgeezer.site).
   * Helmet's same-origin default would block profile images requested by the
   * public/admin frontends, so same-site is the correct boundary here.
   */
  crossOriginResourcePolicy: {
    policy: "same-site",
  },

  /*
   * The API does not need cross-origin isolation. Enabling COEP would create
   * unnecessary compatibility constraints for media/image responses.
   */
  crossOriginEmbedderPolicy: false,

  referrerPolicy: {
    policy: "no-referrer",
  },

  strictTransportSecurity:
    env.NODE_ENV === "production"
      ? {
          maxAge: ONE_YEAR_IN_SECONDS,
          includeSubDomains: false,
          preload: false,
        }
      : false,

  xFrameOptions: {
    action: "deny",
  },
});

export function applyFilmGeezerApiPolicyHeaders(
  _request: Request,
  response: Response,
  next: NextFunction,
): void {
  response.setHeader(
    "Permissions-Policy",
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
  );

  response.setHeader(
    "X-Robots-Tag",
    "noindex, nofollow, noarchive, nosnippet",
  );

  next();
}