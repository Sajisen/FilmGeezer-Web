import { randomUUID } from "node:crypto";

import {
  ObjectId,
  type ClientSession,
  type TransactionOptions,
} from "mongodb";

import { getMongoClient } from "../../config/database.js";
import { env } from "../../config/env.js";
import { verifyPassword } from "../auth/auth.password.js";
import { findAuthCredentialByUserId } from "../auth/repositories/authCredential.repository.js";
import {
  findActiveUserById,
  findUserByNormalizedEmail,
} from "../auth/repositories/authUser.repository.js";
import {
  ADMIN_MFA_POLICY,
} from "./admin.constants.js";
import {
  AdminInvalidCredentialsError,
  AdminMfaConfigurationError,
  AdminMfaOperationError,
  AdminMfaVerificationError,
  AdminPersistenceError,
} from "./admin.errors.js";
import { initializeAdminStorage } from "./admin.indexes.js";
import {
  createAdminMfaOtpAuthUri,
  createAdminMfaQrDataUrl,
  decryptAdminMfaSecret,
  encryptAdminMfaSecret,
  findAdminRecoveryCodeHash,
  generateAdminMfaSecret,
  generateAdminRecoveryCodes,
  hashAdminRecoveryCode,
  isAdminMfaConfigured,
  verifyAdminTotpCode,
} from "./admin.mfa.crypto.js";
import {
  acceptAdminTotpTimeStep,
  consumeAdminMfaChallenge,
  consumeAdminRecoveryCode,
  createAdminMfaChallenge,
  createAdminMfaFactor,
  deleteAdminMfaFactor,
  findAdminMfaChallengeByTokenHash,
  findAdminMfaFactorByUserId,
  findAdminMfaSetupChallenge,
  invalidateOpenAdminMfaChallenges,
  recordAdminMfaChallengeFailure,
  replaceAdminRecoveryCodes,
  updateAdminRecentAuthentication,
  updateAdminSessionMfaState,
} from "./admin.mfa.repository.js";
import {
  createAdminAuditEvent,
  revokeAllAdminSessionsForUser,
  revokeOtherAdminSessionsForUser,
} from "./admin.repository.js";
import {
  hashAdminIpAddress,
  hashAdminMfaChallengeToken,
  summarizeAdminUserAgent,
} from "./admin.session.js";
import {
  issueAdminSession,
  type IssuedAdminSessionResult,
} from "./admin.session-creation.service.js";
import type {
  AdminMfaFactorDocument,
  AdminSessionContext,
} from "./admin.types.js";
import {
  adminMfaChallengeInputSchema,
  adminMfaProtectedActionInputSchema,
  adminMfaSetupStartInputSchema,
  adminMfaSetupVerifyInputSchema,
  type AdminMfaChallengeInput,
  type AdminMfaProtectedActionInput,
  type AdminMfaSetupStartInput,
  type AdminMfaSetupVerifyInput,
} from "./admin.validation.js";
import type { AdminRequestMetadata } from "./admin.auth.service.js";

const ADMIN_MFA_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 5_000,
};

async function recordMfaAudit(input: {
  actorUserId: ObjectId | null;
  targetUserId?: ObjectId | null;
  eventType:
    | "admin-mfa-challenge-failed"
    | "admin-mfa-login-succeeded"
    | "admin-mfa-setup-started"
    | "admin-mfa-enabled"
    | "admin-mfa-disabled"
    | "admin-mfa-recovery-used"
    | "admin-mfa-recovery-regenerated"
    | "admin-reauthentication-succeeded"
    | "admin-reauthentication-failed"
    | "admin-mfa-reset";
  outcome: "success" | "failure";
  createdAt: Date;
  ipHash?: string | null;
  userAgentSummary?: string | null;
  details?: Record<string, string | number | boolean | null>;
  session?: ClientSession;
}): Promise<void> {
  await createAdminAuditEvent(
    {
      auditEventId: new ObjectId(),
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId ?? input.actorUserId,
      eventType: input.eventType,
      outcome: input.outcome,
      ipHash: input.ipHash,
      userAgentSummary: input.userAgentSummary,
      details: input.details,
      createdAt: input.createdAt,
    },
    input.session,
  );
}

