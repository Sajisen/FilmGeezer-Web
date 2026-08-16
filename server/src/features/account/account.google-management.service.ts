import {
  ObjectId,
  type ClientSession,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  sendGoogleSignInChangedNoticeEmail,
  sendGoogleSignInConnectedNoticeEmail,
  sendGoogleSignInDisconnectedNoticeEmail,
} from "../auth/auth.email.js";

import {
  AuthPersistenceError,
  isMongoDuplicateKeyError,
} from "../auth/auth.errors.js";

import {
  verifyGoogleCredentialForConnection,
} from "../auth/auth.google.service.js";

import {
  type AuthRequestMetadata,
  hashAuthIpAddress,
  summarizeAuthUserAgent,
} from "../auth/auth.session.js";

import type {
  AuthenticatedSessionContext,
} from "../auth/auth.session.service.js";

import {
  parseGoogleRecentAuthenticationInput,
} from "../auth/auth.validation.js";

import {
  createAuthAuditEvent,
} from "../auth/repositories/authAudit.repository.js";

import {
  findAuthCredentialByUserId,
} from "../auth/repositories/authCredential.repository.js";

import {
  createAuthIdentity,
  deleteAuthIdentityByUserAndProvider,
  findAuthIdentityByProviderAndSubject,
  findAuthIdentityByUserAndProvider,
  replaceGoogleIdentityForUser,
  updateAuthIdentityProviderEmail,
} from "../auth/repositories/authIdentity.repository.js";

import {
  revokeActiveAuthSessionsByProvider,
} from "../auth/repositories/authSession.repository.js";

import {
  findActiveUserById,
} from "../auth/repositories/authUser.repository.js";

const GOOGLE_MANAGEMENT_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 5_000,
};

export type AccountGoogleManagementRejectionReason =
  | "password-required"
  | "google-not-connected"
  | "google-account-in-use"
  | "email-mismatch";

export class AccountGoogleManagementError extends Error {
  readonly code = "ACCOUNT_GOOGLE_MANAGEMENT_REJECTED";

  constructor(
    readonly reason: AccountGoogleManagementRejectionReason,
  ) {
    super("The Google sign-in method could not be changed.");
    this.name = "AccountGoogleManagementError";
  }
}

function auditMetadata(
  requestMetadata: AuthRequestMetadata,
) {
  return {
    ipHash: hashAuthIpAddress(requestMetadata.ipAddress),
    userAgentSummary: summarizeAuthUserAgent(
      requestMetadata.userAgent,
    ),
  };
}

async function requireLocalPasswordMethod(
  userId: ObjectId,
  session: ClientSession,
): Promise<void> {
  const identity = await findAuthIdentityByUserAndProvider(
    userId,
    "local",
    session,
  );
  const credential = await findAuthCredentialByUserId(
    userId,
    session,
  );

  if (!identity || !credential) {
    throw new AccountGoogleManagementError(
      "password-required",
    );
  }
}

export interface AccountGoogleConnectionResult {
  googleEmail: string;
  changed: boolean;
  sessionsRevoked: number;
  changeKind: "connected" | "replaced" | "unchanged";
}

