import app from "./app.js";
import { closeMongoConnection } from "./config/database.js";
import { env } from "./config/env.js";

import { initializeAuthStorage } from "./features/auth/auth.indexes.js";

const { PORT, HOST } = env;

const server = app.listen(PORT, HOST, () => {
  console.log("FilmGeezer API is running");
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Listening on all network interfaces at port ${PORT}`);
});

void initializeAuthStorage()
  .then(() => {
    console.log("FilmGeezer authentication storage is ready.");
  })
  .catch((error) => {
    console.error(
      "FilmGeezer authentication storage could not be initialized.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",

        message:
          env.NODE_ENV === "development" &&
          error instanceof Error
            ? error.message
            : undefined,
      },
    );
  });

let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Closing FilmGeezer API...`);

  server.close(async (serverError) => {
    try {
      await closeMongoConnection();
    } catch (databaseError) {
      console.error("MongoDB connection could not be closed cleanly.", {
        name:
          databaseError instanceof Error
            ? databaseError.name
            : "UnknownError",
      });
    }

    if (serverError) {
      console.error("HTTP server could not be closed cleanly.", serverError);
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});