import type {
  ErrorRequestHandler,
} from "express";
import { env } from "../config/env.js";

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

function serializeDevelopmentError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause:
        error.cause instanceof Error
          ? {
              name: error.cause.name,
              message: error.cause.message,
              stack: error.cause.stack,
            }
          : undefined,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
    stack: undefined,
    cause: undefined,
  };
}

export const handleHttpError: ErrorRequestHandler = (
  error,
  request,
  response,
  next,
) => {
  if (response.headersSent) {
    if (env.NODE_ENV === "development") {
      console.error("[http] Error raised after the response was sent", {
        method: request.method,
        path: request.originalUrl,
        ...serializeDevelopmentError(error),
      });
    }

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

  console.error(
    "[http] Unhandled request error",
    env.NODE_ENV === "development"
      ? {
          method: request.method,
          path: request.originalUrl,
          ...serializeDevelopmentError(error),
        }
      : {
          method: request.method,
          path: request.originalUrl,
          name: error instanceof Error ? error.name : "UnknownError",
        },
  );

  response.status(500).json({
    status: "error",
    code: "INTERNAL_SERVER_ERROR",
    message: "The request could not be completed.",
  });
};
