import { env } from "../../config/env.js";
import {
  AuthEmailDeliveryError,
} from "./auth.errors.js";

export interface SendEmailVerificationInput {
  recipientEmail: string;
  displayName: string;

  verificationCode: string;
  expiresAt: Date;
}

export interface AuthEmailService {
  sendEmailVerification(
    input: SendEmailVerificationInput,
  ): Promise<void>;
}

export const developmentAuthEmailService:
  AuthEmailService = {
    async sendEmailVerification(
      input: SendEmailVerificationInput,
    ): Promise<void> {
      if (env.NODE_ENV === "production") {
        throw new AuthEmailDeliveryError(
          "The development email adapter cannot run in production.",
        );
      }

      console.info(
        "FilmGeezer development verification email",
        {
          recipientEmail: input.recipientEmail,
          displayName: input.displayName,

          verificationCode:
            input.verificationCode,

          expiresAt:
            input.expiresAt.toISOString(),
        },
      );
    },
  };