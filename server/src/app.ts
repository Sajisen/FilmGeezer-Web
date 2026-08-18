import express from "express";
import cors from "cors";

import { isAllowedCorsOrigin } from "./config/cors.js";
import { env } from "./config/env.js";

import healthRoutes from "./routes/health.routes.js";
import searchRoutes from "./routes/search.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import providerLinkRoutes from "./routes/providerLink.routes.js";
import browseRoutes from "./routes/browse.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import homeRoutes from "./routes/home.routes.js";
import movieCollectionsRoutes from "./routes/movieCollections.routes.js";
import tvCollectionsRoutes from "./routes/tvCollections.routes.js";
import animeCollectionsRoutes from "./routes/animeCollections.routes.js";
import kDramaCollectionsRoutes from "./routes/kDramaCollections.routes.js";
import watchAvailabilityRoutes from "./routes/watchAvailability.routes.js";
import featuredCharactersRoutes from "./routes/featuredCharacters.routes.js";
import seasonDetailsRoutes from "./routes/seasonDetails.routes.js";
import moreLikeThisRoutes from "./routes/moreLikeThis.routes.js";
import authRoutes from "./routes/auth.routes.js";
import accountRoutes from "./routes/account.routes.js";
import watchlistRoutes from "./routes/watchlist.routes.js";
import profileImageRoutes from "./routes/profileImage.routes.js";
import accountPreferencesRoutes from "./routes/accountPreferences.routes.js";
import accountEmailPreferencesRoutes from "./routes/accountEmailPreferences.routes.js";
import recommendationsRoutes from "./routes/recommendations.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import adminAuthRoutes from "./routes/adminAuth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import resendWebhookRoutes from "./routes/resendWebhook.routes.js";

import { handleHttpError } from "./middleware/httpError.middleware.js";
import { attachRequestContext } from "./middleware/requestContext.middleware.js";
import { rejectUntrustedBrowserOrigin } from "./middleware/browserOrigin.middleware.js";
import { publicApiReadRateLimit } from "./middleware/publicApiRateLimit.middleware.js";
import {
  applyFilmGeezerApiPolicyHeaders,
  applyStandardSecurityHeaders,
} from "./middleware/securityHeaders.middleware.js";

const app = express();

app.disable("x-powered-by");

/*
 * Railway terminates TLS and forwards requests to the service through one
 * trusted edge hop. Trusting exactly one proxy lets Express and
 * express-rate-limit use Railway's forwarded request metadata without
 * accepting an arbitrary multi-hop chain supplied by the browser.
 */
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

/*
 * Correlation and security headers do not consume or transform request bodies,
 * so they are safe to run before the raw-body Resend webhook boundary.
 */
app.use(attachRequestContext);
app.use(applyStandardSecurityHeaders);
app.use(applyFilmGeezerApiPolicyHeaders);

/*
 * Resend signs the exact raw request body. Mount the webhook before CORS
 * and every JSON parser so verification is not broken by parsing and
 * re-serialization. The endpoint has no browser session or CSRF surface.
 */
app.use(
  "/api/webhooks/resend",
  resendWebhookRoutes,
);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(
        null,
        !origin || isAllowedCorsOrigin(origin),
      );
    },
    credentials: true,
  }),
);

/*
 * CORS prevents untrusted browser origins from reading API responses. Reject
 * those browser requests as well so they do not consume FilmGeezer/TMDB work.
 * Requests without Origin are intentionally allowed; Origin is not a reliable
 * authentication mechanism for direct or server-to-server HTTP clients.
 */
app.use(rejectUntrustedBrowserOrigin);

/*
 * Authentication mounts before the general JSON parser because its
 * routes own stricter body-size limits and run rate limiting first.
 */
app.use(
  "/api/auth",
  authRoutes,
);

/*
 * Administrator authentication owns a separate cookie, session store,
 * body limit, and rate limits from ordinary FilmGeezer authentication.
 */
app.use(
  "/api/admin/auth",
  adminAuthRoutes,
);

app.use(
  "/api/admin",
  adminRoutes,
);

app.use(
  "/api/account",
  accountRoutes,
);

app.use(
  "/api/watchlist",
  watchlistRoutes,
);

app.use(
  "/api/account/preferences",
  accountPreferencesRoutes,
);

app.use(
  "/api/account/email-preferences",
  accountEmailPreferencesRoutes,
);

app.use(
  "/api/recommendations",
  recommendationsRoutes,
);

/*
 * Contact owns a smaller JSON body limit and rate limiting, so it mounts
 * before the application-wide JSON parser.
 */
app.use(
  "/api/contact",
  contactRoutes,
);

app.use(
  "/api/notifications",
  notificationRoutes,
);

app.use(
  "/api",
  profileImageRoutes,
);

app.use(
  express.json({
    limit: "64kb",
    strict: true,
  }),
);

app.use("/api", healthRoutes);

/*
 * Public discovery endpoints cannot be made secret because they are called by
 * the browser. Bound abuse at the API itself rather than relying on frontend
 * throttling, which a scripted client could bypass completely. Health checks
 * remain outside this limiter so Railway readiness/liveness probes are never
 * affected.
 */
app.use("/api", publicApiReadRateLimit);

app.use("/api", searchRoutes);
app.use("/api", mediaRoutes);
app.use("/api", providerLinkRoutes);
app.use("/api", browseRoutes);
app.use("/api", catalogRoutes);
app.use("/api", homeRoutes);
app.use("/api", movieCollectionsRoutes);
app.use("/api", tvCollectionsRoutes);
app.use("/api", animeCollectionsRoutes);
app.use("/api", kDramaCollectionsRoutes);
app.use("/api", watchAvailabilityRoutes);
app.use("/api", featuredCharactersRoutes);
app.use("/api", seasonDetailsRoutes);
app.use("/api", moreLikeThisRoutes);

app.use((_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

app.use(handleHttpError);

export default app;
