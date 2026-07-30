import { env } from "../../config/env.js";

import {
  AuthEmailConfigurationError,
} from "./auth.errors.js";

export interface SendEmailVerificationInput {
  recipientEmail: string;
  displayName: string;
  verificationCode: string;
  expiresAt: Date;
}

export interface SendExistingAccountRegistrationNoticeInput {
  recipientEmail: string;
  attemptedAt: Date;
}

export interface SendPasswordResetInput {
  recipientEmail: string;
  displayName: string;
  resetUrl: string;
  expiresAt: Date;
}

export interface AuthEmailService {
  sendEmailVerification(
    input: SendEmailVerificationInput,
  ): Promise<void>;

  sendExistingAccountRegistrationNotice(
    input: SendExistingAccountRegistrationNoticeInput,
  ): Promise<void>;

  sendPasswordReset(
    input: SendPasswordResetInput,
  ): Promise<void>;
}

function assertDevelopmentEmailAdapter(): void {
  if (env.NODE_ENV === "production") {
    throw new AuthEmailConfigurationError(
      "The development email adapter cannot run in production.",
    );
  }
}

export const developmentAuthEmailService:
  AuthEmailService = {
    async sendEmailVerification(
      input: SendEmailVerificationInput,
    ): Promise<void> {
      assertDevelopmentEmailAdapter();

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

    async sendExistingAccountRegistrationNotice(
      input: SendExistingAccountRegistrationNoticeInput,
    ): Promise<void> {
      assertDevelopmentEmailAdapter();

      console.log(
        [
          "",
          "==================================================",
          "FilmGeezer existing-account registration notice",
          "==================================================",
          `Recipient: ${input.recipientEmail}`,
          "A registration attempt used this email address.",
          "The account was not changed and no verification code was created.",
          "Use Sign in to continue. A pending account can resume verification after a successful password check.",
          `Attempted at: ${input.attemptedAt.toISOString()}`,
          "==================================================",
          "",
        ].join("\n"),
      );
    },

    async sendPasswordReset(
      input: SendPasswordResetInput,
    ): Promise<void> {
      assertDevelopmentEmailAdapter();

      console.log(
        [
          "",
          "==================================================",
          "FilmGeezer development password-reset email",
          "==================================================",
          `Recipient: ${input.recipientEmail}`,
          `Display name: ${input.displayName}`,
          `Reset link: ${input.resetUrl}`,
          `Expires at: ${input.expiresAt.toISOString()}`,
          "This link is single-use. FilmGeezer will revoke every active session after a successful reset.",
          "==================================================",
          "",
        ].join("\n"),
      );
    },
  };