async function verifyAdministratorPassword(
  userId: ObjectId,
  password: string,
): Promise<boolean> {
  const credential = await findAuthCredentialByUserId(userId);

  if (!credential) {
    return false;
  }

  try {
    return await verifyPassword(credential.passwordHash, password);
  } catch (error) {
    throw new AdminPersistenceError(
      "The administrator password could not be verified.",
      { cause: error },
    );
  }
}

async function consumeMfaProof(input: {
  factor: AdminMfaFactorDocument;
  method: "totp" | "recovery";
  code: string;
  checkedAt: Date;
  session?: ClientSession;
}): Promise<"totp" | "recovery" | null> {
  if (input.method === "totp") {
    const secret = decryptAdminMfaSecret(input.factor.encryptedSecret);
    const timeStep = verifyAdminTotpCode({
      secret,
      candidateCode: input.code,
      checkedAt: input.checkedAt,
    });

    if (
      timeStep === null ||
      (input.factor.lastAcceptedTimeStep !== null &&
        timeStep <= input.factor.lastAcceptedTimeStep)
    ) {
      return null;
    }

    const accepted = await acceptAdminTotpTimeStep(
      {
        factorId: input.factor._id,
        timeStep,
        acceptedAt: input.checkedAt,
      },
      input.session,
    );

    return accepted ? "totp" : null;
  }

  const matchingHash = findAdminRecoveryCodeHash({
    userId: input.factor.userId,
    candidateCode: input.code,
    storedHashes: input.factor.recoveryCodeHashes,
  });

  if (!matchingHash) {
    return null;
  }

  const consumed = await consumeAdminRecoveryCode(
    {
      factorId: input.factor._id,
      recoveryCodeHash: matchingHash,
      consumedAt: input.checkedAt,
    },
    input.session,
  );

  return consumed ? "recovery" : null;
}

