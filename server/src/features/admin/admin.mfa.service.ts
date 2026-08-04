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
import { ADMIN_MFA_POLICY } from "./admin.constants.js";
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
  generateAdminMfaSecret,
  isAdminMfaConfigured,
  verifyAdminTotpCode,
} from "./admin.mfa.crypto.js";
import {
  acceptAdminTotpTimeStep,
  consumeAdminMfaChallenge,
  createAdminMfaChallenge,
  deleteAdminMfaChallengesForUser,
  createAdminMfaFactor,
  deleteAdminMfaFactor,
  findAdminMfaChallengeByTokenHash,
  findAdminMfaFactorByUserId,
  findAdminMfaSetupChallenge,
  invalidateOpenAdminMfaChallenges,
  recordAdminMfaChallengeFailure,
  updateAdminRecentAuthentication,
  updateAdminSessionMfaState,
} from "./admin.mfa.repository.js";
import {
  countActiveAdminPasskeys,
  deleteAdminPasskeyChallengesForUser,
  deleteAllAdminPasskeysForUser,
} from "./admin.passkey.repository.js";
import { isAdminWebAuthnConfigured } from "./admin.passkey.config.js";
import {
  consumeAdminRecoveryProof,
  generateAndStoreAdminRecoveryCodes,
  getAdminRecoveryCodeCount,
} from "./admin.recovery.service.js";
import { deleteAdminRecoveryFactor } from "./admin.recovery.repository.js";
import { bumpAdminSecurityRevision } from "./admin.security.repository.js";
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

export interface AdminSecurityState {
  mfaEnabled: boolean;
  mfaRequiredByPolicy: boolean;
  passkeysConfigured: boolean;
  passkeyCount: number;
  recoveryCodesRemaining: number;
  mfaEnabledAt: Date | null;
}

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
    | "admin-mfa-reset"
    | "admin-passkey-emergency-reset";
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
  if (!credential) return false;

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
  userId: ObjectId;
  factor: AdminMfaFactorDocument | null;
  method: "totp" | "recovery";
  code: string;
  checkedAt: Date;
  session?: ClientSession;
}): Promise<"totp" | "recovery" | null> {
  if (input.method === "totp") {
    if (!input.factor) return null;

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

  const consumed = await consumeAdminRecoveryProof({
    userId: input.userId,
    candidateCode: input.code,
    legacyFactor: input.factor,
    checkedAt: input.checkedAt,
    session: input.session,
  });

  return consumed ? "recovery" : null;
}

async function readSecurityState(
  userId: ObjectId,
  session?: ClientSession,
): Promise<AdminSecurityState> {
  const [factor, passkeyCount] = await Promise.all([
    findAdminMfaFactorByUserId(userId, session),
    countActiveAdminPasskeys(userId, session),
  ]);
  const recoveryCodesRemaining = await getAdminRecoveryCodeCount(
    userId,
    factor,
    session,
  );

  return {
    mfaEnabled: factor !== null,
    mfaRequiredByPolicy: env.ADMIN_MFA_REQUIRED,
    passkeysConfigured: isAdminWebAuthnConfigured(),
    passkeyCount,
    recoveryCodesRemaining,
    mfaEnabledAt: factor?.enabledAt ?? null,
  };
}

export async function verifyAdminMfaLoginChallenge(input: {
  body: AdminMfaChallengeInput;
  challengeToken: string;
  requestMetadata: AdminRequestMetadata;
}): Promise<{
  result: IssuedAdminSessionResult;
  security: AdminSecurityState;
}> {
  const verification = adminMfaChallengeInputSchema.parse(input.body);
  await initializeAdminStorage();

  const checkedAt = new Date();
  const challenge = await findAdminMfaChallengeByTokenHash(
    hashAdminMfaChallengeToken(input.challengeToken),
  );
  const ipHash = hashAdminIpAddress(input.requestMetadata.ipAddress);
  const userAgentSummary = summarizeAdminUserAgent(
    input.requestMetadata.userAgent,
  );
  const usable = Boolean(
    challenge &&
      challenge.consumedAt === null &&
      challenge.expiresAt.getTime() > checkedAt.getTime() &&
      challenge.attemptCount < challenge.maximumAttempts &&
      (challenge.userAgentSummary === null ||
        challenge.userAgentSummary === userAgentSummary) &&
      (challenge.ipHash === null || challenge.ipHash === ipHash),
  );

  if (!usable || !challenge) {
    throw new AdminMfaVerificationError(
      "The administrator verification request expired. Sign in again.",
    );
  }

  const [user, factor, passkeyCount] = await Promise.all([
    findActiveUserById(challenge.userId),
    findAdminMfaFactorByUserId(challenge.userId),
    countActiveAdminPasskeys(challenge.userId),
  ]);

  if (
    !user ||
    !user.roles.includes("admin") ||
    (factor === null && passkeyCount === 0)
  ) {
    await recordAdminMfaChallengeFailure({
      challengeId: challenge._id,
      checkedAt,
    });
    throw new AdminMfaVerificationError();
  }

  const proof = await consumeMfaProof({
    userId: user._id,
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
      details: { method: verification.method, attemptsRemaining },
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

  const security = await readSecurityState(user._id);

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
        recoveryCodesRemaining: security.recoveryCodesRemaining,
      },
    });
  }

  return { result, security };
}

