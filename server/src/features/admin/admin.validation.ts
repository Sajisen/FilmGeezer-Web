import { z } from "zod";

import {
  ADMIN_EMAIL_MAXIMUM_LENGTH,
  ADMIN_PASSWORD_MAXIMUM_LENGTH,
} from "./admin.constants.js";

export const adminLoginInputSchema = z
  .object({
    email: z
      .string({ error: "Email must be text." })
      .trim()
      .min(1, "Email is required.")
      .max(ADMIN_EMAIL_MAXIMUM_LENGTH, "Email is too long.")
      .email("Enter a valid email address."),
    password: z
      .string({ error: "Password must be text." })
      .min(1, "Password is required.")
      .max(ADMIN_PASSWORD_MAXIMUM_LENGTH, "Password is too long."),
  })
  .strict()
  .transform(({ email, password }) => ({
    emailNormalized: email.toLowerCase(),
    password,
  }));

export type AdminLoginInput = z.input<typeof adminLoginInputSchema>;
export type NormalizedAdminLoginInput = z.output<
  typeof adminLoginInputSchema
>;

export function parseAdminLoginInput(
  input: AdminLoginInput,
): NormalizedAdminLoginInput {
  return adminLoginInputSchema.parse(input);
}