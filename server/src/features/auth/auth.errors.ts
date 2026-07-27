import { MongoServerError } from "mongodb";

export class AuthAccountConflictError extends Error {
  readonly code = "AUTH_ACCOUNT_CONFLICT";

  constructor() {
    super(
      "An account may already exist for the supplied email address.",
    );

    this.name = "AuthAccountConflictError";
  }
}

export class AuthPersistenceError extends Error {
  readonly code = "AUTH_PERSISTENCE_ERROR";

  constructor(
    message = "Authentication data could not be saved.",
    options?: ErrorOptions,
  ) {
    super(message, options);

    this.name = "AuthPersistenceError";
  }
}

export function isMongoDuplicateKeyError(
  error: unknown,
): error is MongoServerError {
  return (
    error instanceof MongoServerError &&
    error.code === 11_000
  );
}