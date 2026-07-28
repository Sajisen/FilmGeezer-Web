import { env } from "../../config/env.js";
import { AuthEmailConfigurationError } from "./auth.errors.js";

export interface SendEmailVerificationInput {
  recipientEmail: string;
  displayName: string;

  verificationCode: string;
  expiresAt: Date;
}

export interface AuthEmailService {
  sendEmailVerification(input: SendEmailVerificationInput): Promise<void>;
}

export const developmentAuthEmailService: AuthEmailService = {
  async sendEmailVerification(
    input: SendEmailVerificationInput,
  ): Promise<void> {
    if (env.NODE_ENV === "production") {
      throw new AuthEmailConfigurationError(
        "The development email adapter cannot run in production.",
      );
    }

    console.log(
      [
        "",
        "==================================================",
        "FilmGeezer development verification email",
        "==================================================",
        `Recipient: ${input.recipientEmail}`,
        `Verification code: ${input.verificationCode}`,
        `Expires at: ${input.expiresAt.toISOString()}`,
        "==================================================",
        "",
      ].join("\n"),
    );
  },
};
