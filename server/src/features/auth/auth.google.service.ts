import { ObjectId, type ClientSession, type TransactionOptions } from "mongodb";
import { OAuth2Client, type TokenPayload } from "google-auth-library";

import { env } from "../../config/env.js";
import { getMongoClient } from "../../config/database.js";

import {
  AUTH_EMAIL_VERIFICATION_POLICY,
  AUTH_INPUT_LIMITS,
} from "./auth.constants.js";

import { generateEmailVerificationChallenge } from "./auth.challenge.js";
import {
  authEmailService,
  sendGoogleSignInConnectedNoticeEmail,
} from "./auth.email.js";
import {
  AuthEmailConfigurationError,
  AuthGoogleAuthenticationError,
  AuthGoogleConfigurationError,
  AuthGoogleLinkConfirmationRequiredError,
  AuthPersistenceError,
  isMongoDuplicateKeyError,
} from "./auth.errors.js";
import { initializeAuthStorage } from "./auth.indexes.js";
import { verifyPassword } from "./auth.password.js";
import {
  createAuthSessionResult,
  createPreparedAuthSession,
  prepareAuthSession,
  type AuthSessionResult,
} from "./auth.session-creation.service.js";
import {
  normalizeDisplayName,
  normalizeEmail,
  parseGoogleAuthenticationInput,
  registrationEmailSchema,
  type GoogleAuthenticationInput,
} from "./auth.validation.js";
import {
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  type AuthRequestMetadata,
} from "./auth.session.js";
import { createWelcomeNotification } from "../notifications/notification.service.js";
import { initializeNotificationStorage } from "../notifications/notification.indexes.js";

import { createAuthAuditEvent } from "./repositories/authAudit.repository.js";
import {
  createEmailVerificationChallenge,
  findLatestEmailVerificationChallengeForUser,
  invalidateAllActiveChallengesForUser,
  recordEmailVerificationSendAttempt,
} from "./repositories/authChallenge.repository.js";
import {
  deleteAuthCredentialByUserId,
  findAuthCredentialByUserId,
} from "./repositories/authCredential.repository.js";
import {
  createAuthIdentity,
  deleteAuthIdentityByUserAndProvider,
  findAuthIdentityByProviderAndSubject,
  findAuthIdentityByUserAndProvider,
  updateAuthIdentityProviderEmail,
} from "./repositories/authIdentity.repository.js";
import {
  createActiveUser,
  createPendingUser,
  findActiveUserById,
  findPendingUserById,
  findUserById,
  findUserByNormalizedEmail,
  recordSuccessfulLogin,
  activatePendingUser,
} from "./repositories/authUser.repository.js";

const GOOGLE_AUTH_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 5_000,
};

export interface GoogleVerificationReceipt {
  challengeId: string;
  expiresAt: Date;
  resendAvailableAt: Date;
}

export type GoogleAuthenticationResult =
  | ({
      outcome: "authenticated";
      createdAccount: boolean;
      linkedExistingAccount: boolean;
    } & AuthSessionResult)
  | {
      outcome: "verification-required";
      email: string;
      verification: GoogleVerificationReceipt;
    };

interface VerifiedGoogleIdentity {
  subject: string;
  emailNormalized: string;
  emailDisplay: string;
  displayName: string;
  authoritativeEmail: boolean;
}

let googleClient: OAuth2Client | null = null;

function getGoogleClient(): OAuth2Client {
  if (!env.GOOGLE_AUTH_CLIENT_ID) {
    throw new AuthGoogleConfigurationError();
  }

  googleClient ??= new OAuth2Client();
  return googleClient;
}

function sanitizeGoogleDisplayName(
  payload: TokenPayload,
  emailNormalized: string,
): string {
  const candidates = [
    payload.name,
    [payload.given_name, payload.family_name]
      .filter((part): part is string => typeof part === "string")
      .join(" "),
    emailNormalized.split("@", 1)[0],
    "FilmGeezer User",
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const cleaned = normalizeDisplayName(
      candidate.replace(/[\u0000-\u001F\u007F]/gu, " "),
    );

    const codePoints = Array.from(cleaned).slice(
      0,
      AUTH_INPUT_LIMITS.displayNameMaximumLength,
    );

    const value = codePoints.join("").trim();

    if (
      Array.from(value).length >=
      AUTH_INPUT_LIMITS.displayNameMinimumLength
    ) {
      return value;
    }
  }

  return "FilmGeezer User";
}