export async function getAdminMfaStatus(
  context: AdminSessionContext,
): Promise<{
  configured: boolean;
  enabled: boolean;
  requiredByPolicy: boolean;
  passkeysConfigured: boolean;
  passkeyCount: number;
  recoveryCodesRemaining: number;
  enabledAt: Date | null;
}> {
  await initializeAdminStorage();
  const security = await readSecurityState(context.userId);

  return {
    configured: isAdminMfaConfigured(),
    enabled: security.mfaEnabled,
    requiredByPolicy: security.mfaRequiredByPolicy,
    passkeysConfigured: security.passkeysConfigured,
    passkeyCount: security.passkeyCount,
    recoveryCodesRemaining: security.recoveryCodesRemaining,
    enabledAt: security.mfaEnabledAt,
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
      "Administrator authenticator-app MFA is already enabled.",
    );
  }

  if (context.accessLevel === "full") {
    const passwordIsValid =
      typeof setupInput.password === "string" &&
      (await verifyAdministratorPassword(
        context.userId,
        setupInput.password,
      ));
    if (!passwordIsValid) throw new AdminInvalidCredentialsError();
  }

  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() + ADMIN_MFA_POLICY.setupLifetimeMilliseconds,
  );
  const secret = generateAdminMfaSecret();
  const encryptedSecret = encryptAdminMfaSecret(secret);
  const otpAuthUri = createAdminMfaOtpAuthUri({
    email: context.email,
    secret,
  });
  const setupId = randomUUID();

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
    encryptedSecret,
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
): Promise<{ recoveryCodes: string[]; enabledAt: Date }> {
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

  const client = await getMongoClient();
  const mongoSession = client.startSession();
  let recoveryCodes: string[] = [];

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

      await bumpAdminSecurityRevision({
        userId: context.userId,
        changedAt: verifiedAt,
        session: mongoSession,
      });

      await createAdminMfaFactor(
        {
          factorId: new ObjectId(),
          userId: context.userId,
          encryptedSecret: challenge.encryptedSecret!,
          recoveryCodeHashes: [],
          acceptedTimeStep: timeStep,
          createdAt: verifiedAt,
        },
        mongoSession,
      );

      recoveryCodes = await generateAndStoreAdminRecoveryCodes({
        userId: context.userId,
        generatedAt: verifiedAt,
        session: mongoSession,
      });

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

      const revokedOtherSessions = await revokeOtherAdminSessionsForUser(
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
}): Promise<{ proof: "totp" | "recovery" }> {
  const action = adminMfaProtectedActionInputSchema.parse(input.body);
  const [passwordIsValid, factor] = await Promise.all([
    verifyAdministratorPassword(input.context.userId, action.password),
    findAdminMfaFactorByUserId(input.context.userId),
  ]);

  if (!passwordIsValid) throw new AdminInvalidCredentialsError();

  const proof = await consumeMfaProof({
    userId: input.context.userId,
    factor,
    method: action.method,
    code: action.code,
    checkedAt: input.checkedAt,
  });
  if (!proof) throw new AdminMfaVerificationError();

  return { proof };
}

export async function regenerateAdminRecoveryCodes(
  context: AdminSessionContext,
  input: AdminMfaProtectedActionInput,
): Promise<{ recoveryCodes: string[]; generatedAt: Date }> {
  const generatedAt = new Date();
  const { proof } = await verifyProtectedMfaAction({
    context,
    body: input,
    checkedAt: generatedAt,
  });
  const recoveryCodes = await generateAndStoreAdminRecoveryCodes({
    userId: context.userId,
    generatedAt,
  });

  const updated = await updateAdminRecentAuthentication({
    sessionId: context.sessionId,
    authenticatedAt: generatedAt,
  });
  if (!updated) {
    throw new AdminPersistenceError(
      "Recent administrator authentication could not be recorded.",
    );
  }

  await recordMfaAudit({
    actorUserId: context.userId,
    eventType: "admin-mfa-recovery-regenerated",
    outcome: "success",
    createdAt: generatedAt,
    details: { verificationMethod: proof },
  });

  return { recoveryCodes, generatedAt };
}

