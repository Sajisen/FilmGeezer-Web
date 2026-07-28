import { z } from "zod";
import {
  AUTH_EMAIL_VERIFICATION_POLICY,
  AUTH_INPUT_LIMITS,
} from "./auth.constants.js";

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
     * Check the original value before normalisation.
     *
     * Otherwise, tabs and line breaks could be converted into ordinary
     * spaces before validation detects them.
     */
    if (
      CONTROL_CHARACTER_PATTERN.test(
        displayName,
      )
    ) {
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

const emailVerificationChallengeIdSchema = z.uuid({
  version: "v4",
  error:
    "Verification challenge ID is invalid.",
});

const EMAIL_VERIFICATION_CODE_PATTERN =
  new RegExp(
    `^\\d{${AUTH_EMAIL_VERIFICATION_POLICY.codeDigits}}$`,
    "u",
  );

export const emailVerificationInputSchema = z
  .object({
    challengeId:
      emailVerificationChallengeIdSchema,

    /*
     * Keep the code as a string so leading zeroes are preserved.
     * Outer whitespace is ignored to support pasted codes.
     */
    code: z
      .string({
        error:
          "Verification code must be text.",
      })
      .trim()
      .regex(
        EMAIL_VERIFICATION_CODE_PATTERN,
        `Verification code must contain exactly ${AUTH_EMAIL_VERIFICATION_POLICY.codeDigits} digits.`,
      ),
  })
  .strict();

export type EmailVerificationInput = z.input<
  typeof emailVerificationInputSchema
>;

export type NormalizedEmailVerificationInput =
  z.output<
    typeof emailVerificationInputSchema
  >;

export function parseEmailVerificationInput(
  value: unknown,
): NormalizedEmailVerificationInput {
  return emailVerificationInputSchema.parse(
    value,
  );
}

export const emailVerificationResendInputSchema =
  z
    .object({
      /*
       * Resend is authorised by possession of the unguessable public
       * challenge ID rather than by an email address. This avoids
       * turning the endpoint into an account-enumeration mechanism.
       */
      challengeId:
        emailVerificationChallengeIdSchema,
    })
    .strict();

export type EmailVerificationResendInput =
  z.input<
    typeof emailVerificationResendInputSchema
  >;

export type NormalizedEmailVerificationResendInput =
  z.output<
    typeof emailVerificationResendInputSchema
  >;

export function parseEmailVerificationResendInput(
  value: unknown,
): NormalizedEmailVerificationResendInput {
  return emailVerificationResendInputSchema.parse(
    value,
  );
}

const loginEmailSchema = z
  .string({
    error: "Email must be text.",
  })
  .trim()
  .min(
    1,
    "Email is required.",
  )
  .max(
    AUTH_INPUT_LIMITS.emailMaximumLength,
    "Email is too long.",
  )
  .email(
    "Enter a valid email address.",
  );

const loginPasswordSchema = z
  .string({
    error: "Password must be text.",
  })
  .min(
    1,
    "Password is required.",
  )
  .superRefine(
    (
      password,
      context,
    ) => {
      /*
       * Login must preserve the password exactly as entered. The only
       * structural protection here is the same maximum length used by
       * registration so an authentication request cannot force Argon2 to
       * process an unbounded value.
       */
      if (
        Array.from(password).length >
        AUTH_INPUT_LIMITS
          .passwordMaximumLength
      ) {
        context.addIssue({
          code: "custom",

          message: `Password must contain no more than ${AUTH_INPUT_LIMITS.passwordMaximumLength} characters.`,
        });
      }
    },
  );

export const loginInputSchema = z
  .object({
    email: loginEmailSchema,
    password: loginPasswordSchema,
  })
  .strict()
  .transform(
    ({
      email,
      password,
    }) => ({
      emailNormalized:
        normalizeEmail(email),

      password,
    }),
  );

export type LoginInput = z.input<
  typeof loginInputSchema
>;

export type NormalizedLoginInput = z.output<
  typeof loginInputSchema
>;

export function parseLoginInput(
  value: unknown,
): NormalizedLoginInput {
  return loginInputSchema.parse(value);
}