async function verifyGoogleCredential(
  credential: string,
): Promise<VerifiedGoogleIdentity> {
  const client = getGoogleClient();

  let payload: TokenPayload | undefined;

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_AUTH_CLIENT_ID,
    });

    payload = ticket.getPayload();
  } catch {
    throw new AuthGoogleAuthenticationError("invalid-token");
  }

  if (
    !payload?.sub ||
    !payload.email ||
    payload.email_verified !== true
  ) {
    throw new AuthGoogleAuthenticationError(
      payload?.email_verified === false
        ? "email-unverified"
        : "invalid-token",
    );
  }

  const parsedEmail = registrationEmailSchema.safeParse(payload.email);

  if (!parsedEmail.success) {
    throw new AuthGoogleAuthenticationError("invalid-token");
  }

  const emailDisplay = parsedEmail.data;
  const emailNormalized = normalizeEmail(emailDisplay);

  const authoritativeEmail =
    emailNormalized.endsWith("@gmail.com") ||
    (
      payload.email_verified === true &&
      typeof payload.hd === "string" &&
      payload.hd.trim().length > 0
    );

  return {
    subject: payload.sub,
    emailNormalized,
    emailDisplay,
    displayName: sanitizeGoogleDisplayName(
      payload,
      emailNormalized,
    ),
    authoritativeEmail,
  };
}

async function syncVerifiedGoogleIdentityEmail(
  identity: {
    _id: ObjectId;
    providerEmailNormalized?: string | null;
    providerEmailDisplay?: string | null;
  },
  google: VerifiedGoogleIdentity,
  updatedAt: Date,
  session?: ClientSession,
): Promise<void> {
  if (
    identity.providerEmailNormalized === google.emailNormalized &&
    identity.providerEmailDisplay === google.emailDisplay
  ) {
    return;
  }

  const updated = await updateAuthIdentityProviderEmail(
    {
      identityId: identity._id,
      providerEmailNormalized: google.emailNormalized,
      providerEmailDisplay: google.emailDisplay,
      updatedAt,
    },
    session,
  );

  if (!updated) {
    throw new AuthPersistenceError(
      "The Google authentication identity could not be updated.",
    );
  }
}

async function recordGoogleAuthenticationFailure(
  input: {
    userId: ObjectId;
    reason: string;
    requestMetadata: AuthRequestMetadata;
    createdAt: Date;
  },
): Promise<void> {
  try {
    await createAuthAuditEvent({
      auditEventId: new ObjectId(),
      userId: input.userId,
      eventType: "login-failed",
      outcome: "failure",
      ipHash: hashAuthIpAddress(
        input.requestMetadata.ipAddress,
      ),
      userAgentSummary: summarizeAuthUserAgent(
        input.requestMetadata.userAgent,
      ),
      details: {
        provider: "google",
        reason: input.reason,
      },
      createdAt: input.createdAt,
    });
  } catch (error) {
    /*
     * The authentication attempt has already failed. A secondary audit
     * failure must not change the public result or expose persistence
     * details.
     */
    console.error(
      "[auth-google] Failed-authentication audit could not be recorded.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

async function recordGoogleVerificationDeliveryOutcome(
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
        source: "google-registration",
        provider: "google",
        sendNumber: 1,
      },
      createdAt: input.createdAt,
    });
  } catch (error) {
    console.error(
      "[auth-google] Verification-delivery audit could not be recorded.",
      {
        name:
          error instanceof Error
            ? error.name
            : "UnknownError",
      },
    );
  }
}

function createVerificationReceipt(
  challenge: {
    publicId: string;
    expiresAt: Date;
    lastSentAt: Date | null;
    createdAt: Date;
  },
): GoogleVerificationReceipt {
  const basis = challenge.lastSentAt ?? challenge.createdAt;

  return {
    challengeId: challenge.publicId,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: new Date(
      basis.getTime() +
        AUTH_EMAIL_VERIFICATION_POLICY.resendCooldownMilliseconds,
    ),
  };
}

