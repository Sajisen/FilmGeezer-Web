import { MongoServerError } from "mongodb";

import type {
  PasswordRejectionReason,
} from "./auth.password-quality.js";

export class AuthAccountConflictError extends Error {
  readonly code = "AUTH_ACCOUNT_CONFLICT";

  constructor() {
    super(
      "An account may already exist for the supplied email address.",
    );

    this.name = "AuthAccountConflictError";
  }
}

export class AuthWeakPasswordError extends Error {
  readonly code = "AUTH_WEAK_PASSWORD";

  constructor(
    readonly reason: PasswordRejectionReason,
  ) {
    super(
      reason === "common-or-predictable"
        ? "Choose a less common and less predictable password."
        : "The password does not meet the account requirements.",
    );

    this.name = "AuthWeakPasswordError";
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

export class AuthEmailDeliveryError extends Error {
  readonly code = "AUTH_EMAIL_DELIVERY_ERROR";

  constructor(
    message = "The authentication email could not be delivered.",
    options?: ErrorOptions,
  ) {
    super(message, options);

    this.name = "AuthEmailDeliveryError";
  }
}