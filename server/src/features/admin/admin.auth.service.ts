import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import { getMongoClient } from "../../config/database.js";
import {
  passwordHashNeedsRehash,
  hashPassword,
  verifyPassword,
} from "../auth/auth.password.js";
import {
  findAuthCredentialByUserId,
  replaceCredentialPasswordHash,
} from "../auth/repositories/authCredential.repository.js";
import {
  findUserByNormalizedEmail,
  recordSuccessfulLogin,
} from "../auth/repositories/authUser.repository.js";
import { createProfileImagePath } from "../profile-image/profileImage.path.js";
import { initializeAdminStorage } from "./admin.indexes.js";
import {
  AdminInvalidCredentialsError,
  AdminPersistenceError,
} from "./admin.errors.js";
import {
  createAdminSessionSecrets,
  hashAdminIpAddress,
  summarizeAdminUserAgent,
} from "./admin.session.js";
import {
  createAdminAuditEvent,
  createAdminSession,
  makeRoomForAdminSession,
} from "./admin.repository.js";
import { ADMIN_SESSION_POLICY } from "./admin.constants.js";
import {
  parseAdminLoginInput,
  type AdminLoginInput,
} from "./admin.validation.js";

const ADMIN_LOGIN_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 5_000,
};

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$7fff7cXpK6SzkykonWnjuw$2AOO6h2HthwHj1nH4H6zkts//9OsIVzCyQ94lwre9ic";

export interface AdminRequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AdminLoginResult {
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
    createdAt: Date;
    lastSeenAt: Date;
    idleExpiresAt: Date;
    expiresAt: Date;
  };
}

async function recordAdminLoginFailure(input: {
  userId: ObjectId | null;
  reason: string;
  ipHash: string | null;
  userAgentSummary: string | null;
  createdAt: Date;
}): Promise<void> {
  try {
    await createAdminAuditEvent({
      auditEventId: new ObjectId(),
      actorUserId: input.userId,
      targetUserId: input.userId,
      eventType: "admin-login-failed",
      outcome: "failure",
      ipHash: input.ipHash,
      userAgentSummary: input.userAgentSummary,
      details: { reason: input.reason },
      createdAt: input.createdAt,
    });
  } catch (error) {
    console.error("[admin-auth] Failed-login audit could not be recorded.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

export async function loginAdministrator(
  input: AdminLoginInput,
  requestMetadata: AdminRequestMetadata,
): Promise<AdminLoginResult> {
  const login = parseAdminLoginInput(input);
  await initializeAdminStorage();

  const attemptedAt = new Date();
  const ipHash = hashAdminIpAddress(requestMetadata.ipAddress);
  const userAgentSummary = summarizeAdminUserAgent(
    requestMetadata.userAgent,
  );

  const user = await findUserByNormalizedEmail(login.emailNormalized);
  const credential = user
    ? await findAuthCredentialByUserId(user._id)
    : null;

  let passwordIsValid: boolean;

  try {
    passwordIsValid = await verifyPassword(
      credential?.passwordHash ?? DUMMY_PASSWORD_HASH,
      login.password,
    );
  } catch (error) {
    throw new AdminPersistenceError(
      "The administrator credential could not be verified.",
      { cause: error },
    );
  }

  const accountIsEligible =
    user !== null &&
    credential !== null &&
    passwordIsValid &&
    user.status === "active" &&
    user.emailVerifiedAt !== null &&
    user.suspendedAt === null &&
    user.deactivatedAt === null &&
    user.deletedAt === null &&
    user.roles.includes("admin");

  if (!accountIsEligible || !user || !credential) {
    await recordAdminLoginFailure({
      userId: user?._id ?? null,
      reason:
        user && passwordIsValid && !user.roles.includes("admin")
          ? "administrator-role-required"
          : "invalid-credentials-or-account-state",
      ipHash,
      userAgentSummary,
      createdAt: attemptedAt,
    });

    throw new AdminInvalidCredentialsError();
  }

  const secrets = createAdminSessionSecrets();
  const sessionId = new ObjectId();
  const expiresAt = new Date(
    attemptedAt.getTime() +
      ADMIN_SESSION_POLICY.absoluteLifetimeMilliseconds,
  );
  const idleExpiresAt = new Date(
    attemptedAt.getTime() +
      ADMIN_SESSION_POLICY.idleTimeoutMilliseconds,
  );

  let replacementPasswordHash: string | null = null;

  if (passwordHashNeedsRehash(credential.passwordHash)) {
    replacementPasswordHash = await hashPassword(login.password);
  }

  const client = await getMongoClient();
  const mongoSession = client.startSession();

  try {
    const result = await mongoSession.withTransaction(async () => {
      const userWasUpdated = await recordSuccessfulLogin(
        {
          userId: user._id,
          loggedInAt: attemptedAt,
        },
        mongoSession,
      );

      if (!userWasUpdated) {
        throw new AdminInvalidCredentialsError();
      }

      const sessionsRevokedForLimit = await makeRoomForAdminSession(
        user._id,
        attemptedAt,
        mongoSession,
      );

      await createAdminSession(
        {
          sessionId,
          userId: user._id,
          tokenHash: secrets.tokenHash,
          csrfSecretHash: secrets.csrfSecretHash,
          userAgentSummary,
          ipHash,
          createdAt: attemptedAt,
          expiresAt,
        },
        mongoSession,
      );

      if (replacementPasswordHash) {
        const replaced = await replaceCredentialPasswordHash(
          {
            credentialId: credential._id,
            userId: user._id,
            passwordHash: replacementPasswordHash,
            updatedAt: attemptedAt,
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
          actorUserId: user._id,
          targetUserId: user._id,
          eventType: "admin-login-succeeded",
          outcome: "success",
          ipHash,
          userAgentSummary,
          details: {
            sessionsRevokedForLimit,
            passwordHashReplaced: replacementPasswordHash !== null,
          },
          createdAt: attemptedAt,
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
      userId: user._id.toHexString(),
      email: user.emailDisplay,
      displayName: user.displayName,
      profileImagePath: createProfileImagePath(user),
      roles: [...user.roles],
    },
    session: {
      token: secrets.sessionToken,
      csrfToken: secrets.csrfToken,
      createdAt: attemptedAt,
      lastSeenAt: attemptedAt,
      idleExpiresAt,
      expiresAt,
    },
  };
}