async function createGoogleSessionForActiveUser(
  userId: ObjectId,
  requestMetadata: AuthRequestMetadata,
  authenticatedAt: Date,
  details: {
    createdAccount: boolean;
    linkedExistingAccount: boolean;
  },
): Promise<GoogleAuthenticationResult> {
  const preparedSession = prepareAuthSession(
    requestMetadata,
    authenticatedAt,
  );

  const client = await getMongoClient();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const user = await findActiveUserById(userId, session);

      if (!user) {
        throw new AuthGoogleAuthenticationError("account-unavailable");
      }

      const identity = await findAuthIdentityByUserAndProvider(
        user._id,
        "google",
        session,
      );

      if (!identity) {
        throw new AuthPersistenceError(
          "The Google authentication identity could not be found.",
        );
      }

      const updated = await recordSuccessfulLogin(
        {
          userId: user._id,
          loggedInAt: authenticatedAt,
        },
        session,
      );

      if (!updated) {
        throw new AuthGoogleAuthenticationError("account-unavailable");
      }

      const sessionsRevokedForLimit =
        await createPreparedAuthSession(
          user._id,
          "google",
          preparedSession,
          session,
        );

      await createAuthAuditEvent(
        {
          auditEventId: new ObjectId(),
          userId: user._id,
          eventType: "login-succeeded",
          outcome: "success",
          ipHash: preparedSession.ipHash,
          userAgentSummary: preparedSession.userAgentSummary,
          details: {
            provider: "google",
            createdAccount: details.createdAccount,
            linkedExistingAccount: details.linkedExistingAccount,
            sessionsRevokedForLimit,
          },
          createdAt: authenticatedAt,
        },
        session,
      );

      return {
        outcome: "authenticated" as const,
        createdAccount: details.createdAccount,
        linkedExistingAccount: details.linkedExistingAccount,
        ...createAuthSessionResult(
          user,
          "google",
          preparedSession,
        ),
      };
    }, GOOGLE_AUTH_TRANSACTION_OPTIONS);

    if (!result) {
      throw new AuthPersistenceError(
        "Google authentication completed without returning a session.",
      );
    }

    return result;
  } finally {
    await session.endSession();
  }
}

async function linkGoogleIdentityToPendingAccount(
  userId: ObjectId,
  google: VerifiedGoogleIdentity,
  authenticatedAt: Date,
): Promise<GoogleAuthenticationResult> {
  const client = await getMongoClient();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(
      async () => {
        const user = await findPendingUserById(
          userId,
          session,
        );

        if (!user) {
          throw new AuthGoogleAuthenticationError(
            "account-unavailable",
          );
        }

        const existingGoogleIdentity =
          await findAuthIdentityByUserAndProvider(
            user._id,
            "google",
            session,
          );

        if (!existingGoogleIdentity) {
          await createAuthIdentity(
            {
              identityId: new ObjectId(),
              userId: user._id,
              provider: "google",
              providerSubject: google.subject,
              providerEmailNormalized: google.emailNormalized,
              providerEmailDisplay: google.emailDisplay,
              createdAt: authenticatedAt,
            },
            session,
          );
        } else if (
          existingGoogleIdentity.providerSubject !==
          google.subject
        ) {
          throw new AuthGoogleAuthenticationError(
            "account-unavailable",
          );
        } else {
          await syncVerifiedGoogleIdentityEmail(
            existingGoogleIdentity,
            google,
            authenticatedAt,
            session,
          );
        }

        const challenge =
          await findLatestEmailVerificationChallengeForUser(
            user._id,
            session,
          );

        if (!challenge) {
          throw new AuthPersistenceError(
            "The pending FilmGeezer account is missing its email-verification challenge.",
          );
        }

        await createAuthAuditEvent(
          {
            auditEventId: new ObjectId(),
            userId: user._id,
            eventType: "login-failed",
            outcome: "failure",
            details: {
              provider: "google",
              reason:
                "email-verification-required",
              googleIdentityLinked: true,
            },
            createdAt: authenticatedAt,
          },
          session,
        );

        return {
          outcome:
            "verification-required" as const,
          email: user.emailDisplay,
          verification:
            createVerificationReceipt(
              challenge,
            ),
        };
      },
      GOOGLE_AUTH_TRANSACTION_OPTIONS,
    );

    if (!result) {
      throw new AuthPersistenceError(
        "Google account linking completed without returning the pending verification state.",
      );
    }

    return result;
  } finally {
    await session.endSession();
  }
}