export async function regenerateAdminRecoveryCodesAfterRecentAuthentication(
  context: AdminSessionContext,
): Promise<{ recoveryCodes: string[]; generatedAt: Date }> {
  const generatedAt = new Date();
  const [factor, passkeyCount] = await Promise.all([
    findAdminMfaFactorByUserId(context.userId),
    countActiveAdminPasskeys(context.userId),
  ]);

  if (!factor && passkeyCount === 0) {
    throw new AdminMfaOperationError(
      "Register a passkey or authenticator app before generating recovery codes.",
    );
  }

  const recoveryCodes = await generateAndStoreAdminRecoveryCodes({
    userId: context.userId,
    generatedAt,
  });

  await recordMfaAudit({
    actorUserId: context.userId,
    eventType: "admin-mfa-recovery-regenerated",
    outcome: "success",
    createdAt: generatedAt,
    details: { verificationMethod: "recent-authentication" },
  });

  return { recoveryCodes, generatedAt };
}

export async function disableAdminMfa(
  context: AdminSessionContext,
  input: AdminMfaProtectedActionInput,
): Promise<void> {
  const factor = await findAdminMfaFactorByUserId(context.userId);
  if (!factor) {
    throw new AdminMfaOperationError(
      "Administrator authenticator-app MFA is not enabled.",
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
      await bumpAdminSecurityRevision({
        userId: context.userId,
        changedAt: disabledAt,
        session: mongoSession,
      });

      const [currentFactor, passkeyCount] = await Promise.all([
        findAdminMfaFactorByUserId(context.userId, mongoSession),
        countActiveAdminPasskeys(context.userId, mongoSession),
      ]);

      if (!currentFactor) {
        throw new AdminMfaOperationError(
          "Administrator authenticator-app MFA is not enabled.",
        );
      }

      if (passkeyCount === 0) {
        throw new AdminMfaOperationError(
          "You cannot remove the final strong administrator verification method. Register a passkey first.",
        );
      }

      const deleted = await deleteAdminMfaFactor(
        context.userId,
        mongoSession,
      );
      if (!deleted) {
        throw new AdminMfaOperationError(
          "Administrator authenticator-app MFA is not enabled.",
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
        details: { verificationMethod: proof, remainingPasskeys: passkeyCount },
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
  const [passwordIsValid, factor, passkeyCount] = await Promise.all([
    verifyAdministratorPassword(context.userId, action.password),
    findAdminMfaFactorByUserId(context.userId),
    countActiveAdminPasskeys(context.userId),
  ]);

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

  if (factor === null && passkeyCount === 0) {
    if (env.ADMIN_MFA_REQUIRED) {
      throw new AdminMfaOperationError(
        "Administrator strong-factor enrollment is required.",
      );
    }
  } else {
    const accepted = await consumeMfaProof({
      userId: context.userId,
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
        details: { reason: "strong-factor", method: action.method },
      });
      throw new AdminMfaVerificationError();
    }
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
    details: { verificationMethod: action.method },
  });

  return { authenticatedAt };
}

export async function resetAdministratorMfaByEmail(
  email: string,
): Promise<{
  email: string;
  revokedSessions: number;
  deletedPasskeys: number;
}> {
  const user = await findUserByNormalizedEmail(email.trim().toLowerCase());
  if (!user || !user.roles.includes("admin")) {
    throw new AdminMfaOperationError(
      "An administrator account with that email was not found.",
    );
  }

  const resetAt = new Date();
  const client = await getMongoClient();
  const mongoSession = client.startSession();
  let revokedSessions = 0;
  let deletedPasskeys = 0;

  try {
    await mongoSession.withTransaction(async () => {
      await bumpAdminSecurityRevision({
        userId: user._id,
        changedAt: resetAt,
        session: mongoSession,
      });
      await deleteAdminMfaFactor(user._id, mongoSession);
      await deleteAdminRecoveryFactor(user._id, mongoSession);
      deletedPasskeys = await deleteAllAdminPasskeysForUser(
        user._id,
        mongoSession,
      );
      await deleteAdminPasskeyChallengesForUser(user._id, mongoSession);
      await deleteAdminMfaChallengesForUser(user._id, mongoSession);

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
        details: {
          revokedSessions,
          deletedPasskeys,
          source: "server-cli",
        },
        session: mongoSession,
      });

      if (deletedPasskeys > 0) {
        await recordMfaAudit({
          actorUserId: null,
          targetUserId: user._id,
          eventType: "admin-passkey-emergency-reset",
          outcome: "success",
          createdAt: resetAt,
          details: {
            deletedPasskeys,
            revokedSessions,
            source: "server-cli",
          },
          session: mongoSession,
        });
      }
    }, ADMIN_MFA_TRANSACTION_OPTIONS);
  } finally {
    await mongoSession.endSession();
  }

  return {
    email: user.emailDisplay,
    revokedSessions,
    deletedPasskeys,
  };
}
