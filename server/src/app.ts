import express from "express";
import cors from "cors";

import {
  isAllowedClientOrigin,
} from "./config/cors.js";

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

import {
  handleHttpError,
} from "./middleware/httpError.middleware.js";

const app =
  express();

app.use(
  cors({
    origin: (
      origin,
      callback,
    ) => {
      callback(
        null,
        !origin ||
          isAllowedClientOrigin(
            origin,
          ),
      );
    },

    credentials:
      true,
  }),
);

/*
 * Authentication mounts before the general JSON parser because its
 * routes own stricter body-size limits and run rate limiting first.
 */
app.use(
  "/api/auth",
  authRoutes,
);

app.use(
  express.json({
    limit: "64kb",
    strict: true,
  }),
);

app.use("/api", healthRoutes);
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
  response.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

app.use(handleHttpError);

export default app;