async function activatePendingAccountWithGoogle(
  userId: ObjectId,
  google: VerifiedGoogleIdentity,
  requestMetadata: AuthRequestMetadata,
  authenticatedAt: Date,
): Promise<GoogleAuthenticationResult> {
  const preparedSession = prepareAuthSession(
    requestMetadata,
    authenticatedAt,
  );
  const client = await getMongoClient();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const user = await findPendingUserById(userId, session);

      if (!user) {
        throw new AuthGoogleAuthenticationError("account-unavailable");
      }

      const existingGoogleIdentity =
        await findAuthIdentityByUserAndProvider(
          user._id,
          "google",
          session,
        );

      if (!existingGoogleIdentity) {
        await createAuthIdentity(
          {
            identityId: new ObjectId(),
            userId: user._id,
            provider: "google",
            providerSubject: google.subject,
            providerEmailNormalized: google.emailNormalized,
            providerEmailDisplay: google.emailDisplay,
            createdAt: authenticatedAt,
          },
          session,
        );
      } else if (existingGoogleIdentity.providerSubject !== google.subject) {
        throw new AuthGoogleAuthenticationError("account-unavailable");
      } else {
        await syncVerifiedGoogleIdentityEmail(
          existingGoogleIdentity,
          google,
          authenticatedAt,
          session,
        );
      }

      /*
       * An unverified local registration cannot prove who chose its
       * password. If the verified Google identity is authoritative for the
       * email address, Google is allowed to claim that pending account, but
       * the unverified local sign-in material must not survive activation.
       * The user can add a fresh FilmGeezer password later from Security.
       */
      const removedLocalCredentials =
        await deleteAuthCredentialByUserId(
          user._id,
          session,
        );

      const removedLocalIdentities =
        await deleteAuthIdentityByUserAndProvider(
          user._id,
          "local",
          session,
        );

      const challengesInvalidated =
        await invalidateAllActiveChallengesForUser(
          {
            userId: user._id,
            invalidatedAt: authenticatedAt,
          },
          session,
        );

      const activated = await activatePendingUser(
        {
          userId: user._id,
          verifiedAt: authenticatedAt,
        },
        session,
      );

      if (!activated) {
        throw new AuthGoogleAuthenticationError("account-unavailable");
      }

      const sessionsRevokedForLimit =
        await createPreparedAuthSession(
          user._id,
          "google",
          preparedSession,
          session,
        );

      await createAuthAuditEvent(
        {
          auditEventId: new ObjectId(),
          userId: user._id,
          eventType: "registration-completed",
          outcome: "success",
          ipHash: preparedSession.ipHash,
          userAgentSummary: preparedSession.userAgentSummary,
          details: {
            provider: "google",
            finalStatus: "active",
            linkedExistingPendingAccount: true,
            discardedUnverifiedLocalCredential:
              removedLocalCredentials > 0,
            discardedUnverifiedLocalIdentity:
              removedLocalIdentities > 0,
            challengesInvalidated,
            sessionCreated: true,
          },
          createdAt: authenticatedAt,
        },
        session,
      );

      await createAuthAuditEvent(
        {
          auditEventId: new ObjectId(),
          userId: user._id,
          eventType: "login-succeeded",
          outcome: "success",
          ipHash: preparedSession.ipHash,
          userAgentSummary: preparedSession.userAgentSummary,
          details: {
            provider: "google",
            source: "google-email-ownership",
            sessionsRevokedForLimit,
          },
          createdAt: authenticatedAt,
        },
        session,
      );

      await createWelcomeNotification(
        {
          userId: user._id,
          createdAt: authenticatedAt,
        },
        session,
      );

      return {
        outcome: "authenticated" as const,
        createdAccount: false,
        linkedExistingAccount: true,
        ...createAuthSessionResult(
          user,
          "google",
          preparedSession,
        ),
      };
    }, GOOGLE_AUTH_TRANSACTION_OPTIONS);

    if (!result) {
      throw new AuthPersistenceError(
        "Google account activation completed without returning a session.",
      );
    }

    try {
      await authEmailService.sendWelcomeEmail({
        recipientEmail: result.user.email,
        displayName: result.user.displayName,
        idempotencyKey: `welcome/${result.user.userId}`,
        userId: result.user.userId,
      });
    } catch (error) {
      console.error("[auth-google] Welcome email delivery failed.", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }

    return result;
  } finally {
    await session.endSession();
  }
}

