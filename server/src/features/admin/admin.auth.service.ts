import { randomUUID } from "node:crypto";

import { ObjectId } from "mongodb";

import { env } from "../../config/env.js";
import { verifyPassword } from "../auth/auth.password.js";
import { findAuthCredentialByUserId } from "../auth/repositories/authCredential.repository.js";
import { findUserByNormalizedEmail } from "../auth/repositories/authUser.repository.js";
import { ADMIN_MFA_POLICY } from "./admin.constants.js";
import {
  AdminInvalidCredentialsError,
  AdminPersistenceError,
} from "./admin.errors.js";
import { initializeAdminStorage } from "./admin.indexes.js";
import {
  createAdminMfaChallenge,
  findAdminMfaFactorByUserId,
  invalidateOpenAdminMfaChallenges,
} from "./admin.mfa.repository.js";
import { countActiveAdminPasskeys } from "./admin.passkey.repository.js";
import { getAdminRecoveryCodeCount } from "./admin.recovery.service.js";
import { createAdminAuditEvent } from "./admin.repository.js";
import {
  createAdminMfaChallengeToken,
  hashAdminIpAddress,
  hashAdminMfaChallengeToken,
  summarizeAdminUserAgent,
} from "./admin.session.js";
import {
  issueAdminSession,
  type IssuedAdminSessionResult,
} from "./admin.session-creation.service.js";
import {
  parseAdminLoginInput,
  type AdminLoginInput,
} from "./admin.validation.js";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$7fff7cXpK6SzkykonWnjuw$2AOO6h2HthwHj1nH4H6zkts//9OsIVzCyQ94lwre9ic";

export interface AdminRequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export type AdminLoginResult =
  | { kind: "session"; result: IssuedAdminSessionResult }
  | {
      kind: "mfa-challenge";
      challengeToken: string;
      expiresAt: Date;
      passkeyAllowed: boolean;
      totpAllowed: boolean;
      recoveryAllowed: boolean;
    };

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

  const [mfaFactor, passkeyCount] = await Promise.all([
    findAdminMfaFactorByUserId(user._id),
    countActiveAdminPasskeys(user._id),
  ]);
  const recoveryCodeCount = await getAdminRecoveryCodeCount(
    user._id,
    mfaFactor,
  );
  const hasStrongFactor = mfaFactor !== null || passkeyCount > 0;

  if (hasStrongFactor) {
    const challengeToken = createAdminMfaChallengeToken();
    const expiresAt = new Date(
      attemptedAt.getTime() +
        ADMIN_MFA_POLICY.challengeLifetimeMilliseconds,
    );

    await invalidateOpenAdminMfaChallenges({
      userId: user._id,
      purpose: "login",
      invalidatedAt: attemptedAt,
    });
    await createAdminMfaChallenge({
      challengeId: new ObjectId(),
      publicId: randomUUID(),
      purpose: "login",
      userId: user._id,
      sessionId: null,
      tokenHash: hashAdminMfaChallengeToken(challengeToken),
      encryptedSecret: null,
      maximumAttempts: ADMIN_MFA_POLICY.maximumVerificationAttempts,
      ipHash,
      userAgentSummary,
      createdAt: attemptedAt,
      expiresAt,
    });

    await createAdminAuditEvent({
      auditEventId: new ObjectId(),
      actorUserId: user._id,
      targetUserId: user._id,
      eventType: "admin-mfa-challenge-created",
      outcome: "success",
      ipHash,
      userAgentSummary,
      details: {
        passkeyAllowed: passkeyCount > 0,
        totpAllowed: mfaFactor !== null,
        recoveryAllowed: recoveryCodeCount > 0,
      },
      createdAt: attemptedAt,
    });

    return {
      kind: "mfa-challenge",
      challengeToken,
      expiresAt,
      passkeyAllowed: passkeyCount > 0,
      totpAllowed: mfaFactor !== null,
      recoveryAllowed: recoveryCodeCount > 0,
    };
  }

  const accessLevel = env.ADMIN_MFA_REQUIRED
    ? "mfa-enrollment"
    : "full";

  return {
    kind: "session",
    result: await issueAdminSession({
      user,
      credential,
      passwordForRehash: login.password,
      accessLevel,
      mfaVerifiedAt: null,
      authenticatedAt: attemptedAt,
      ipHash,
      userAgentSummary,
      authenticationMethod: "password",
    }),
  };
}