export async function verifyAdminMfaLoginChallenge(input: {
  body: AdminMfaChallengeInput;
  challengeToken: string;
  requestMetadata: AdminRequestMetadata;
}): Promise<{
  result: IssuedAdminSessionResult;
  security: {
    mfaEnabled: true;
    mfaRequiredByPolicy: boolean;
    recoveryCodesRemaining: number;
    mfaEnabledAt: Date;
  };
}> {
  const verification = adminMfaChallengeInputSchema.parse(input.body);
  await initializeAdminStorage();

  const checkedAt = new Date();
  const tokenHash = hashAdminMfaChallengeToken(input.challengeToken);
  const challenge = await findAdminMfaChallengeByTokenHash(tokenHash);
  const ipHash = hashAdminIpAddress(input.requestMetadata.ipAddress);
  const userAgentSummary = summarizeAdminUserAgent(
    input.requestMetadata.userAgent,
  );

  const challengeIsUsable =
    challenge !== null &&
    challenge.consumedAt === null &&
    challenge.expiresAt.getTime() > checkedAt.getTime() &&
    challenge.attemptCount < challenge.maximumAttempts &&
    (challenge.userAgentSummary === null ||
      challenge.userAgentSummary === userAgentSummary) &&
    (challenge.ipHash === null || challenge.ipHash === ipHash);

  if (!challengeIsUsable || !challenge) {
    throw new AdminMfaVerificationError(
      "The administrator verification request expired. Sign in again.",
    );
  }

  const [user, factor] = await Promise.all([
    findActiveUserById(challenge.userId),
    findAdminMfaFactorByUserId(challenge.userId),
  ]);

  if (!user || !user.roles.includes("admin") || !factor) {
    await recordAdminMfaChallengeFailure({
      challengeId: challenge._id,
      checkedAt,
    });
    throw new AdminMfaVerificationError();
  }

  const proof = await consumeMfaProof({
    factor,
    method: verification.method,
    code: verification.code,
    checkedAt,
  });

  if (!proof) {
    const attemptsRemaining = await recordAdminMfaChallengeFailure({
      challengeId: challenge._id,
      checkedAt,
    });

    await recordMfaAudit({
      actorUserId: user._id,
      eventType: "admin-mfa-challenge-failed",
      outcome: "failure",
      createdAt: checkedAt,
      ipHash,
      userAgentSummary,
      details: {
        method: verification.method,
        attemptsRemaining,
      },
    });

    throw new AdminMfaVerificationError(
      attemptsRemaining > 0
        ? "The verification code was not accepted."
        : "Too many incorrect codes. Sign in again.",
    );
  }

  const consumed = await consumeAdminMfaChallenge(
    challenge._id,
    checkedAt,
  );

  if (!consumed) {
    throw new AdminMfaVerificationError(
      "The administrator verification request expired. Sign in again.",
    );
  }

  const result = await issueAdminSession({
    user,
    accessLevel: "full",
    mfaVerifiedAt: checkedAt,
    authenticatedAt: checkedAt,
    ipHash,
    userAgentSummary,
    authenticationMethod:
      proof === "totp"
        ? "password-and-totp"
        : "password-and-recovery",
  });

  await recordMfaAudit({
    actorUserId: user._id,
    eventType: "admin-mfa-login-succeeded",
    outcome: "success",
    createdAt: checkedAt,
    ipHash,
    userAgentSummary,
    details: { method: proof },
  });

  if (proof === "recovery") {
    await recordMfaAudit({
      actorUserId: user._id,
      eventType: "admin-mfa-recovery-used",
      outcome: "success",
      createdAt: checkedAt,
      ipHash,
      userAgentSummary,
      details: {
        recoveryCodesRemaining:
          Math.max(0, factor.recoveryCodeHashes.length - 1),
      },
    });
  }

  return {
    result,
    security: {
      mfaEnabled: true,
      mfaRequiredByPolicy: env.ADMIN_MFA_REQUIRED,
      recoveryCodesRemaining:
        proof === "recovery"
          ? Math.max(0, factor.recoveryCodeHashes.length - 1)
          : factor.recoveryCodeHashes.length,
      mfaEnabledAt: factor.enabledAt,
    },
  };
}

export async function getAdminMfaStatus(
  context: AdminSessionContext,
): Promise<{
  configured: boolean;
  enabled: boolean;
  requiredByPolicy: boolean;
  recoveryCodesRemaining: number;
  enabledAt: Date | null;
}> {
  const factor = await findAdminMfaFactorByUserId(context.userId);

  return {
    configured: isAdminMfaConfigured(),
    enabled: factor !== null,
    requiredByPolicy: env.ADMIN_MFA_REQUIRED,
    recoveryCodesRemaining: factor?.recoveryCodeHashes.length ?? 0,
    enabledAt: factor?.enabledAt ?? null,
  };
}

