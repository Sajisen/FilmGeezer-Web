import type {
  Server,
} from "node:http";

import app from "./app.js";
import { closeMongoConnection } from "./config/database.js";
import { env } from "./config/env.js";

import { initializeAuthStorage } from "./features/auth/auth.indexes.js";
import { initializeWatchlistStorage } from "./features/watchlist/watchlist.indexes.js";
import { initializePreferencesStorage } from "./features/preferences/preferences.indexes.js";
import { initializeContactStorage } from "./features/contact/contact.indexes.js";
import { initializeNotificationStorage } from "./features/notifications/notification.indexes.js";
import { initializeAdminStorage } from "./features/admin/admin.indexes.js";
import { initializeEmailDeliveryStorage } from "./features/email/email.indexes.js";
import { isTransactionalEmailConfigured } from "./features/email/email.service.js";
import { initializeSupportEmailAlertStorage } from "./features/email/supportEmailAlert.indexes.js";
import {
  startSupportEmailAlertWorker,
  stopSupportEmailAlertWorker,
} from "./features/email/supportEmailAlert.worker.js";
import { isAdminWebAuthnConfigured } from "./features/admin/admin.passkey.config.js";

const { PORT, HOST } = env;

let server: Server | null = null;
let isShuttingDown = false;

function describeError(error: unknown) {
  return {
    name:
      error instanceof Error
        ? error.name
        : "UnknownError",

    message:
      env.NODE_ENV === "development" &&
      error instanceof Error
        ? error.message
        : undefined,
  };
}

async function initializeApplicationStorage(): Promise<void> {
  await Promise.all([
    initializeAuthStorage(),
    initializeWatchlistStorage(),
    initializePreferencesStorage(),
    initializeContactStorage(),
    initializeNotificationStorage(),
    initializeAdminStorage(),
    initializeEmailDeliveryStorage(),
    initializeSupportEmailAlertStorage(),
  ]);
}

async function startServer(): Promise<void> {
  try {
    await initializeApplicationStorage();
  } catch (error) {
    console.error(
      "FilmGeezer application storage could not be initialized.",
      describeError(error),
    );

    try {
      await closeMongoConnection();
    } catch (databaseError) {
      console.error(
        "MongoDB connection could not be closed after startup failure.",
        describeError(databaseError),
      );
    }

    process.exitCode = 1;
    return;
  }

  console.log("FilmGeezer application storage is ready.");
  console.log(
    isAdminWebAuthnConfigured()
      ? `Administrator passkeys are ready for ${env.ADMIN_WEBAUTHN_ORIGIN}.`
      : "Administrator passkeys are disabled until ADMIN_WEBAUTHN_RP_ID and ADMIN_WEBAUTHN_ORIGIN are configured.",
  );
  console.log(
    isTransactionalEmailConfigured()
      ? env.NODE_ENV === "production"
        ? `Transactional email is ready through Resend as ${env.RESEND_FROM_EMAIL}.`
        : "Transactional email is using the development console adapter."
      : "Transactional email is not configured.",
  );

  server = app.listen(PORT, HOST, () => {
    startSupportEmailAlertWorker();
    console.log("FilmGeezer API is running");
    console.log(`Local:   http://localhost:${PORT}`);
    console.log(`Listening on all network interfaces at port ${PORT}`);
  });
}

async function closeApplicationResources(): Promise<void> {
  try {
    await stopSupportEmailAlertWorker();
  } catch (workerError) {
    console.error(
      "Support email alert worker could not be stopped cleanly.",
      describeError(workerError),
    );

    process.exitCode = 1;
  }

  try {
    await closeMongoConnection();
  } catch (databaseError) {
    console.error(
      "MongoDB connection could not be closed cleanly.",
      describeError(databaseError),
    );

    process.exitCode = 1;
  }
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Closing FilmGeezer API...`);

  const activeServer = server;

  if (!activeServer) {
    await closeApplicationResources();
    return;
  }

  await new Promise<void>((resolve) => {
    activeServer.close((serverError) => {
      if (serverError) {
        console.error(
          "HTTP server could not be closed cleanly.",
          describeError(serverError),
        );

        process.exitCode = 1;
      }

      resolve();
    });
  });

  await closeApplicationResources();
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
