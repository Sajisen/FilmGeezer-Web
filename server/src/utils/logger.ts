import { env } from "../config/env.js";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogMetadata = Record<string, unknown>;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACTED_VALUE = "[redacted]";
const MAX_OBJECT_DEPTH = 4;
const MAX_COLLECTION_ITEMS = 40;

const SENSITIVE_KEY_PATTERN =
  /(?:password|passwd|authorization|cookie|csrf|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|session[_-]?token|reset[_-]?token|verification[_-]?code|otp|totp|recovery[_-]?code|challenge[_-]?secret|email|ip[_-]?address|user[_-]?agent)/iu;

function shouldWrite(level: LogLevel): boolean {
  const configuredLevel = env.LOG_LEVEL;

  if (configuredLevel === "silent") {
    return false;
  }

  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLevel];
}

function getErrorCode(error: Error): string | undefined {
  const candidate = error as Error & {
    code?: unknown;
  };

  return typeof candidate.code === "string" ? candidate.code : undefined;
}

export function describeErrorForLog(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) {
    return {
      name: "UnknownError",
      ...(env.NODE_ENV === "development"
        ? {
            message: String(error),
          }
        : {}),
    };
  }

  const code = getErrorCode(error);

  return {
    name: error.name,
    ...(code ? { code } : {}),
    ...(env.NODE_ENV === "development"
      ? {
          message: error.message,
          stack: error.stack,
        }
      : {}),
  };
}

function normalizeLogValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "undefined") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return describeErrorForLog(value);
  }

  if (typeof value !== "object") {
    return String(value);
  }

  if (depth >= MAX_OBJECT_DEPTH) {
    return "[truncated]";
  }

  if (seen.has(value)) {
    return "[circular]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_COLLECTION_ITEMS)
      .map((item) => normalizeLogValue(item, depth + 1, seen));
  }

  const normalized: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value).slice(0, MAX_COLLECTION_ITEMS)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      normalized[key] = REDACTED_VALUE;
      continue;
    }

    const normalizedItem = normalizeLogValue(item, depth + 1, seen);

    if (normalizedItem !== undefined) {
      normalized[key] = normalizedItem;
    }
  }

  return normalized;
}

function normalizeMetadata(metadata: LogMetadata | undefined): LogMetadata {
  if (!metadata) {
    return {};
  }

  const normalized = normalizeLogValue(metadata, 0, new WeakSet<object>());

  return typeof normalized === "object" && normalized !== null
    ? (normalized as LogMetadata)
    : {};
}

function formatPrettyValue(value: unknown): string {
  if (typeof value === "string") {
    if (/^[A-Za-z0-9_./:@+-]+$/u.test(value)) {
      return value;
    }

    return JSON.stringify(value);
  }

  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return String(value);
  }

  return JSON.stringify(value);
}

function serializePrettyRecord(
  timestamp: string,
  level: LogLevel,
  event: string,
  metadata: LogMetadata,
): string {
  const details = Object.entries(metadata)
    .map(([key, value]) => `${key}=${formatPrettyValue(value)}`)
    .join(" ");

  return `${timestamp} ${level.toUpperCase()} ${event}${
    details ? ` ${details}` : ""
  }`;
}

function writeSerializedLog(level: LogLevel, serialized: string): void {
  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  if (level === "debug") {
    console.debug(serialized);
    return;
  }

  console.info(serialized);
}

function writeLog(
  level: LogLevel,
  event: string,
  metadata?: LogMetadata,
): void {
  if (!shouldWrite(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const normalizedMetadata = normalizeMetadata(metadata);

  if (env.LOG_FORMAT === "pretty") {
    writeSerializedLog(
      level,
      serializePrettyRecord(
        timestamp,
        level,
        event,
        normalizedMetadata,
      ),
    );
    return;
  }

  const record = {
    timestamp,
    level,
    service: "filmgeezer-api",
    environment: env.NODE_ENV,
    event,
    ...normalizedMetadata,
  };

  writeSerializedLog(level, JSON.stringify(record));
}

export const logger = {
  debug(event: string, metadata?: LogMetadata): void {
    writeLog("debug", event, metadata);
  },

  info(event: string, metadata?: LogMetadata): void {
    writeLog("info", event, metadata);
  },

  warn(event: string, metadata?: LogMetadata): void {
    writeLog("warn", event, metadata);
  },

  error(event: string, metadata?: LogMetadata): void {
    writeLog("error", event, metadata);
  },
};