export async function startAdminMfaSetup(
  context: AdminSessionContext,
  input: AdminMfaSetupStartInput,
): Promise<{
  setupId: string;
  secret: string;
  otpAuthUri: string;
  qrDataUrl: string;
  expiresAt: Date;
}> {
  if (!isAdminMfaConfigured()) {
    throw new AdminMfaConfigurationError();
  }

  const setupInput = adminMfaSetupStartInputSchema.parse(input);
  const existingFactor = await findAdminMfaFactorByUserId(context.userId);

  if (existingFactor) {
    throw new AdminMfaOperationError(
      "Administrator MFA is already enabled.",
    );
  }

  if (context.accessLevel === "full") {
    if (
      !setupInput.password ||
      !(await verifyAdministratorPassword(
        context.userId,
        setupInput.password,
      ))
    ) {
      throw new AdminInvalidCredentialsError();
    }
  }

  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + ADMIN_MFA_POLICY.setupLifetimeMilliseconds,
  );
  const secret = generateAdminMfaSecret();
  const setupId = randomUUID();
  const otpAuthUri = createAdminMfaOtpAuthUri({
    email: context.email,
    secret,
  });

  await invalidateOpenAdminMfaChallenges({
    userId: context.userId,
    purpose: "setup",
    sessionId: context.sessionId,
    invalidatedAt: createdAt,
  });

  await createAdminMfaChallenge({
    challengeId: new ObjectId(),
    publicId: setupId,
    purpose: "setup",
    userId: context.userId,
    sessionId: context.sessionId,
    tokenHash: null,
    encryptedSecret: encryptAdminMfaSecret(secret),
    maximumAttempts: ADMIN_MFA_POLICY.maximumVerificationAttempts,
    ipHash: null,
    userAgentSummary: null,
    createdAt,
    expiresAt,
  });

  await recordMfaAudit({
    actorUserId: context.userId,
    eventType: "admin-mfa-setup-started",
    outcome: "success",
    createdAt,
    details: { sessionId: context.sessionId.toHexString() },
  });

  return {
    setupId,
    secret,
    otpAuthUri,
    qrDataUrl: await createAdminMfaQrDataUrl(otpAuthUri),
    expiresAt,
  };
}

export async function verifyAdminMfaSetup(
  context: AdminSessionContext,
  input: AdminMfaSetupVerifyInput,
): Promise<{
  recoveryCodes: string[];
  enabledAt: Date;
}> {
  const setupInput = adminMfaSetupVerifyInputSchema.parse(input);
  const verifiedAt = new Date();
  const challenge = await findAdminMfaSetupChallenge({
    publicId: setupInput.setupId,
    userId: context.userId,
    sessionId: context.sessionId,
  });

  if (
    !challenge ||
    challenge.consumedAt ||
    challenge.expiresAt.getTime() <= verifiedAt.getTime() ||
    challenge.attemptCount >= challenge.maximumAttempts ||
    !challenge.encryptedSecret
  ) {
    throw new AdminMfaVerificationError(
      "The MFA setup expired. Start again.",
    );
  }

  const secret = decryptAdminMfaSecret(challenge.encryptedSecret);
  const timeStep = verifyAdminTotpCode({
    secret,
    candidateCode: setupInput.code,
    checkedAt: verifiedAt,
  });

  if (timeStep === null) {
    const attemptsRemaining = await recordAdminMfaChallengeFailure({
      challengeId: challenge._id,
      checkedAt: verifiedAt,
    });

    throw new AdminMfaVerificationError(
      attemptsRemaining > 0
        ? "The authenticator code was not accepted."
        : "Too many incorrect codes. Start setup again.",
    );
  }

  const recoveryCodes = generateAdminRecoveryCodes();
  const recoveryCodeHashes = recoveryCodes.map((code) =>
    hashAdminRecoveryCode(context.userId, code),
  );
  const client = await getMongoClient();
  const mongoSession = client.startSession();

  try {
    const result = await mongoSession.withTransaction(async () => {
      const consumed = await consumeAdminMfaChallenge(
        challenge._id,
        verifiedAt,
        mongoSession,
      );

      if (!consumed) {
        throw new AdminMfaVerificationError(
          "The MFA setup expired. Start again.",
        );
      }

      await createAdminMfaFactor(
        {
          factorId: new ObjectId(),
          userId: context.userId,
          encryptedSecret: challenge.encryptedSecret!,
          recoveryCodeHashes,
          acceptedTimeStep: timeStep,
          createdAt: verifiedAt,
        },
        mongoSession,
      );

      const updated = await updateAdminSessionMfaState(
        {
          sessionId: context.sessionId,
          accessLevel: "full",
          mfaVerifiedAt: verifiedAt,
          recentAuthenticationAt: verifiedAt,
        },
        mongoSession,
      );

      if (!updated) {
        throw new AdminPersistenceError(
          "The administrator session could not be upgraded.",
        );
      }

      const revokedOtherSessions =
        await revokeOtherAdminSessionsForUser(
          {
            userId: context.userId,
            exceptSessionId: context.sessionId,
            revokedAt: verifiedAt,
            reason: "security-event",
          },
          mongoSession,
        );

      await recordMfaAudit({
        actorUserId: context.userId,
        eventType: "admin-mfa-enabled",
        outcome: "success",
        createdAt: verifiedAt,
        details: {
          recoveryCodeCount: recoveryCodes.length,
          revokedOtherSessions,
        },
        session: mongoSession,
      });

      return true;
    }, ADMIN_MFA_TRANSACTION_OPTIONS);

    if (!result) {
      throw new AdminPersistenceError(
        "Administrator MFA setup did not complete.",
      );
    }
  } finally {
    await mongoSession.endSession();
  }

  return { recoveryCodes, enabledAt: verifiedAt };
}

