import type { Server } from "node:http";

import app from "./app.js";
import { closeMongoConnection } from "./config/database.js";
import { env } from "./config/env.js";

import { initializeAuthStorage } from "./features/auth/auth.indexes.js";
import { initializeWatchlistStorage } from "./features/watchlist/watchlist.indexes.js";
import { initializePreferencesStorage } from "./features/preferences/preferences.indexes.js";
import { initializeEmailPreferencesStorage } from "./features/emailPreferences/emailPreferences.indexes.js";
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
import {
  describeErrorForLog,
  logger,
} from "./utils/logger.js";

const { PORT, HOST } = env;

const HTTP_REQUEST_TIMEOUT_MILLISECONDS = 60_000;
const HTTP_HEADERS_TIMEOUT_MILLISECONDS = 15_000;
const HTTP_KEEP_ALIVE_TIMEOUT_MILLISECONDS = 5_000;
const HTTP_MAX_HEADERS_COUNT = 100;
const SHUTDOWN_GRACE_PERIOD_MILLISECONDS = 10_000;

let server: Server | null = null;
let isShuttingDown = false;

async function initializeApplicationStorage(): Promise<void> {
  await Promise.all([
    initializeAuthStorage(),
    initializeWatchlistStorage(),
    initializePreferencesStorage(),
    initializeEmailPreferencesStorage(),
    initializeContactStorage(),
    initializeNotificationStorage(),
    initializeAdminStorage(),
    initializeEmailDeliveryStorage(),
    initializeSupportEmailAlertStorage(),
  ]);
}

function configureHttpServer(activeServer: Server): void {
  activeServer.requestTimeout = HTTP_REQUEST_TIMEOUT_MILLISECONDS;
  activeServer.headersTimeout = HTTP_HEADERS_TIMEOUT_MILLISECONDS;
  activeServer.keepAliveTimeout = HTTP_KEEP_ALIVE_TIMEOUT_MILLISECONDS;
  activeServer.maxHeadersCount = HTTP_MAX_HEADERS_COUNT;
}

async function startServer(): Promise<void> {
  try {
    await initializeApplicationStorage();
  } catch (error) {
    logger.error("server.storage_initialization_failed", {
      error: describeErrorForLog(error),
    });

    try {
      await closeMongoConnection();
    } catch (databaseError) {
      logger.error("server.startup_database_close_failed", {
        error: describeErrorForLog(databaseError),
      });
    }

    process.exitCode = 1;
    return;
  }

  if (isShuttingDown) {
    logger.info("server.startup_aborted", {
      reason: "shutdown-in-progress",
    });
    return;
  }

  logger.info("server.storage_ready");
  logger.info("server.admin_passkeys", {
    configured: isAdminWebAuthnConfigured(),
    origin: isAdminWebAuthnConfigured()
      ? env.ADMIN_WEBAUTHN_ORIGIN
      : undefined,
  });
  logger.info("server.transactional_email", {
    configured: isTransactionalEmailConfigured(),
    adapter:
      isTransactionalEmailConfigured() && env.NODE_ENV === "production"
        ? "resend"
        : isTransactionalEmailConfigured()
          ? "development-console"
          : "disabled",
  });

  const activeServer = app.listen(PORT, HOST, () => {
    if (isShuttingDown) {
      return;
    }

    startSupportEmailAlertWorker();

    logger.info("server.started", {
      host: HOST,
      port: PORT,
      requestTimeoutMilliseconds: HTTP_REQUEST_TIMEOUT_MILLISECONDS,
      headersTimeoutMilliseconds: HTTP_HEADERS_TIMEOUT_MILLISECONDS,
      keepAliveTimeoutMilliseconds: HTTP_KEEP_ALIVE_TIMEOUT_MILLISECONDS,
      maxHeadersCount: HTTP_MAX_HEADERS_COUNT,
    });
  });

  configureHttpServer(activeServer);
  server = activeServer;
}

async function closeApplicationResources(): Promise<void> {
  try {
    await stopSupportEmailAlertWorker();
  } catch (workerError) {
    logger.error("server.worker_shutdown_failed", {
      worker: "support-email-alert",
      error: describeErrorForLog(workerError),
    });

    process.exitCode = 1;
  }

  try {
    await closeMongoConnection();
  } catch (databaseError) {
    logger.error("server.database_shutdown_failed", {
      error: describeErrorForLog(databaseError),
    });

    process.exitCode = 1;
  }
}

async function shutdown(
  reason: string,
  requestedExitCode = 0,
): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (requestedExitCode !== 0) {
    process.exitCode = requestedExitCode;
  }

  logger.info("server.shutdown_started", {
    reason,
    gracePeriodMilliseconds: SHUTDOWN_GRACE_PERIOD_MILLISECONDS,
  });

  const activeServer = server;

  const forceShutdownTimer = setTimeout(() => {
    logger.error("server.shutdown_forced", {
      reason,
      gracePeriodMilliseconds: SHUTDOWN_GRACE_PERIOD_MILLISECONDS,
    });

    activeServer?.closeAllConnections();
    process.exit(process.exitCode ?? 1);
  }, SHUTDOWN_GRACE_PERIOD_MILLISECONDS);

  forceShutdownTimer.unref();

  try {
    if (activeServer) {
      await new Promise<void>((resolve) => {
        activeServer.close((serverError) => {
          if (serverError) {
            logger.error("server.http_shutdown_failed", {
              error: describeErrorForLog(serverError),
            });

            process.exitCode = 1;
          }

          resolve();
        });

        activeServer.closeIdleConnections();
      });
    }

    await closeApplicationResources();
  } finally {
    clearTimeout(forceShutdownTimer);
  }

  logger.info("server.shutdown_completed", {
    reason,
    exitCode: process.exitCode ?? 0,
  });
}

function handleFatalProcessError(
  event: "uncaughtException" | "unhandledRejection",
  error: unknown,
): void {
  logger.error("server.fatal_process_error", {
    event,
    error: describeErrorForLog(error),
  });

  if (isShuttingDown) {
    process.exit(1);
  }

  void shutdown(event, 1);
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("uncaughtException", (error) => {
  handleFatalProcessError("uncaughtException", error);
});

process.on("unhandledRejection", (reason) => {
  handleFatalProcessError("unhandledRejection", reason);
});

void startServer();
