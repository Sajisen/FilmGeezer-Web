import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  AUTH_RECENT_AUTHENTICATION_POLICY,
} from "../auth/auth.constants.js";

import {
  AuthGoogleAuthenticationError,
  AuthPersistenceError,
} from "../auth/auth.errors.js";

import {
  verifyGoogleCredentialForUser,
} from "../auth/auth.google.service.js";

import {
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  type AuthRequestMetadata,
} from "../auth/auth.session.js";

import type {
  AuthenticatedSessionContext,
} from "../auth/auth.session.service.js";

import {
  parseGoogleRecentAuthenticationInput,
  type GoogleRecentAuthenticationInput,
} from "../auth/auth.validation.js";

import {
  createAuthAuditEvent,
} from "../auth/repositories/authAudit.repository.js";

import {
  recordRecentAuthentication,
} from "../auth/repositories/authSession.repository.js";

const GOOGLE_RECENT_AUTH_TRANSACTION_OPTIONS:
  TransactionOptions = {
    readPreference: "primary",
    readConcern: {
      level: "snapshot",
    },
    writeConcern: {
      w: "majority",
    },
    maxCommitTimeMS: 5_000,
  };

export interface GoogleRecentAuthenticationResult {
  confirmedAt: Date;
  expiresAt: Date;
}

export async function confirmAccountWithGoogle(
  input: GoogleRecentAuthenticationInput,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
): Promise<GoogleRecentAuthenticationResult> {
  const parsedInput =
    parseGoogleRecentAuthenticationInput(input);

  const attemptedAt = new Date();
  const auditMetadata = {
    ipHash: hashAuthIpAddress(
      requestMetadata.ipAddress,
    ),
    userAgentSummary:
      summarizeAuthUserAgent(
        requestMetadata.userAgent,
      ),
  };

  try {
    await verifyGoogleCredentialForUser(
      parsedInput.credential,
      auth.userId,
    );
  } catch (error) {
    if (error instanceof AuthGoogleAuthenticationError) {
      try {
        await createAuthAuditEvent({
          auditEventId: new ObjectId(),
          userId: auth.userId,
          eventType: "reauthentication-failed",
          outcome: "failure",
          ...auditMetadata,
          details: {
            provider: "google",
          },
          createdAt: attemptedAt,
        });
      } catch (auditError) {
        console.error(
          "[account-google-reauthentication] Failure audit could not be recorded.",
          {
            name:
              auditError instanceof Error
                ? auditError.name
                : "UnknownError",
          },
        );
      }
    }

    throw error;
  }

  const confirmedAt = new Date();
  const client = await getMongoClient();
  const session = client.startSession();

  try {
    await session.withTransaction(
      async () => {
        const wasRecorded =
          await recordRecentAuthentication(
            {
              sessionId: auth.sessionId,
              userId: auth.userId,
              confirmedAt,
            },
            session,
          );

        if (!wasRecorded) {
          throw new AuthPersistenceError(
            "The recent authentication state could not be recorded.",
          );
        }

        await createAuthAuditEvent(
          {
            auditEventId: new ObjectId(),
            userId: auth.userId,
            eventType:
              "reauthentication-succeeded",
            outcome: "success",
            ...auditMetadata,
            details: {
              provider: "google",
            },
            createdAt: confirmedAt,
          },
          session,
        );
      },
      GOOGLE_RECENT_AUTH_TRANSACTION_OPTIONS,
    );
  } catch (error) {
    if (error instanceof AuthPersistenceError) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The recent Google authentication state could not be saved.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }

  return {
    confirmedAt,
    expiresAt: new Date(
      confirmedAt.getTime() +
        AUTH_RECENT_AUTHENTICATION_POLICY
          .validForMilliseconds,
    ),
  };
}
