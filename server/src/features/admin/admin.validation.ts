import { z } from "zod";

import {
  ADMIN_EMAIL_MAXIMUM_LENGTH,
  ADMIN_PASSWORD_MAXIMUM_LENGTH,
} from "./admin.constants.js";

const adminPasswordSchema = z
  .string({ error: "Password must be text." })
  .min(1, "Password is required.")
  .max(ADMIN_PASSWORD_MAXIMUM_LENGTH, "Password is too long.");

const adminMfaCodeSchema = z
  .string({ error: "Verification code must be text." })
  .trim()
  .min(1, "Verification code is required.")
  .max(64, "Verification code is too long.");

export const adminLoginInputSchema = z
  .object({
    email: z
      .string({ error: "Email must be text." })
      .trim()
      .min(1, "Email is required.")
      .max(ADMIN_EMAIL_MAXIMUM_LENGTH, "Email is too long.")
      .email("Enter a valid email address."),
    password: adminPasswordSchema,
  })
  .strict()
  .transform(({ email, password }) => ({
    emailNormalized: email.toLowerCase(),
    password,
  }));

export const adminMfaChallengeInputSchema = z
  .object({
    method: z.enum(["totp", "recovery"]),
    code: adminMfaCodeSchema,
  })
  .strict();

export const adminMfaSetupStartInputSchema = z
  .object({
    password: adminPasswordSchema.optional(),
  })
  .strict();

export const adminMfaSetupVerifyInputSchema = z
  .object({
    setupId: z.string().uuid("MFA setup reference is invalid."),
    code: z
      .string({ error: "Verification code must be text." })
      .trim()
      .regex(/^\d{6}$/u, "Enter the six-digit authenticator code."),
  })
  .strict();

export const adminMfaProtectedActionInputSchema = z
  .object({
    password: adminPasswordSchema,
    method: z.enum(["totp", "recovery"]),
    code: adminMfaCodeSchema,
  })
  .strict();

export type AdminLoginInput = z.input<typeof adminLoginInputSchema>;
export type NormalizedAdminLoginInput = z.output<
  typeof adminLoginInputSchema
>;
export type AdminMfaChallengeInput = z.input<
  typeof adminMfaChallengeInputSchema
>;
export type AdminMfaSetupStartInput = z.input<
  typeof adminMfaSetupStartInputSchema
>;
export type AdminMfaSetupVerifyInput = z.input<
  typeof adminMfaSetupVerifyInputSchema
>;
export type AdminMfaProtectedActionInput = z.input<
  typeof adminMfaProtectedActionInputSchema
>;

export function parseAdminLoginInput(
  input: AdminLoginInput,
): NormalizedAdminLoginInput {
  return adminLoginInputSchema.parse(input);
}