async function createActiveGoogleAccount(
  identity: VerifiedGoogleIdentity,
  requestMetadata: AuthRequestMetadata,
  authenticatedAt: Date,
): Promise<GoogleAuthenticationResult> {
  const preparedSession = prepareAuthSession(
    requestMetadata,
    authenticatedAt,
  );
  const userId = new ObjectId();
  const client = await getMongoClient();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const user = await createActiveUser(
        {
          userId,
          emailNormalized: identity.emailNormalized,
          emailDisplay: identity.emailDisplay,
          displayName: identity.displayName,
          verifiedAt: authenticatedAt,
        },
        session,
      );

      await createAuthIdentity(
        {
          identityId: new ObjectId(),
          userId: user._id,
          provider: "google",
          providerSubject: identity.subject,
          providerEmailNormalized: identity.emailNormalized,
          providerEmailDisplay: identity.emailDisplay,
          createdAt: authenticatedAt,
        },
        session,
      );

      const sessionsRevokedForLimit =
        await createPreparedAuthSession(
          user._id,
          "google",
          preparedSession,
          session,
        );

      await createAuthAuditEvent(
        {
          auditEventId: new ObjectId(),
          userId: user._id,
          eventType: "registration-started",
          outcome: "success",
          details: {
            provider: "google",
            initialStatus: "active",
            emailVerificationRequired: false,
          },
          createdAt: authenticatedAt,
        },
        session,
      );

      await createAuthAuditEvent(
        {
          auditEventId: new ObjectId(),
          userId: user._id,
          eventType: "registration-completed",
          outcome: "success",
          ipHash: preparedSession.ipHash,
          userAgentSummary: preparedSession.userAgentSummary,
          details: {
            provider: "google",
            finalStatus: "active",
            sessionCreated: true,
          },
          createdAt: authenticatedAt,
        },
        session,
      );

      await createAuthAuditEvent(
        {
          auditEventId: new ObjectId(),
          userId: user._id,
          eventType: "login-succeeded",
          outcome: "success",
          ipHash: preparedSession.ipHash,
          userAgentSummary: preparedSession.userAgentSummary,
          details: {
            provider: "google",
            createdAccount: true,
            sessionsRevokedForLimit,
          },
          createdAt: authenticatedAt,
        },
        session,
      );

      await createWelcomeNotification(
        { userId: user._id, createdAt: authenticatedAt },
        session,
      );

      return {
        outcome: "authenticated" as const,
        createdAccount: true,
        linkedExistingAccount: false,
        ...createAuthSessionResult(
          user,
          "google",
          preparedSession,
        ),
      };
    }, GOOGLE_AUTH_TRANSACTION_OPTIONS);

    if (!result) {
      throw new AuthPersistenceError(
        "Google registration completed without returning a session.",
      );
    }

    try {
      await authEmailService.sendWelcomeEmail({
        recipientEmail: result.user.email,
        displayName: result.user.displayName,
        idempotencyKey: `welcome/${result.user.userId}`,
        userId: result.user.userId,
      });
    } catch (error) {
      console.error("[auth-google] Welcome email delivery failed.", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    }

    return result;
  } finally {
    await session.endSession();
  }
}

