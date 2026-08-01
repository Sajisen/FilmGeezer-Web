import type {
  ErrorRequestHandler,
} from "express";
import { env } from "../config/env.js";

interface RequestBodyError
  extends SyntaxError {
  status?: number;
  statusCode?: number;
  type?: string;
}

function isRequestBodyError(
  error: unknown,
): error is RequestBodyError {
  return error instanceof SyntaxError;
}

export const handleHttpError:
  ErrorRequestHandler = (
    error,
    _req,
    res,
    next,
  ) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    res.setHeader(
      "Cache-Control",
      "no-store",
    );

    if (
      isRequestBodyError(error) &&
      error.type === "entity.parse.failed"
    ) {
      res.status(400).json({
        status: "error",
        code: "INVALID_JSON_BODY",

        message:
          "The request body contains invalid JSON.",
      });

      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "entity.too.large"
    ) {
      res.status(413).json({
        status: "error",
        code: "REQUEST_BODY_TOO_LARGE",

        message:
          "The request body is too large.",
      });

      return;
    }

    console.error(
      "[http] Unhandled request error",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",

        message:
          env.NODE_ENV ===
            "development" &&
          error instanceof Error
            ? error.message
            : undefined,
      },
    );

    res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",

      message:
        "The request could not be completed.",
    });
  };