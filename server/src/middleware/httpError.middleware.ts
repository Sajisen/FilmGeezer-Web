import type {
  ErrorRequestHandler,
} from "express";

import {
  getRequestId,
  getSafeRequestPath,
} from "./requestContext.middleware.js";
import {
  describeErrorForLog,
  logger,
} from "../utils/logger.js";

interface RequestBodyError extends SyntaxError {
  status?: number;
  statusCode?: number;
  type?: string;
}

function isRequestBodyError(
  error: unknown,
): error is RequestBodyError {
  return error instanceof SyntaxError;
}

export const handleHttpError: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  const requestId = getRequestId(request);
  const path = getSafeRequestPath(request);

  if (response.headersSent) {
    logger.error("http.error_after_headers_sent", {
      requestId,
      method: request.method,
      path,
      error: describeErrorForLog(error),
    });

    next(error);
    return;
  }

  response.setHeader("Cache-Control", "no-store");

  if (
    isRequestBodyError(error) &&
    error.type === "entity.parse.failed"
  ) {
    response.status(400).json({
      status: "error",
      code: "INVALID_JSON_BODY",
      message: "The request body contains invalid JSON.",
    });
    return;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.too.large"
  ) {
    response.status(413).json({
      status: "error",
      code: "REQUEST_BODY_TOO_LARGE",
      message: "The request body is too large.",
    });
    return;
  }

  logger.error("http.unhandled_error", {
    requestId,
    method: request.method,
    path,
    error: describeErrorForLog(error),
  });

  response.status(500).json({
    status: "error",
    code: "INTERNAL_SERVER_ERROR",
    message: "The request could not be completed.",
  });
};