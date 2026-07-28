import { z } from "zod";
import { AUTH_INPUT_LIMITS } from "./auth.constants.js";

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/u;
const MULTIPLE_WHITESPACE_PATTERN = /\s+/gu;

function countUnicodeCodePoints(value: string): number {
  return Array.from(value).length;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeDisplayName(displayName: string): string {
  return displayName
    .normalize("NFKC")
    .trim()
    .replace(MULTIPLE_WHITESPACE_PATTERN, " ");
}

const registrationEmailSchema = z
  .string({
    error: "Email must be text.",
  })
  .trim()
  .min(1, "Email is required.")
  .max(
    AUTH_INPUT_LIMITS.emailMaximumLength,
    "Email is too long.",
  )
  .email("Enter a valid email address.");

const registrationDisplayNameSchema = z
  .string({
    error: "Display name must be text.",
  })
  /*
   * This first limit protects the normalisation step from receiving an
   * unnecessarily large value. The final user-facing limit is checked
   * after whitespace has been normalised.
   */
  .max(200, "Display name is too long.")
  .superRefine((displayName, context) => {
    /*
     * Validate the original value before whitespace normalisation so
     * tabs, line breaks, and other control characters are rejected
     * rather than silently converted into ordinary spaces.
     */
    if (CONTROL_CHARACTER_PATTERN.test(displayName)) {
      context.addIssue({
        code: "custom",
        message:
          "Display name contains unsupported control characters.",
      });
    }
  })
  .transform(normalizeDisplayName)
  .superRefine((displayName, context) => {
    const characterCount =
      countUnicodeCodePoints(displayName);

    if (
      characterCount <
      AUTH_INPUT_LIMITS.displayNameMinimumLength
    ) {
      context.addIssue({
        code: "custom",
        message: `Display name must contain at least ${AUTH_INPUT_LIMITS.displayNameMinimumLength} characters.`,
      });
    }

    if (
      characterCount >
      AUTH_INPUT_LIMITS.displayNameMaximumLength
    ) {
      context.addIssue({
        code: "custom",
        message: `Display name must contain no more than ${AUTH_INPUT_LIMITS.displayNameMaximumLength} characters.`,
      });
    }
  });

const registrationPasswordSchema = z
  .string({
    error: "Password must be text.",
  })
  .superRefine((password, context) => {
    /*
     * Do not trim or normalise passwords.
     *
     * Spaces and Unicode characters are valid password content, and the
     * password must be hashed exactly as the user entered it.
     */
    const characterCount = countUnicodeCodePoints(password);

    if (
      characterCount <
      AUTH_INPUT_LIMITS.passwordMinimumLength
    ) {
      context.addIssue({
        code: "custom",
        message: `Password must contain at least ${AUTH_INPUT_LIMITS.passwordMinimumLength} characters.`,
      });
    }

    if (
      characterCount >
      AUTH_INPUT_LIMITS.passwordMaximumLength
    ) {
      context.addIssue({
        code: "custom",
        message: `Password must contain no more than ${AUTH_INPUT_LIMITS.passwordMaximumLength} characters.`,
      });
    }

    if (!/\S/u.test(password)) {
      context.addIssue({
        code: "custom",
        message:
          "Password must contain at least one non-whitespace character.",
      });
    }
  });

export const registrationInputSchema = z
  .object({
    email: registrationEmailSchema,
    displayName: registrationDisplayNameSchema,
    password: registrationPasswordSchema,
  })
  .strict()
  .transform(({ email, displayName, password }) => ({
    emailDisplay: email,
    emailNormalized: normalizeEmail(email),
    displayName,
    password,
  }));

export type RegistrationInput = z.input<
  typeof registrationInputSchema
>;

export type NormalizedRegistrationInput = z.output<
  typeof registrationInputSchema
>;

export function parseRegistrationInput(
  value: unknown,
): NormalizedRegistrationInput {
  return registrationInputSchema.parse(value);
}