async function createPendingGoogleAccount(
  identity: VerifiedGoogleIdentity,
  authenticatedAt: Date,
): Promise<GoogleAuthenticationResult> {
  const userId = new ObjectId();
  const challengeId = new ObjectId();
  const challenge = generateEmailVerificationChallenge(
    userId,
    authenticatedAt,
  );

  const client = await getMongoClient();
  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      const user = await createPendingUser(
        {
          userId,
          emailNormalized: identity.emailNormalized,
          emailDisplay: identity.emailDisplay,
          displayName: identity.displayName,
          createdAt: authenticatedAt,
        },
        session,
      );

      await createAuthIdentity(
        {
          identityId: new ObjectId(),
          userId: user._id,
          provider: "google",
          providerSubject: identity.subject,
          providerEmailNormalized: identity.emailNormalized,
          providerEmailDisplay: identity.emailDisplay,
          createdAt: authenticatedAt,
        },
        session,
      );

      await createEmailVerificationChallenge(
        {
          challengeId,
          publicId: challenge.publicId,
          userId: user._id,
          secretHash: challenge.secretHash,
          createdAt: challenge.createdAt,
          expiresAt: challenge.expiresAt,
          authenticationProvider: "google",
        },
        session,
      );

      await createAuthAuditEvent(
        {
          auditEventId: new ObjectId(),
          userId: user._id,
          eventType: "registration-started",
          outcome: "success",
          details: {
            provider: "google",
            initialStatus: "pending",
            emailVerificationRequired: true,
            reason: "third-party-google-email",
          },
          createdAt: authenticatedAt,
        },
        session,
      );
    }, GOOGLE_AUTH_TRANSACTION_OPTIONS);
  } finally {
    await session.endSession();
  }

  const deliveryAttemptedAt = new Date();
  const attemptRecorded = await recordEmailVerificationSendAttempt({
    publicId: challenge.publicId,
    userId,
    attemptedAt: deliveryAttemptedAt,
  });

  if (!attemptRecorded) {
    throw new AuthPersistenceError(
      "The Google registration verification delivery could not be recorded.",
    );
  }

  try {
    await authEmailService.sendEmailVerification({
      recipientEmail: identity.emailDisplay,
      displayName: identity.displayName,
      verificationCode: challenge.secret,
      expiresAt: challenge.expiresAt,
      idempotencyKey: `verify-email/${challenge.publicId}/1`,
      challengeId: challenge.publicId,
      userId: userId.toHexString(),
    });

    await recordGoogleVerificationDeliveryOutcome({
      userId,
      outcome: "success",
      createdAt: new Date(),
    });
  } catch (error) {
    await recordGoogleVerificationDeliveryOutcome({
      userId,
      outcome: "failure",
      createdAt: new Date(),
    });

    if (error instanceof AuthEmailConfigurationError) {
      throw error;
    }

    /*
     * The pending user, Google identity, and verification challenge have
     * already committed. A temporary delivery failure should not delete
     * that state; the existing resend flow can safely replace the code.
     */
    console.error("[auth-google] Verification email delivery failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }

  return {
    outcome: "verification-required",
    email: identity.emailDisplay,
    verification: {
      challengeId: challenge.publicId,
      expiresAt: challenge.expiresAt,
      resendAvailableAt: new Date(
        deliveryAttemptedAt.getTime() +
          AUTH_EMAIL_VERIFICATION_POLICY.resendCooldownMilliseconds,
      ),
    },
  };
}

async function linkGoogleIdentityToExistingActiveAccount(
  userId: ObjectId,
  google: VerifiedGoogleIdentity,
  requestMetadata: AuthRequestMetadata,
  authenticatedAt: Date,
): Promise<GoogleAuthenticationResult> {
  const preparedSession = prepareAuthSession(
    requestMetadata,
    authenticatedAt,
  );
  const client = await getMongoClient();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      const user = await findActiveUserById(userId, session);

      if (!user) {
        throw new AuthGoogleAuthenticationError("account-unavailable");
      }

      const alreadyLinked = await findAuthIdentityByUserAndProvider(
        user._id,
        "google",
        session,
      );

      if (alreadyLinked) {
        if (alreadyLinked.providerSubject !== google.subject) {
          throw new AuthGoogleAuthenticationError("account-unavailable");
        }

        await syncVerifiedGoogleIdentityEmail(
          alreadyLinked,
          google,
          authenticatedAt,
          session,
        );
      } else {
        await createAuthIdentity(
          {
            identityId: new ObjectId(),
            userId: user._id,
            provider: "google",
            providerSubject: google.subject,
            providerEmailNormalized: google.emailNormalized,
            providerEmailDisplay: google.emailDisplay,
            createdAt: authenticatedAt,
          },
          session,
        );
      }

      const updated = await recordSuccessfulLogin(
        { userId: user._id, loggedInAt: authenticatedAt },
        session,
      );

      if (!updated) {
        throw new AuthGoogleAuthenticationError("account-unavailable");
      }

      const sessionsRevokedForLimit =
        await createPreparedAuthSession(
          user._id,
          "google",
          preparedSession,
          session,
        );

      await createAuthAuditEvent(
        {
          auditEventId: new ObjectId(),
          userId: user._id,
          eventType: "login-succeeded",
          outcome: "success",
          ipHash: preparedSession.ipHash,
          userAgentSummary: preparedSession.userAgentSummary,
          details: {
            provider: "google",
            linkedExistingAccount: true,
            sessionsRevokedForLimit,
          },
          createdAt: authenticatedAt,
        },
        session,
      );

      return {
        outcome: "authenticated" as const,
        createdAccount: false,
        linkedExistingAccount: true,
        ...createAuthSessionResult(
          user,
          "google",
          preparedSession,
        ),
      };
    }, GOOGLE_AUTH_TRANSACTION_OPTIONS);

    if (!result) {
      throw new AuthPersistenceError(
        "Google account linking completed without returning a session.",
      );
    }

    try {
      await sendGoogleSignInConnectedNoticeEmail({
        recipientEmail: result.user.email,
        displayName: result.user.displayName,
        connectedAt: authenticatedAt,
        idempotencyKey:
          `google-signin-connected/${result.user.userId}`,
        userId: result.user.userId,
      });
    } catch (error) {
      /*
       * The identity link and FilmGeezer session have already committed.
       * A mail-provider outage must not undo successful authentication.
       */
      console.error(
        "[auth-google] Google-link security email could not be submitted.",
        {
          name:
            error instanceof Error
              ? error.name
              : "UnknownError",
        },
      );
    }

    return result;
  } finally {
    await session.endSession();
  }
}