export async function replaceAccountGoogleConnection(
  input: unknown,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
): Promise<AccountGoogleConnectionResult> {
  const parsed = parseGoogleRecentAuthenticationInput(input);
  const google = await verifyGoogleCredentialForConnection(
    parsed.credential,
  );
  const changedAt = new Date();
  const client = await getMongoClient();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      await requireLocalPasswordMethod(auth.userId, session);

      const user = await findActiveUserById(auth.userId, session);

      if (!user) {
        throw new AuthPersistenceError(
          "The FilmGeezer account could not be loaded while changing Google sign-in.",
        );
      }

      if (google.emailNormalized !== user.emailNormalized) {
        throw new AccountGoogleManagementError("email-mismatch");
      }

      const currentGoogle =
        await findAuthIdentityByUserAndProvider(
          auth.userId,
          "google",
          session,
        );
      const ownerOfNewGoogle =
        await findAuthIdentityByProviderAndSubject(
          "google",
          google.subject,
          session,
        );

      if (
        ownerOfNewGoogle &&
        !ownerOfNewGoogle.userId.equals(auth.userId)
      ) {
        throw new AccountGoogleManagementError(
          "google-account-in-use",
        );
      }

      if (
        currentGoogle &&
        currentGoogle.providerSubject === google.subject
      ) {
        await updateAuthIdentityProviderEmail(
          {
            identityId: currentGoogle._id,
            providerEmailNormalized:
              google.emailNormalized,
            providerEmailDisplay: google.emailDisplay,
            updatedAt: changedAt,
          },
          session,
        );

        return {
          googleEmail: google.emailDisplay,
          changed: false,
          sessionsRevoked: 0,
          changeKind: "unchanged",
        } satisfies AccountGoogleConnectionResult;
      }

      let eventType:
        | "google-identity-connected"
        | "google-identity-replaced";
      let changeKind: "connected" | "replaced";
      let sessionsRevoked = 0;

      if (currentGoogle) {
        const replaced = await replaceGoogleIdentityForUser(
          {
            identityId: currentGoogle._id,
            userId: auth.userId,
            expectedProviderSubject:
              currentGoogle.providerSubject,
            providerSubject: google.subject,
            providerEmailNormalized:
              google.emailNormalized,
            providerEmailDisplay: google.emailDisplay,
            updatedAt: changedAt,
          },
          session,
        );

        if (!replaced) {
          throw new AuthPersistenceError(
            "The connected Google identity changed before it could be replaced.",
          );
        }

        sessionsRevoked =
          await revokeActiveAuthSessionsByProvider(
            {
              userId: auth.userId,
              provider: "google",
              revokedAt: changedAt,
            },
            session,
          );
        eventType = "google-identity-replaced";
        changeKind = "replaced";
      } else {
        await createAuthIdentity(
          {
            identityId: new ObjectId(),
            userId: auth.userId,
            provider: "google",
            providerSubject: google.subject,
            providerEmailNormalized:
              google.emailNormalized,
            providerEmailDisplay: google.emailDisplay,
            createdAt: changedAt,
          },
          session,
        );
        eventType = "google-identity-connected";
        changeKind = "connected";
      }

      await createAuthAuditEvent(
        {
          auditEventId: new ObjectId(),
          userId: auth.userId,
          eventType,
          outcome: "success",
          ...auditMetadata(requestMetadata),
          details: {
            provider: "google",
            sessionsRevoked,
          },
          createdAt: changedAt,
        },
        session,
      );

      return {
        googleEmail: google.emailDisplay,
        changed: true,
        sessionsRevoked,
        changeKind,
      } satisfies AccountGoogleConnectionResult;
    }, GOOGLE_MANAGEMENT_TRANSACTION_OPTIONS);

    if (!result) {
      throw new AuthPersistenceError(
        "The Google sign-in method could not be changed.",
      );
    }

    if (result.changed) {
      try {
        const emailInput = {
          recipientEmail: auth.email,
          displayName: auth.displayName,
          idempotencyKey:
            `google-signin-${result.changeKind}/${auth.userId.toHexString()}/${changedAt.toISOString()}`,
          userId: auth.userId.toHexString(),
        };

        if (result.changeKind === "connected") {
          await sendGoogleSignInConnectedNoticeEmail({
            ...emailInput,
            connectedAt: changedAt,
          });
        } else {
          await sendGoogleSignInChangedNoticeEmail({
            ...emailInput,
            googleEmail: result.googleEmail,
            changedAt,
          });
        }
      } catch (error) {
        console.error(
          "[account-google-management] Security notice could not be submitted.",
          { name: error instanceof Error ? error.name : "UnknownError" },
        );
      }
    }

    return result;
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      throw new AccountGoogleManagementError(
        "google-account-in-use",
      );
    }

    if (
      error instanceof AccountGoogleManagementError ||
      error instanceof AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The Google sign-in method could not be changed.",
      { cause: error },
    );
  } finally {
    await session.endSession();
  }
}

export interface AccountGoogleDisconnectResult {
  disconnectedAt: Date;
  sessionsRevoked: number;
}

export async function disconnectAccountGoogleConnection(
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
): Promise<AccountGoogleDisconnectResult> {
  const disconnectedAt = new Date();
  const client = await getMongoClient();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(async () => {
      await requireLocalPasswordMethod(auth.userId, session);

      const googleIdentity =
        await findAuthIdentityByUserAndProvider(
          auth.userId,
          "google",
          session,
        );

      if (!googleIdentity) {
        throw new AccountGoogleManagementError(
          "google-not-connected",
        );
      }

      const deleted =
        await deleteAuthIdentityByUserAndProvider(
          auth.userId,
          "google",
          session,
        );

      if (deleted !== 1) {
        throw new AuthPersistenceError(
          "The connected Google identity could not be removed.",
        );
      }

      const sessionsRevoked =
        await revokeActiveAuthSessionsByProvider(
          {
            userId: auth.userId,
            provider: "google",
            revokedAt: disconnectedAt,
          },
          session,
        );

      await createAuthAuditEvent(
        {
          auditEventId: new ObjectId(),
          userId: auth.userId,
          eventType: "google-identity-disconnected",
          outcome: "success",
          ...auditMetadata(requestMetadata),
          details: {
            provider: "google",
            sessionsRevoked,
          },
          createdAt: disconnectedAt,
        },
        session,
      );

      return {
        disconnectedAt,
        sessionsRevoked,
      } satisfies AccountGoogleDisconnectResult;
    }, GOOGLE_MANAGEMENT_TRANSACTION_OPTIONS);

    if (!result) {
      throw new AuthPersistenceError(
        "The Google sign-in method could not be disconnected.",
      );
    }

    try {
      await sendGoogleSignInDisconnectedNoticeEmail({
        recipientEmail: auth.email,
        displayName: auth.displayName,
        disconnectedAt,
        idempotencyKey:
          `google-signin-disconnected/${auth.userId.toHexString()}/${disconnectedAt.toISOString()}`,
        userId: auth.userId.toHexString(),
      });
    } catch (error) {
      console.error(
        "[account-google-management] Disconnect security notice could not be submitted.",
        { name: error instanceof Error ? error.name : "UnknownError" },
      );
    }

    return result;
  } catch (error) {
    if (
      error instanceof AccountGoogleManagementError ||
      error instanceof AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The Google sign-in method could not be disconnected.",
      { cause: error },
    );
  } finally {
    await session.endSession();
  }
}
