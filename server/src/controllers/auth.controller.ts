import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";
import {
  AuthEmailConfigurationError,
  AuthPersistenceError,
  AuthWeakPasswordError,
} from "../features/auth/auth.errors.js";
import {
  startLocalRegistration,
} from "../features/auth/auth.registration-orchestration.service.js";

const REGISTRATION_ACCEPTED_MESSAGE =
  "If this email address can be registered, a verification code will be sent shortly.";

const REGISTRATION_FIELD_NAMES = [
  "email",
  "displayName",
  "password",
] as const;

type RegistrationFieldName =
  (typeof REGISTRATION_FIELD_NAMES)[number];

interface RegistrationValidationDetails {
  form: string[];

  fields: Record<
    RegistrationFieldName,
    string[]
  >;
}

function isRegistrationFieldName(
  value: unknown,
): value is RegistrationFieldName {
  return (
    typeof value === "string" &&
    REGISTRATION_FIELD_NAMES.some(
      (fieldName) => fieldName === value,
    )
  );
}

function createRegistrationValidationDetails(
  error: z.ZodError,
): RegistrationValidationDetails {
  const details: RegistrationValidationDetails = {
    form: [],

    fields: {
      email: [],
      displayName: [],
      password: [],
    },
  };

  for (const issue of error.issues) {
    const [fieldName] = issue.path;

    if (isRegistrationFieldName(fieldName)) {
      details.fields[fieldName].push(
        issue.message,
      );

      continue;
    }

    /*
     * Errors without one of the known registration-field paths belong
     * to the form as a whole. For example, Zod's strict-object error for
     * an unsupported property such as `role` has no recognised field
     * destination.
     */
    details.form.push(issue.message);
  }

  return details;
}

export async function registerLocalAccount(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  res.setHeader("Cache-Control", "no-store");

  try {
    const result =
      await startLocalRegistration(req.body);

    /*
     * 202 Accepted is used because account activation is not complete.
     * The user must still verify the email address.
     */
    res.status(202).json({
      status: "success",
      code: "AUTH_REGISTRATION_ACCEPTED",

      message:
        REGISTRATION_ACCEPTED_MESSAGE,

      verification: {
        challengeId:
          result.verification.challengeId,

        expiresAt:
          result.verification.expiresAt
            .toISOString(),

        resendAvailableAt:
          result.verification
            .resendAvailableAt
            .toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        status: "error",
        code:
          "AUTH_INVALID_REGISTRATION_INPUT",

        message:
          "Check the registration details and try again.",

        errors:
          createRegistrationValidationDetails(
            error,
          ),
      });

      return;
    }

    if (
      error instanceof
      AuthWeakPasswordError
    ) {
      res.status(422).json({
        status: "error",
        code: error.code,
        message: error.message,

        password: {
          reason: error.reason,
        },
      });

      return;
    }

    if (
      error instanceof
      AuthEmailConfigurationError
    ) {
      console.error(
        "[auth-registration] Email service is not configured.",
        {
          name: error.name,
          code: error.code,
        },
      );

      res.status(503).json({
        status: "error",
        code:
          "AUTH_EMAIL_TEMPORARILY_UNAVAILABLE",

        message:
          "Verification email is temporarily unavailable. Please try again shortly.",
      });

      return;
    }

    if (
      error instanceof
      AuthPersistenceError
    ) {
      console.error(
        "[auth-registration] Registration persistence failed.",
        {
          name: error.name,
          code: error.code,
        },
      );

      res.status(503).json({
        status: "error",
        code:
          "AUTH_TEMPORARILY_UNAVAILABLE",

        message:
          "Account registration is temporarily unavailable. Please try again shortly.",
      });

      return;
    }

    next(error);
  }
}