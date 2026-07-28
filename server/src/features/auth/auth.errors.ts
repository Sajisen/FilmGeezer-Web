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

export class AuthEmailConfigurationError extends Error {
  readonly code = "AUTH_EMAIL_CONFIGURATION_ERROR";

  constructor(
    message =
      "The authentication email service is not configured.",
    options?: ErrorOptions,
  ) {
    super(message, options);

    this.name = "AuthEmailConfigurationError";
  }
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

export const AUTH_EMAIL_VERIFICATION_REJECTION_REASONS =
  [
    "invalid-challenge",
    "incorrect-code",
    "expired",
    "attempts-exceeded",
    "already-used",
    "account-unavailable",
  ] as const;

export type AuthEmailVerificationRejectionReason =
  (typeof AUTH_EMAIL_VERIFICATION_REJECTION_REASONS)[number];

export class AuthEmailVerificationError extends Error {
  readonly code =
    "AUTH_EMAIL_VERIFICATION_REJECTED";

  constructor(
    readonly reason:
      AuthEmailVerificationRejectionReason,

    readonly attemptsRemaining:
      number | null = null,
  ) {
    super(
      "The email verification request could not be completed.",
    );

    this.name =
      "AuthEmailVerificationError";
  }
}