async function verifyProtectedMfaAction(input: {
  context: AdminSessionContext;
  body: AdminMfaProtectedActionInput;
  checkedAt: Date;
}): Promise<{
  factor: AdminMfaFactorDocument;
  proof: "totp" | "recovery";
}> {
  const action = adminMfaProtectedActionInputSchema.parse(input.body);
  const passwordIsValid = await verifyAdministratorPassword(
    input.context.userId,
    action.password,
  );
  const factor = await findAdminMfaFactorByUserId(input.context.userId);

  if (!passwordIsValid || !factor) {
    throw new AdminInvalidCredentialsError();
  }

  const proof = await consumeMfaProof({
    factor,
    method: action.method,
    code: action.code,
    checkedAt: input.checkedAt,
  });

  if (!proof) {
    throw new AdminMfaVerificationError();
  }

  return { factor, proof };
}

export async function regenerateAdminRecoveryCodes(
  context: AdminSessionContext,
  input: AdminMfaProtectedActionInput,
): Promise<{ recoveryCodes: string[]; generatedAt: Date }> {
  const generatedAt = new Date();
  const { factor, proof } = await verifyProtectedMfaAction({
    context,
    body: input,
    checkedAt: generatedAt,
  });
  const recoveryCodes = generateAdminRecoveryCodes();
  const hashes = recoveryCodes.map((code) =>
    hashAdminRecoveryCode(context.userId, code),
  );

  const replaced = await replaceAdminRecoveryCodes({
    factorId: factor._id,
    hashes,
    updatedAt: generatedAt,
  });

  if (!replaced) {
    throw new AdminPersistenceError(
      "Administrator recovery codes could not be replaced.",
    );
  }

  await updateAdminRecentAuthentication({
    sessionId: context.sessionId,
    authenticatedAt: generatedAt,
  });
  await recordMfaAudit({
    actorUserId: context.userId,
    eventType: "admin-mfa-recovery-regenerated",
    outcome: "success",
    createdAt: generatedAt,
    details: { verificationMethod: proof },
  });

  return { recoveryCodes, generatedAt };
}

export async function disableAdminMfa(
  context: AdminSessionContext,
  input: AdminMfaProtectedActionInput,
): Promise<void> {
  if (env.ADMIN_MFA_REQUIRED) {
    throw new AdminMfaOperationError(
      "Administrator MFA is required by the current server policy.",
    );
  }

  const disabledAt = new Date();
  const { proof } = await verifyProtectedMfaAction({
    context,
    body: input,
    checkedAt: disabledAt,
  });
  const client = await getMongoClient();
  const mongoSession = client.startSession();

  try {
    await mongoSession.withTransaction(async () => {
      const deleted = await deleteAdminMfaFactor(
        context.userId,
        mongoSession,
      );

      if (!deleted) {
        throw new AdminMfaOperationError(
          "Administrator MFA is not enabled.",
        );
      }

      await revokeAllAdminSessionsForUser(
        {
          userId: context.userId,
          revokedAt: disabledAt,
          reason: "mfa-disabled",
        },
        mongoSession,
      );

      await recordMfaAudit({
        actorUserId: context.userId,
        eventType: "admin-mfa-disabled",
        outcome: "success",
        createdAt: disabledAt,
        details: { verificationMethod: proof },
        session: mongoSession,
      });
    }, ADMIN_MFA_TRANSACTION_OPTIONS);
  } finally {
    await mongoSession.endSession();
  }
}

