import type {
  Request,
  Response,
} from "express";

import { checkDatabaseReadiness } from "../config/database.js";
import { getRequestId } from "../middleware/requestContext.middleware.js";
import {
  describeErrorForLog,
  logger,
} from "../utils/logger.js";

const SERVICE_STARTED_AT = Date.now();

function setHealthHeaders(response: Response): void {
  response.setHeader("Cache-Control", "no-store");
}

function createHealthMetadata() {
  return {
    service: "filmgeezer-api",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - SERVICE_STARTED_AT) / 1_000),
  };
}

export function getLivenessHealth(
  _request: Request,
  response: Response,
): void {
  setHealthHeaders(response);

  response.status(200).json({
    status: "ok",
    state: "live",
    ...createHealthMetadata(),
  });
}

export async function getReadinessHealth(
  request: Request,
  response: Response,
): Promise<void> {
  setHealthHeaders(response);

  try {
    await checkDatabaseReadiness();

    response.status(200).json({
      status: "ok",
      state: "ready",
      checks: {
        database: "ok",
      },
      ...createHealthMetadata(),
    });
  } catch (error) {
    logger.warn("health.readiness_failed", {
      requestId: getRequestId(request),
      dependency: "database",
      error: describeErrorForLog(error),
    });

    response.status(503).json({
      status: "error",
      code: "SERVICE_NOT_READY",
      message: "FilmGeezer API is temporarily not ready.",
      state: "not-ready",
      checks: {
        database: "unavailable",
      },
      ...createHealthMetadata(),
    });
  }
}