export async function authenticateWithGoogle(
  input: GoogleAuthenticationInput,
  requestMetadata: AuthRequestMetadata,
): Promise<GoogleAuthenticationResult> {
  const parsed = parseGoogleAuthenticationInput(input);

  await Promise.all([
    initializeAuthStorage(),
    initializeNotificationStorage(),
  ]);

  const google = await verifyGoogleCredential(parsed.credential);
  const authenticatedAt = new Date();

  const existingIdentity =
    await findAuthIdentityByProviderAndSubject(
      "google",
      google.subject,
    );

  if (existingIdentity) {
    await syncVerifiedGoogleIdentityEmail(
      existingIdentity,
      google,
      authenticatedAt,
    );

    const user = await findUserById(existingIdentity.userId);

    if (
      user?.status === "pending" &&
      user.emailVerifiedAt === null &&
      user.suspendedAt === null &&
      user.deactivatedAt === null &&
      user.deletedAt === null
    ) {
      const latestChallenge =
        await findLatestEmailVerificationChallengeForUser(user._id);

      if (!latestChallenge) {
        throw new AuthPersistenceError(
          "The pending Google account is missing its verification challenge.",
        );
      }

      return {
        outcome: "verification-required",
        email: user.emailDisplay,
        verification: createVerificationReceipt(latestChallenge),
      };
    }

    if (!user || user.status !== "active" || !user.emailVerifiedAt) {
      throw new AuthGoogleAuthenticationError("account-unavailable");
    }

    return createGoogleSessionForActiveUser(
      user._id,
      requestMetadata,
      authenticatedAt,
      {
        createdAccount: false,
        linkedExistingAccount: false,
      },
    );
  }

  const emailMatchedUser =
    await findUserByNormalizedEmail(google.emailNormalized);

  if (emailMatchedUser) {
    if (
      emailMatchedUser.status === "pending" &&
      emailMatchedUser.emailVerifiedAt === null &&
      emailMatchedUser.suspendedAt === null &&
      emailMatchedUser.deactivatedAt === null &&
      emailMatchedUser.deletedAt === null
    ) {
      if (!google.authoritativeEmail) {
        const credential = await findAuthCredentialByUserId(
          emailMatchedUser._id,
        );

        if (!credential) {
          throw new AuthGoogleAuthenticationError("account-unavailable");
        }

        if (!parsed.password) {
          throw new AuthGoogleLinkConfirmationRequiredError(false);
        }

        const valid = await verifyPassword(
          credential.passwordHash,
          parsed.password,
        );

        if (!valid) {
          await recordGoogleAuthenticationFailure({
            userId: emailMatchedUser._id,
            reason: "link-confirmation-invalid-password",
            requestMetadata,
            createdAt: authenticatedAt,
          });

          throw new AuthGoogleLinkConfirmationRequiredError(true);
        }
      }

      try {
        return google.authoritativeEmail
          ? await activatePendingAccountWithGoogle(
              emailMatchedUser._id,
              google,
              requestMetadata,
              authenticatedAt,
            )
          : await linkGoogleIdentityToPendingAccount(
              emailMatchedUser._id,
              google,
              authenticatedAt,
            );
      } catch (error) {
        if (isMongoDuplicateKeyError(error)) {
          const winner =
            await findAuthIdentityByProviderAndSubject(
              "google",
              google.subject,
            );

          if (winner) {
            const winnerUser =
              await findUserById(winner.userId);

            if (
              winnerUser?.status === "pending" &&
              winnerUser.emailVerifiedAt === null &&
              winnerUser.suspendedAt === null &&
              winnerUser.deactivatedAt === null &&
              winnerUser.deletedAt === null
            ) {
              const challenge =
                await findLatestEmailVerificationChallengeForUser(
                  winnerUser._id,
                );

              if (challenge) {
                return {
                  outcome: "verification-required",
                  email: winnerUser.emailDisplay,
                  verification:
                    createVerificationReceipt(challenge),
                };
              }
            }

            if (
              winnerUser?.status === "active" &&
              winnerUser.emailVerifiedAt !== null &&
              winnerUser.suspendedAt === null &&
              winnerUser.deactivatedAt === null &&
              winnerUser.deletedAt === null
            ) {
              return createGoogleSessionForActiveUser(
                winnerUser._id,
                requestMetadata,
                authenticatedAt,
                {
                  createdAccount: false,
                  linkedExistingAccount: true,
                },
              );
            }
          }

          throw new AuthPersistenceError(
            "Google account linking conflicted with another authentication request. Please try again.",
            { cause: error },
          );
        }

        throw error;
      }
    }

    if (
      emailMatchedUser.status !== "active" ||
      emailMatchedUser.emailVerifiedAt === null ||
      emailMatchedUser.suspendedAt !== null ||
      emailMatchedUser.deactivatedAt !== null ||
      emailMatchedUser.deletedAt !== null
    ) {
      throw new AuthGoogleAuthenticationError("account-unavailable");
    }

    if (!google.authoritativeEmail) {
      const credential = await findAuthCredentialByUserId(
        emailMatchedUser._id,
      );

      if (!credential) {
        throw new AuthGoogleAuthenticationError("account-unavailable");
      }

      if (!parsed.password) {
        throw new AuthGoogleLinkConfirmationRequiredError(false);
      }

      const valid = await verifyPassword(
        credential.passwordHash,
        parsed.password,
      );

      if (!valid) {
        await recordGoogleAuthenticationFailure({
          userId: emailMatchedUser._id,
          reason: "link-confirmation-invalid-password",
          requestMetadata,
          createdAt: authenticatedAt,
        });

        throw new AuthGoogleLinkConfirmationRequiredError(true);
      }
    }

    try {
      return await linkGoogleIdentityToExistingActiveAccount(
        emailMatchedUser._id,
        google,
        requestMetadata,
        authenticatedAt,
      );
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) {
        const winner = await findAuthIdentityByProviderAndSubject(
          "google",
          google.subject,
        );

        if (winner) {
          return createGoogleSessionForActiveUser(
            winner.userId,
            requestMetadata,
            authenticatedAt,
            {
              createdAccount: false,
              linkedExistingAccount: true,
            },
          );
        }

        throw new AuthPersistenceError(
          "Google account linking conflicted with another authentication request. Please try again.",
          { cause: error },
        );
      }

      throw error;
    }
  }

  try {
    return google.authoritativeEmail
      ? await createActiveGoogleAccount(
          google,
          requestMetadata,
          authenticatedAt,
        )
      : await createPendingGoogleAccount(
          google,
          authenticatedAt,
        );
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      const winner = await findAuthIdentityByProviderAndSubject(
        "google",
        google.subject,
      );

      if (winner) {
        const winnerUser =
          await findUserById(winner.userId);

        if (
          winnerUser?.status === "pending" &&
          winnerUser.emailVerifiedAt === null &&
          winnerUser.suspendedAt === null &&
          winnerUser.deactivatedAt === null &&
          winnerUser.deletedAt === null
        ) {
          const challenge =
            await findLatestEmailVerificationChallengeForUser(
              winnerUser._id,
            );

          if (challenge) {
            return {
              outcome: "verification-required",
              email: winnerUser.emailDisplay,
              verification:
                createVerificationReceipt(challenge),
            };
          }
        }

        if (
          winnerUser?.status === "active" &&
          winnerUser.emailVerifiedAt !== null &&
          winnerUser.suspendedAt === null &&
          winnerUser.deactivatedAt === null &&
          winnerUser.deletedAt === null
        ) {
          return createGoogleSessionForActiveUser(
            winnerUser._id,
            requestMetadata,
            authenticatedAt,
            {
              createdAccount: false,
              linkedExistingAccount: false,
            },
          );
        }
      }

      throw new AuthPersistenceError(
        "Google registration conflicted with another account request. Please try again.",
        { cause: error },
      );
    }

    throw error;
  }
}

export async function verifyGoogleCredentialForUser(
  credential: string,
  expectedUserId: ObjectId,
): Promise<void> {
  const google = await verifyGoogleCredential(credential);

  const identity = await findAuthIdentityByProviderAndSubject(
    "google",
    google.subject,
  );

  if (!identity || !identity.userId.equals(expectedUserId)) {
    throw new AuthGoogleAuthenticationError("account-unavailable");
  }

  await syncVerifiedGoogleIdentityEmail(
    identity,
    google,
    new Date(),
  );
}