export async function reauthenticateAdministrator(
  context: AdminSessionContext,
  input: AdminMfaProtectedActionInput,
): Promise<{ authenticatedAt: Date }> {
  const authenticatedAt = new Date();
  const action = adminMfaProtectedActionInputSchema.parse(input);
  const passwordIsValid = await verifyAdministratorPassword(
    context.userId,
    action.password,
  );
  const factor = await findAdminMfaFactorByUserId(context.userId);

  let proof: "password" | "totp" | "recovery" = "password";

  if (!passwordIsValid) {
    await recordMfaAudit({
      actorUserId: context.userId,
      eventType: "admin-reauthentication-failed",
      outcome: "failure",
      createdAt: authenticatedAt,
      details: { reason: "password" },
    });
    throw new AdminInvalidCredentialsError();
  }

  if (factor) {
    const accepted = await consumeMfaProof({
      factor,
      method: action.method,
      code: action.code,
      checkedAt: authenticatedAt,
    });

    if (!accepted) {
      await recordMfaAudit({
        actorUserId: context.userId,
        eventType: "admin-reauthentication-failed",
        outcome: "failure",
        createdAt: authenticatedAt,
        details: { reason: "mfa" },
      });
      throw new AdminMfaVerificationError();
    }

    proof = accepted;
  } else if (env.ADMIN_MFA_REQUIRED) {
    throw new AdminMfaOperationError(
      "Administrator MFA enrollment is required.",
    );
  }

  const updated = await updateAdminRecentAuthentication({
    sessionId: context.sessionId,
    authenticatedAt,
  });

  if (!updated) {
    throw new AdminPersistenceError(
      "Recent administrator authentication could not be recorded.",
    );
  }

  await recordMfaAudit({
    actorUserId: context.userId,
    eventType: "admin-reauthentication-succeeded",
    outcome: "success",
    createdAt: authenticatedAt,
    details: { verificationMethod: proof },
  });

  return { authenticatedAt };
}

export async function resetAdministratorMfaByEmail(
  email: string,
): Promise<{ email: string; revokedSessions: number }> {
  const emailNormalized = email.trim().toLowerCase();
  const user = await findUserByNormalizedEmail(emailNormalized);

  if (!user || !user.roles.includes("admin")) {
    throw new AdminMfaOperationError(
      "An administrator account with that email was not found.",
    );
  }

  const resetAt = new Date();
  const client = await getMongoClient();
  const mongoSession = client.startSession();
  let revokedSessions = 0;

  try {
    await mongoSession.withTransaction(async () => {
      await deleteAdminMfaFactor(user._id, mongoSession);
      revokedSessions = await revokeAllAdminSessionsForUser(
        {
          userId: user._id,
          revokedAt: resetAt,
          reason: "mfa-reset",
        },
        mongoSession,
      );
      await recordMfaAudit({
        actorUserId: null,
        targetUserId: user._id,
        eventType: "admin-mfa-reset",
        outcome: "success",
        createdAt: resetAt,
        details: { revokedSessions, source: "server-cli" },
        session: mongoSession,
      });
    }, ADMIN_MFA_TRANSACTION_OPTIONS);
  } finally {
    await mongoSession.endSession();
  }

  return { email: user.emailDisplay, revokedSessions };
}
