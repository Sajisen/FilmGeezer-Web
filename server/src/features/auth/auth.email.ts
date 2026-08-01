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

export interface SendEmailChangeVerificationInput {
  recipientEmail: string;
  displayName: string;
  verificationCode: string;
  expiresAt: Date;
}

export interface SendEmailChangedNoticeInput {
  recipientEmail: string;
  displayName: string;
  newEmail: string;
  changedAt: Date;
}


export interface SendAccountDeactivatedNoticeInput {
  recipientEmail: string;
  displayName: string;
  deactivatedAt: Date;
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

  sendEmailChangeVerification(
    input: SendEmailChangeVerificationInput,
  ): Promise<void>;

  sendEmailChangedNotice(
    input: SendEmailChangedNoticeInput,
  ): Promise<void>;

  sendAccountDeactivatedNotice(
    input: SendAccountDeactivatedNoticeInput,
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

    async sendEmailChangeVerification(
      input: SendEmailChangeVerificationInput,
    ): Promise<void> {
      assertDevelopmentEmailAdapter();

      console.log(
        [
          "",
          "==================================================",
          "FilmGeezer development email-change verification",
          "==================================================",
          `Recipient: ${input.recipientEmail}`,
          `Display name: ${input.displayName}`,
          `Verification code: ${input.verificationCode}`,
          `Expires at: ${input.expiresAt.toISOString()}`,
          "The current account email remains unchanged until this code is verified.",
          "==================================================",
          "",
        ].join("\n"),
      );
    },

    async sendEmailChangedNotice(
      input: SendEmailChangedNoticeInput,
    ): Promise<void> {
      assertDevelopmentEmailAdapter();

      console.log(
        [
          "",
          "==================================================",
          "FilmGeezer development email-changed notice",
          "==================================================",
          `Recipient: ${input.recipientEmail}`,
          `Display name: ${input.displayName}`,
          `New email: ${input.newEmail}`,
          `Changed at: ${input.changedAt.toISOString()}`,
          "If this change was unexpected, contact FilmGeezer support immediately.",
          "==================================================",
          "",
        ].join("\n"),
      );
    },

    async sendAccountDeactivatedNotice(
      input: SendAccountDeactivatedNoticeInput,
    ): Promise<void> {
      assertDevelopmentEmailAdapter();

      console.log(
        [
          "",
          "==================================================",
          "FilmGeezer development account-deactivated notice",
          "==================================================",
          `Recipient: ${input.recipientEmail}`,
          `Display name: ${input.displayName}`,
          `Deactivated at: ${input.deactivatedAt.toISOString()}`,
          "Every active FilmGeezer session was signed out.",
          "The account data was not permanently deleted. Contact FilmGeezer support for a controlled recovery request.",
          "==================================================",
          "",
        ].join("\n"),
      );
    },
  };
