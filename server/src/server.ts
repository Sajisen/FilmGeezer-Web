import app from "./app.js";
import { closeMongoConnection } from "./config/database.js";
import { env } from "./config/env.js";

const { PORT, HOST } = env;

const server = app.listen(PORT, HOST, () => {
  console.log("FilmGeezer API is running");
  console.log(`Local:   http://localhost:${PORT}`);
  console.log(`Listening on all network interfaces at port ${PORT}`);
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