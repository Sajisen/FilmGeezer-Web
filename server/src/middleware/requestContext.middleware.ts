import { randomUUID } from "node:crypto";

import type {
  NextFunction,
  Request,
  Response,
} from "express";

import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const REQUEST_CONTEXT_KEY = Symbol("filmgeezer-request-context");
const SLOW_REQUEST_THRESHOLD_MILLISECONDS = 2_000;

const UUID_SEGMENT_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const OBJECT_ID_SEGMENT_PATTERN = /^[0-9a-f]{24}$/iu;
const OPAQUE_IDENTIFIER_SEGMENT_PATTERN = /^[A-Za-z0-9_-]{20,}$/u;

type RequestContext = {
  requestId: string;
  startedAtHighResolution: bigint;
};

type RequestWithContext = Request & {
  [REQUEST_CONTEXT_KEY]?: RequestContext;
};

function setRequestContext(
  request: Request,
  context: RequestContext,
): void {
  (request as RequestWithContext)[REQUEST_CONTEXT_KEY] = context;
}

export function getRequestContext(request: Request): RequestContext | null {
  return (request as RequestWithContext)[REQUEST_CONTEXT_KEY] ?? null;
}

export function getRequestId(request: Request): string | null {
  return getRequestContext(request)?.requestId ?? null;
}

function isSensitivePathSegment(segment: string): boolean {
  return (
    UUID_SEGMENT_PATTERN.test(segment) ||
    OBJECT_ID_SEGMENT_PATTERN.test(segment) ||
    OPAQUE_IDENTIFIER_SEGMENT_PATTERN.test(segment)
  );
}

export function getSafeRequestPath(request: Request): string {
  const pathWithoutQuery = request.originalUrl.split("?", 1)[0] || "/";

  return pathWithoutQuery
    .split("/")
    .map((segment) => {
      if (isSensitivePathSegment(segment)) {
        return ":id";
      }

      return segment;
    })
    .join("/");
}

function isHealthRequest(path: string): boolean {
  return path === "/api/health" || path.startsWith("/api/health/");
}

function isMutationMethod(method: string): boolean {
  return method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
}

function shouldLogRequest(input: {
  method: string;
  path: string;
  statusCode: number;
  durationMilliseconds: number;
  aborted: boolean;
}): boolean {
  if (env.HTTP_ACCESS_LOG_MODE === "off") {
    return false;
  }

  if (isHealthRequest(input.path) && input.statusCode < 400 && !input.aborted) {
    return false;
  }

  const mutation = isMutationMethod(input.method);
  const failed = input.statusCode >= 400;
  const slow =
    input.durationMilliseconds >= SLOW_REQUEST_THRESHOLD_MILLISECONDS;

  // Client-side AbortController cancellation is expected for read requests
  // during navigation and stale-request replacement. Only full debugging
  // should print those. A disconnected mutation is still operationally useful.
  if (input.aborted && !mutation) {
    return env.HTTP_ACCESS_LOG_MODE === "all";
  }

  if (env.HTTP_ACCESS_LOG_MODE === "errors") {
    return failed || (input.aborted && mutation);
  }

  if (env.HTTP_ACCESS_LOG_MODE === "operational") {
    return failed || slow || (input.aborted && mutation);
  }

  if (env.HTTP_ACCESS_LOG_MODE === "mutations") {
    return failed || slow || mutation;
  }

  return true;
}

function logRequestCompletion(input: {
  request: Request;
  response: Response;
  requestId: string;
  startedAtHighResolution: bigint;
  aborted: boolean;
}): void {
  const durationMilliseconds =
    Number(process.hrtime.bigint() - input.startedAtHighResolution) / 1_000_000;
  const path = getSafeRequestPath(input.request);
  const statusCode = input.response.statusCode;

  if (
    !shouldLogRequest({
      method: input.request.method,
      path,
      statusCode,
      durationMilliseconds,
      aborted: input.aborted,
    })
  ) {
    return;
  }

  const metadata = {
    requestId: input.requestId,
    method: input.request.method,
    path,
    statusCode,
    durationMilliseconds: Number(durationMilliseconds.toFixed(1)),
    aborted: input.aborted,
    ...(input.aborted ? { outcome: "client_aborted" } : {}),
  };

  if (input.aborted) {
    if (isMutationMethod(input.request.method)) {
      logger.warn("http.request", metadata);
      return;
    }

    logger.debug("http.request", metadata);
    return;
  }

  if (statusCode >= 500) {
    logger.error("http.request", metadata);
    return;
  }

  if (statusCode >= 400) {
    logger.warn("http.request", metadata);
    return;
  }

  logger.info("http.request", metadata);
}

export function attachRequestContext(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();
  const startedAtHighResolution = process.hrtime.bigint();

  setRequestContext(request, {
    requestId,
    startedAtHighResolution,
  });

  response.setHeader("X-Request-ID", requestId);

  let completionLogged = false;

  response.once("finish", () => {
    if (completionLogged) {
      return;
    }

    completionLogged = true;
    logRequestCompletion({
      request,
      response,
      requestId,
      startedAtHighResolution,
      aborted: false,
    });
  });

  response.once("close", () => {
    if (completionLogged || response.writableEnded) {
      return;
    }

    completionLogged = true;
    logRequestCompletion({
      request,
      response,
      requestId,
      startedAtHighResolution,
      aborted: true,
    });
  });

  next();
}
