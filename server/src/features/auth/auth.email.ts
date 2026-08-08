import { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import {
  createAccountDeactivatedNoticeTemplate,
  createEmailChangedNoticeTemplate,
  createEmailChangeVerificationTemplate,
  createEmailVerificationTemplate,
  createExistingAccountRegistrationNoticeTemplate,
  createPasswordResetTemplate,
  createWelcomeTemplate,
} from "../email/email.templates.js";
import {
  TransactionalEmailConfigurationError,
  TransactionalEmailDeliveryError,
} from "../email/email.errors.js";
import {
  sendTransactionalEmail,
} from "../email/email.service.js";
import {
  AuthEmailConfigurationError,
  AuthEmailDeliveryError,
} from "./auth.errors.js";

export interface SendEmailVerificationInput {
  recipientEmail: string;
  displayName: string;
  verificationCode: string;
  expiresAt: Date;
  idempotencyKey: string;
  challengeId: string;
  userId?: string | null;
}

export interface SendExistingAccountRegistrationNoticeInput {
  recipientEmail: string;
  attemptedAt: Date;
  idempotencyKey: string;
}

export interface SendPasswordResetInput {
  recipientEmail: string;
  displayName: string;
  resetUrl: string;
  expiresAt: Date;
  idempotencyKey: string;
  challengeId: string;
  userId?: string | null;
}

export interface SendEmailChangeVerificationInput {
  recipientEmail: string;
  displayName: string;
  verificationCode: string;
  expiresAt: Date;
  idempotencyKey: string;
  challengeId: string;
  userId?: string | null;
}

export interface SendEmailChangedNoticeInput {
  recipientEmail: string;
  displayName: string;
  newEmail: string;
  changedAt: Date;
  idempotencyKey: string;
  userId: string;
}

export interface SendAccountDeactivatedNoticeInput {
  recipientEmail: string;
  displayName: string;
  deactivatedAt: Date;
  idempotencyKey: string;
  userId: string;
}

export interface SendWelcomeEmailInput {
  recipientEmail: string;
  displayName: string;
  idempotencyKey: string;
  userId: string;
}

export interface AuthEmailService {
  sendEmailVerification(input: SendEmailVerificationInput): Promise<void>;
  sendExistingAccountRegistrationNotice(
    input: SendExistingAccountRegistrationNoticeInput,
  ): Promise<void>;
  sendPasswordReset(input: SendPasswordResetInput): Promise<void>;
  sendEmailChangeVerification(
    input: SendEmailChangeVerificationInput,
  ): Promise<void>;
  sendEmailChangedNotice(input: SendEmailChangedNoticeInput): Promise<void>;
  sendAccountDeactivatedNotice(
    input: SendAccountDeactivatedNoticeInput,
  ): Promise<void>;
  sendWelcomeEmail(input: SendWelcomeEmailInput): Promise<void>;
}

function mapEmailError(error: unknown): never {
  if (error instanceof TransactionalEmailConfigurationError) {
    throw new AuthEmailConfigurationError(error.message, { cause: error });
  }

  if (error instanceof TransactionalEmailDeliveryError) {
    throw new AuthEmailDeliveryError(error.message, { cause: error });
  }

  throw new AuthEmailDeliveryError(
    "The FilmGeezer authentication email could not be submitted.",
    { cause: error },
  );
}

function buildSourceUserId(value?: string | null) {
  if (!value) {
    return null;
  }

  try {
    return new ObjectId(value);
  } catch {
    return null;
  }
}

export const authEmailService: AuthEmailService = {
  async sendEmailVerification(input) {
    const template = createEmailVerificationTemplate(input);

    try {
      await sendTransactionalEmail({
        kind: "verify-email",
        recipientEmail: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: input.idempotencyKey,
        source: {
          type: "auth-challenge",
          id: input.challengeId,
          userId: buildSourceUserId(input.userId),
        },
      });
    } catch (error) {
      mapEmailError(error);
    }
  },

  async sendExistingAccountRegistrationNotice(input) {
    const template = createExistingAccountRegistrationNoticeTemplate({
      attemptedAt: input.attemptedAt,
      signInUrl: `${env.CLIENT_APP_ORIGIN}/login`,
    });

    try {
      await sendTransactionalEmail({
        kind: "existing-account-registration-notice",
        recipientEmail: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: input.idempotencyKey,
        source: {
          type: "account-event",
          id: input.idempotencyKey,
          userId: null,
        },
      });
    } catch (error) {
      mapEmailError(error);
    }
  },

  async sendPasswordReset(input) {
    const template = createPasswordResetTemplate(input);

    try {
      await sendTransactionalEmail({
        kind: "password-reset",
        recipientEmail: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: input.idempotencyKey,
        source: {
          type: "auth-challenge",
          id: input.challengeId,
          userId: buildSourceUserId(input.userId),
        },
      });
    } catch (error) {
      mapEmailError(error);
    }
  },

  async sendEmailChangeVerification(input) {
    const template = createEmailChangeVerificationTemplate(input);

    try {
      await sendTransactionalEmail({
        kind: "email-change-verification",
        recipientEmail: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: input.idempotencyKey,
        source: {
          type: "auth-challenge",
          id: input.challengeId,
          userId: buildSourceUserId(input.userId),
        },
      });
    } catch (error) {
      mapEmailError(error);
    }
  },

  async sendEmailChangedNotice(input) {
    const template = createEmailChangedNoticeTemplate(input);

    try {
      await sendTransactionalEmail({
        kind: "email-changed-notice",
        recipientEmail: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: input.idempotencyKey,
        source: {
          type: "account-event",
          id: input.idempotencyKey,
          userId: buildSourceUserId(input.userId),
        },
      });
    } catch (error) {
      mapEmailError(error);
    }
  },

  async sendAccountDeactivatedNotice(input) {
    const template = createAccountDeactivatedNoticeTemplate(input);

    try {
      await sendTransactionalEmail({
        kind: "account-deactivated-notice",
        recipientEmail: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: input.idempotencyKey,
        source: {
          type: "account-event",
          id: input.idempotencyKey,
          userId: buildSourceUserId(input.userId),
        },
      });
    } catch (error) {
      mapEmailError(error);
    }
  },

  async sendWelcomeEmail(input) {
    const template = createWelcomeTemplate({
      displayName: input.displayName,
      publicAppUrl: env.CLIENT_APP_ORIGIN,
    });

    try {
      await sendTransactionalEmail({
        kind: "welcome",
        recipientEmail: input.recipientEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        idempotencyKey: input.idempotencyKey,
        source: {
          type: "user-welcome",
          id: input.userId,
          userId: buildSourceUserId(input.userId),
        },
      });
    } catch (error) {
      mapEmailError(error);
    }
  },
};

/*
 * Kept as a compatibility export for existing dependency-injection tests.
 * The generic transactional service automatically uses the development
 * console adapter outside production and Resend in production.
 */
export const developmentAuthEmailService = authEmailService;
