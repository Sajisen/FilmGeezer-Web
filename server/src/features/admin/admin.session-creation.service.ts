import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import { getMongoClient } from "../../config/database.js";
import type {
  AuthCredentialDocument,
  FilmGeezerUserDocument,
} from "../auth/auth.types.js";
import {
  hashPassword,
  passwordHashNeedsRehash,
} from "../auth/auth.password.js";
import { replaceCredentialPasswordHash } from "../auth/repositories/authCredential.repository.js";
import { recordSuccessfulLogin } from "../auth/repositories/authUser.repository.js";
import { createProfileImagePath } from "../profile-image/profileImage.path.js";
import { ADMIN_SESSION_POLICY } from "./admin.constants.js";
import {
  AdminInvalidCredentialsError,
  AdminPersistenceError,
} from "./admin.errors.js";
import {
  createAdminAuditEvent,
  createAdminSession,
  makeRoomForAdminSession,
} from "./admin.repository.js";
import { createAdminSessionSecrets } from "./admin.session.js";
import type { AdminSessionAccessLevel } from "./admin.types.js";

const ADMIN_LOGIN_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 5_000,
};

export interface IssuedAdminSessionResult {
  user: {
    userId: string;
    email: string;
    displayName: string;
    profileImagePath: string | null;
    roles: Array<"user" | "admin">;
  };
  session: {
    token: string;
    csrfToken: string;
    accessLevel: AdminSessionAccessLevel;
    createdAt: Date;
    lastSeenAt: Date;
    recentAuthenticationAt: Date;
    mfaVerifiedAt: Date | null;
    idleExpiresAt: Date;
    expiresAt: Date;
  };
}

export async function issueAdminSession(input: {
  user: FilmGeezerUserDocument;
  credential?: AuthCredentialDocument | null;
  passwordForRehash?: string | null;
  accessLevel: AdminSessionAccessLevel;
  mfaVerifiedAt: Date | null;
  authenticatedAt: Date;
  ipHash: string | null;
  userAgentSummary: string | null;
  authenticationMethod: "password" | "password-and-totp" | "password-and-recovery";
}): Promise<IssuedAdminSessionResult> {
  const secrets = createAdminSessionSecrets();
  const sessionId = new ObjectId();
  const expiresAt = new Date(
    input.authenticatedAt.getTime() +
      ADMIN_SESSION_POLICY.absoluteLifetimeMilliseconds,
  );
  const idleExpiresAt = new Date(
    input.authenticatedAt.getTime() +
      ADMIN_SESSION_POLICY.idleTimeoutMilliseconds,
  );

  let replacementPasswordHash: string | null = null;

  if (
    input.credential &&
    input.passwordForRehash &&
    passwordHashNeedsRehash(input.credential.passwordHash)
  ) {
    replacementPasswordHash = await hashPassword(input.passwordForRehash);
  }

  const client = await getMongoClient();
  const mongoSession = client.startSession();

  try {
    const result = await mongoSession.withTransaction(async () => {
      const userWasUpdated = await recordSuccessfulLogin(
        {
          userId: input.user._id,
          loggedInAt: input.authenticatedAt,
        },
        mongoSession,
      );

      if (!userWasUpdated) {
        throw new AdminInvalidCredentialsError();
      }

      const sessionsRevokedForLimit = await makeRoomForAdminSession(
        input.user._id,
        input.authenticatedAt,
        mongoSession,
      );

      await createAdminSession(
        {
          sessionId,
          userId: input.user._id,
          tokenHash: secrets.tokenHash,
          csrfSecretHash: secrets.csrfSecretHash,
          userAgentSummary: input.userAgentSummary,
          ipHash: input.ipHash,
          accessLevel: input.accessLevel,
          recentAuthenticationAt: input.authenticatedAt,
          mfaVerifiedAt: input.mfaVerifiedAt,
          createdAt: input.authenticatedAt,
          expiresAt,
        },
        mongoSession,
      );

      if (replacementPasswordHash && input.credential) {
        const replaced = await replaceCredentialPasswordHash(
          {
            credentialId: input.credential._id,
            userId: input.user._id,
            passwordHash: replacementPasswordHash,
            updatedAt: input.authenticatedAt,
          },
          mongoSession,
        );

        if (!replaced) {
          throw new AdminPersistenceError(
            "The administrator credential hash could not be upgraded.",
          );
        }
      }

      await createAdminAuditEvent(
        {
          auditEventId: new ObjectId(),
          actorUserId: input.user._id,
          targetUserId: input.user._id,
          eventType: "admin-login-succeeded",
          outcome: "success",
          ipHash: input.ipHash,
          userAgentSummary: input.userAgentSummary,
          details: {
            accessLevel: input.accessLevel,
            authenticationMethod: input.authenticationMethod,
            sessionsRevokedForLimit,
            passwordHashReplaced: replacementPasswordHash !== null,
          },
          createdAt: input.authenticatedAt,
        },
        mongoSession,
      );

      return true;
    }, ADMIN_LOGIN_TRANSACTION_OPTIONS);

    if (!result) {
      throw new AdminPersistenceError(
        "Administrator login completed without a session.",
      );
    }
  } catch (error) {
    if (
      error instanceof AdminPersistenceError ||
      error instanceof AdminInvalidCredentialsError
    ) {
      throw error;
    }

    throw new AdminPersistenceError(
      "The administrator session could not be created.",
      { cause: error },
    );
  } finally {
    await mongoSession.endSession();
  }

  return {
    user: {
      userId: input.user._id.toHexString(),
      email: input.user.emailDisplay,
      displayName: input.user.displayName,
      profileImagePath: createProfileImagePath(input.user),
      roles: [...input.user.roles],
    },
    session: {
      token: secrets.sessionToken,
      csrfToken: secrets.csrfToken,
      accessLevel: input.accessLevel,
      createdAt: input.authenticatedAt,
      lastSeenAt: input.authenticatedAt,
      recentAuthenticationAt: input.authenticatedAt,
      mfaVerifiedAt: input.mfaVerifiedAt,
      idleExpiresAt,
      expiresAt,
    },
  };
}
