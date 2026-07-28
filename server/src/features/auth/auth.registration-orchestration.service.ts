import { randomUUID } from "node:crypto";
import { ObjectId } from "mongodb";
import {
  AUTH_EMAIL_VERIFICATION_POLICY,
} from "./auth.constants.js";
import {
  developmentAuthEmailService,
  type AuthEmailService,
} from "./auth.email.js";
import {
  AuthAccountConflictError,
  AuthEmailConfigurationError,
  AuthPersistenceError,
} from "./auth.errors.js";
import {
  registerLocalUser,
} from "./auth.registration.service.js";
import type {
  RegistrationInput,
} from "./auth.validation.js";
import {
  createAuthAuditEvent,
} from "./repositories/authAudit.repository.js";
import {
  recordEmailVerificationSendAttempt,
} from "./repositories/authChallenge.repository.js";

export interface RegistrationVerificationReceipt {
  challengeId: string;
  expiresAt: Date;
  resendAvailableAt: Date;
}

export interface StartLocalRegistrationResult {
  verification: RegistrationVerificationReceipt;
}

export interface StartLocalRegistrationDependencies {
  emailService: AuthEmailService;
}

const defaultDependencies:
  StartLocalRegistrationDependencies = {
    emailService: developmentAuthEmailService,
  };

function createResendAvailableAt(
  sentAt: Date,
): Date {
  return new Date(
    sentAt.getTime() +
      AUTH_EMAIL_VERIFICATION_POLICY
        .resendCooldownMilliseconds,
  );
}

function createDecoyVerificationReceipt(
  createdAt = new Date(),
): RegistrationVerificationReceipt {
  /*
   * An existing email address receives the same public response shape
   * as a newly registered address.
   *
   * This UUID is deliberately not stored. It prevents the registration
   * endpoint from confirming whether an account already exists.
   */
  return {
    challengeId: randomUUID(),

    expiresAt: new Date(
      createdAt.getTime() +
        AUTH_EMAIL_VERIFICATION_POLICY
          .expiresAfterMilliseconds,
    ),

    resendAvailableAt:
      createResendAvailableAt(createdAt),
  };
}

async function recordVerificationDeliveryOutcome(
  input: {
    userId: ObjectId;
    outcome: "success" | "failure";
    createdAt: Date;
  },
): Promise<void> {
  try {
    await createAuthAuditEvent({
      auditEventId: new ObjectId(),
      userId: input.userId,

      eventType: "verification-sent",
      outcome: input.outcome,

      details: {
        purpose: "verify-email",
      },

      createdAt: input.createdAt,
    });
  } catch (error) {
    /*
     * The account and challenge already exist, and the email call may
     * already have succeeded. An audit insertion failure must therefore
     * be reported safely without pretending the entire registration can
     * be rolled back.
     */
    console.error(
      "[auth-registration] Verification delivery audit could not be recorded.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

export async function startLocalRegistration(
  input: RegistrationInput,
  dependencies:
    StartLocalRegistrationDependencies =
      defaultDependencies,
): Promise<StartLocalRegistrationResult> {
  let preparedRegistration;

  try {
    preparedRegistration =
      await registerLocalUser(input);
  } catch (error) {
    if (error instanceof AuthAccountConflictError) {
      /*
       * Do not reveal whether the supplied email belongs to an existing
       * pending, active, suspended, or deleted account.
       */
      return {
        verification:
          createDecoyVerificationReceipt(),
      };
    }

    throw error;
  }

  const userId = new ObjectId(
    preparedRegistration.user.userId,
  );

  const deliveryAttemptedAt = new Date();

  const attemptWasRecorded =
    await recordEmailVerificationSendAttempt({
      publicId:
        preparedRegistration.verification
          .challengeId,

      userId,
      attemptedAt: deliveryAttemptedAt,
    });

  if (!attemptWasRecorded) {
    throw new AuthPersistenceError(
      "The verification delivery attempt could not be recorded.",
    );
  }

  try {
    await dependencies.emailService
      .sendEmailVerification({
        recipientEmail:
          preparedRegistration.user.email,

        displayName:
          preparedRegistration.user.displayName,

        verificationCode:
          preparedRegistration.verification.code,

        expiresAt:
          preparedRegistration.verification
            .expiresAt,
      });

    await recordVerificationDeliveryOutcome({
      userId,
      outcome: "success",
      createdAt: new Date(),
    });
  } catch (error) {
    await recordVerificationDeliveryOutcome({
      userId,
      outcome: "failure",
      createdAt: new Date(),
    });

    if (
      error instanceof
      AuthEmailConfigurationError
    ) {
      /*
       * A missing production provider is an application configuration
       * problem. Do not pretend that registration email is operational.
       *
       * The account remains pending so it can be repaired by the resend
       * flow after the provider is configured.
       */
      throw error;
    }

    /*
     * A temporary email delivery failure does not delete the account,
     * password credential, or verification challenge.
     *
     * The response remains generic and the upcoming resend endpoint can
     * safely generate and deliver another challenge.
     */
    console.error(
      "[auth-registration] Verification email delivery failed.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }

  return {
    verification: {
      challengeId:
        preparedRegistration.verification
          .challengeId,

      expiresAt:
        preparedRegistration.verification
          .expiresAt,

      resendAvailableAt:
        createResendAvailableAt(
          deliveryAttemptedAt,
        ),
    },
  };
}