import { randomUUID } from "node:crypto";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  MongoServerError,
  ObjectId,
  type ClientSession,
  type TransactionOptions,
} from "mongodb";

import { getMongoClient } from "../../config/database.js";
import { env } from "../../config/env.js";
import { findActiveUserById } from "../auth/repositories/authUser.repository.js";
import {
  ADMIN_PASSKEY_POLICY,
} from "./admin.constants.js";
import {
  AdminPasskeyOperationError,
  AdminPasskeyVerificationError,
  AdminPersistenceError,
} from "./admin.errors.js";
import { initializeAdminStorage } from "./admin.indexes.js";
import {
  consumeAdminMfaChallenge,
  findAdminMfaChallengeByTokenHash,
  findAdminMfaFactorByUserId,
  recordAdminMfaChallengeFailure,
  updateAdminRecentAuthentication,
  updateAdminSessionMfaState,
} from "./admin.mfa.repository.js";
import {
  getAdminWebAuthnConfiguration,
  isAdminWebAuthnConfigured,
} from "./admin.passkey.config.js";
import {
  consumeAdminPasskeyChallenge,
  countActiveAdminPasskeys,
  createAdminPasskeyChallenge,
  createAdminPasskeyCredential,
  findActiveAdminPasskeyByCredentialId,
  findAdminPasskeyByCredentialId,
  findAdminPasskeyChallenge,
  invalidateOpenAdminPasskeyChallenges,
  listActiveAdminPasskeys,
  recordAdminPasskeyChallengeFailure,
  revokeAdminPasskeyCredential,
  updateAdminPasskeyUsage,
} from "./admin.passkey.repository.js";
import { bumpAdminSecurityRevision } from "./admin.security.repository.js";
import {
  generateAndStoreAdminRecoveryCodes,
  getAdminRecoveryCodeCount,
} from "./admin.recovery.service.js";
import {
  createAdminAuditEvent,
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
  AdminPasskeyAttachment,
  AdminPasskeyChallengeDocument,
  AdminPasskeyCredentialDocument,
  AdminSessionContext,
} from "./admin.types.js";
import {
  adminPasskeyAuthenticationVerifyInputSchema,
  adminPasskeyCredentialIdSchema,
  adminPasskeyRegistrationStartInputSchema,
  adminPasskeyRegistrationVerifyInputSchema,
  type AdminPasskeyAuthenticationVerifyInput,
  type AdminPasskeyRegistrationStartInput,
  type AdminPasskeyRegistrationVerifyInput,
} from "./admin.validation.js";
import type { AdminRequestMetadata } from "./admin.auth.service.js";

const ADMIN_PASSKEY_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 5_000,
};

export interface AdminPasskeySummary {
  credentialId: string;
  label: string;
  attachment: AdminPasskeyAttachment;
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  transports: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
}

function toPasskeySummary(
  credential: AdminPasskeyCredentialDocument,
): AdminPasskeySummary {
  return {
    credentialId: credential.credentialId,
    label: credential.label,
    attachment: credential.attachment,
    deviceType: credential.deviceType,
    backedUp: credential.backedUp,
    transports: [...credential.transports],
    createdAt: credential.createdAt,
    lastUsedAt: credential.lastUsedAt,
  };
}

async function recordPasskeyAudit(input: {
  actorUserId: ObjectId | null;
  targetUserId?: ObjectId | null;
  eventType:
    | "admin-passkey-registration-started"
    | "admin-passkey-registered"
    | "admin-passkey-authentication-succeeded"
    | "admin-passkey-authentication-failed"
    | "admin-passkey-revoked"
    | "admin-passkey-used-for-reauthentication"
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
      createdAt: input.createdAt,
      ipHash: input.ipHash,
      userAgentSummary: input.userAgentSummary,
      details: input.details,
    },
    input.session,
  );
}

function challengeIsUsable(input: {
  challenge: AdminPasskeyChallengeDocument | null;
  checkedAt: Date;
  ipHash: string | null;
  userAgentSummary: string | null;
}): input is {
  challenge: AdminPasskeyChallengeDocument;
  checkedAt: Date;
  ipHash: string | null;
  userAgentSummary: string | null;
} {
  const { challenge } = input;

  return Boolean(
    challenge &&
      challenge.consumedAt === null &&
      challenge.expiresAt.getTime() > input.checkedAt.getTime() &&
      challenge.attemptCount < challenge.maximumAttempts &&
      (challenge.userAgentSummary === null ||
        challenge.userAgentSummary === input.userAgentSummary) &&
      (challenge.ipHash === null || challenge.ipHash === input.ipHash),
  );
}

type StoredAuthenticatorTransports = Parameters<
  typeof verifyAuthenticationResponse
>[0]["credential"]["transports"];

function credentialTransports(
  credential: AdminPasskeyCredentialDocument,
): StoredAuthenticatorTransports {
  return credential.transports as StoredAuthenticatorTransports;
}

function credentialForVerification(
  credential: AdminPasskeyCredentialDocument,
) {
  return {
    id: credential.credentialId,
    publicKey: new Uint8Array(
      Buffer.from(credential.publicKeyBase64, "base64"),
    ),
    counter: credential.counter,
    transports: credentialTransports(credential),
  };
}

async function failPasskeyChallenge(input: {
  challenge: AdminPasskeyChallengeDocument;
  checkedAt: Date;
  userId: ObjectId;
  ipHash: string | null;
  userAgentSummary: string | null;
  reason: string;
  loginChallengeId?: ObjectId;
}): Promise<never> {
  const attemptsRemaining = await recordAdminPasskeyChallengeFailure({
    challengeId: input.challenge._id,
    checkedAt: input.checkedAt,
  });

  if (input.loginChallengeId) {
    await recordAdminMfaChallengeFailure({
      challengeId: input.loginChallengeId,
      checkedAt: input.checkedAt,
    });
  }

  await recordPasskeyAudit({
    actorUserId: input.userId,
    eventType: "admin-passkey-authentication-failed",
    outcome: "failure",
    createdAt: input.checkedAt,
    ipHash: input.ipHash,
    userAgentSummary: input.userAgentSummary,
    details: {
      reason: input.reason,
      attemptsRemaining,
    },
  });

  throw new AdminPasskeyVerificationError(
    attemptsRemaining > 0
      ? "The passkey was not accepted. Try again or use another method."
      : "Too many failed passkey attempts. Sign in again.",
  );
}

export async function getAdminPasskeyStatus(
  context: AdminSessionContext,
): Promise<{
  configured: boolean;
  passkeys: AdminPasskeySummary[];
}> {
  await initializeAdminStorage();
  const credentials = await listActiveAdminPasskeys(context.userId);

  return {
    configured: isAdminWebAuthnConfigured(),
    passkeys: credentials.map(toPasskeySummary),
  };
}

export async function startAdminPasskeyRegistration(input: {
  context: AdminSessionContext;
  body: AdminPasskeyRegistrationStartInput;
  requestMetadata: AdminRequestMetadata;
}): Promise<{
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
  expiresAt: Date;
}> {
  const registration =
    adminPasskeyRegistrationStartInputSchema.parse(input.body);
  const configuration = getAdminWebAuthnConfiguration();
  await initializeAdminStorage();

  const createdAt = new Date();
  const expiresAt = new Date(
    createdAt.getTime() +
      ADMIN_PASSKEY_POLICY.challengeLifetimeMilliseconds,
  );
  const existingCredentials = await listActiveAdminPasskeys(
    input.context.userId,
  );

  if (
    existingCredentials.length >=
    ADMIN_PASSKEY_POLICY.maximumCredentialsPerAdministrator
  ) {
    throw new AdminPasskeyOperationError(
      `You can register up to ${ADMIN_PASSKEY_POLICY.maximumCredentialsPerAdministrator} administrator passkeys. Revoke an unused passkey before adding another.`,
    );
  }

  const options = await generateRegistrationOptions({
    rpName: configuration.rpName,
    rpID: configuration.rpId,
    userID: Buffer.from(input.context.userId.toHexString(), "utf8"),
    userName: input.context.email,
    userDisplayName: input.context.displayName,
    attestationType: "none",
    excludeCredentials: existingCredentials.map((credential) => ({
      id: credential.credentialId,
      transports: credentialTransports(credential),
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
      authenticatorAttachment: registration.attachment,
    },
    supportedAlgorithmIDs: [
      ...ADMIN_PASSKEY_POLICY.supportedAlgorithmIds,
    ],
    timeout: ADMIN_PASSKEY_POLICY.challengeLifetimeMilliseconds,
  });
  const ipHash = hashAdminIpAddress(input.requestMetadata.ipAddress);
  const userAgentSummary = summarizeAdminUserAgent(
    input.requestMetadata.userAgent,
  );

  await invalidateOpenAdminPasskeyChallenges({
    userId: input.context.userId,
    purpose: "registration",
    sessionId: input.context.sessionId,
    invalidatedAt: createdAt,
  });

  const challengeId = randomUUID();
  await createAdminPasskeyChallenge({
    challengeDocumentId: new ObjectId(),
    publicId: challengeId,
    purpose: "registration",
    userId: input.context.userId,
    sessionId: input.context.sessionId,
    parentMfaChallengeId: null,
    challenge: options.challenge,
    label: registration.label,
    attachment: registration.attachment,
    maximumAttempts: ADMIN_PASSKEY_POLICY.maximumVerificationAttempts,
    ipHash,
    userAgentSummary,
    createdAt,
    expiresAt,
  });

  await recordPasskeyAudit({
    actorUserId: input.context.userId,
    eventType: "admin-passkey-registration-started",
    outcome: "success",
    createdAt,
    ipHash,
    userAgentSummary,
    details: {
      attachment: registration.attachment,
      existingPasskeys: existingCredentials.length,
    },
  });

  return { challengeId, options, expiresAt };
}

export async function verifyAdminPasskeyRegistration(input: {
  context: AdminSessionContext;
  body: AdminPasskeyRegistrationVerifyInput;
  requestMetadata: AdminRequestMetadata;
}): Promise<{
  passkey: AdminPasskeySummary;
  recoveryCodes: string[] | null;
  registeredAt: Date;
}> {
  const registration =
    adminPasskeyRegistrationVerifyInputSchema.parse(input.body);
  const configuration = getAdminWebAuthnConfiguration();
  await initializeAdminStorage();

  const verifiedAt = new Date();
  const ipHash = hashAdminIpAddress(input.requestMetadata.ipAddress);
  const userAgentSummary = summarizeAdminUserAgent(
    input.requestMetadata.userAgent,
  );
  const challenge = await findAdminPasskeyChallenge({
    publicId: registration.challengeId,
    purpose: "registration",
    userId: input.context.userId,
    sessionId: input.context.sessionId,
  });

  if (
    !challenge ||
    !challengeIsUsable({
      challenge,
      checkedAt: verifiedAt,
      ipHash,
      userAgentSummary,
    }) ||
    !challenge.label ||
    !challenge.attachment
  ) {
    throw new AdminPasskeyVerificationError(
      "The passkey setup expired. Start again.",
    );
  }

  const label = challenge.label;
  const attachment = challenge.attachment;
  let verification;

  try {
    verification = await verifyRegistrationResponse({
      response: registration.response as unknown as RegistrationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: configuration.origin,
      expectedRPID: configuration.rpId,
      requireUserVerification: true,
    });
  } catch {
    return failPasskeyChallenge({
      challenge,
      checkedAt: verifiedAt,
      userId: input.context.userId,
      ipHash,
      userAgentSummary,
      reason: "registration-verification",
    });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return failPasskeyChallenge({
      challenge,
      checkedAt: verifiedAt,
      userId: input.context.userId,
      ipHash,
      userAgentSummary,
      reason: "registration-not-verified",
    });
  }

  const {
    credential,
    credentialDeviceType,
    credentialBackedUp,
  } = verification.registrationInfo;
  const existing = await findAdminPasskeyByCredentialId(credential.id);

  if (existing) {
    throw new AdminPasskeyOperationError(
      "This passkey is already registered. Create a new passkey instead.",
    );
  }

  const client = await getMongoClient();
  const mongoSession = client.startSession();

  try {
    const transactionResult = await mongoSession.withTransaction(
      async () => {
        const consumed = await consumeAdminPasskeyChallenge(
          challenge._id,
          verifiedAt,
          mongoSession,
        );

        if (!consumed) {
          throw new AdminPasskeyVerificationError(
            "The passkey setup expired. Start again.",
          );
        }

        await bumpAdminSecurityRevision({
          userId: input.context.userId,
          changedAt: verifiedAt,
          session: mongoSession,
        });

        const existingPasskeyCount = await countActiveAdminPasskeys(
          input.context.userId,
          mongoSession,
        );

        if (
          existingPasskeyCount >=
          ADMIN_PASSKEY_POLICY.maximumCredentialsPerAdministrator
        ) {
          throw new AdminPasskeyOperationError(
            `You can register up to ${ADMIN_PASSKEY_POLICY.maximumCredentialsPerAdministrator} administrator passkeys. Revoke an unused passkey before adding another.`,
          );
        }

        let createdCredential: AdminPasskeyCredentialDocument;
        try {
          createdCredential = await createAdminPasskeyCredential(
            {
              credentialIdDocument: new ObjectId(),
              userId: input.context.userId,
              credentialId: credential.id,
              publicKeyBase64: Buffer.from(credential.publicKey).toString(
                "base64",
              ),
              counter: credential.counter,
              transports: [...(credential.transports ?? [])],
              deviceType: credentialDeviceType,
              backedUp: credentialBackedUp,
              label,
              attachment,
              createdAt: verifiedAt,
            },
            mongoSession,
          );
        } catch (error) {
          if (error instanceof MongoServerError && error.code === 11000) {
            throw new AdminPasskeyOperationError(
              "This passkey is already registered. Create a new passkey instead.",
            );
          }
          throw error;
        }

        // MongoDB transactions must use serial operations on a ClientSession.
        // Running these calls through Promise.all can attempt overlapping
        // transaction commands and fail even after WebAuthn verification.
        const factor = await findAdminMfaFactorByUserId(
          input.context.userId,
          mongoSession,
        );
        const passkeyCount = await countActiveAdminPasskeys(
          input.context.userId,
          mongoSession,
        );
        const recoveryCodeCount = await getAdminRecoveryCodeCount(
          input.context.userId,
          factor,
          mongoSession,
        );
        const recoveryCodes = recoveryCodeCount === 0
          ? await generateAndStoreAdminRecoveryCodes({
              userId: input.context.userId,
              generatedAt: verifiedAt,
              session: mongoSession,
            })
          : null;

        const upgraded = await updateAdminSessionMfaState(
          {
            sessionId: input.context.sessionId,
            accessLevel: "full",
            mfaVerifiedAt: verifiedAt,
            recentAuthenticationAt: verifiedAt,
          },
          mongoSession,
        );

        if (!upgraded) {
          throw new AdminPersistenceError(
            "The administrator session could not be upgraded.",
          );
        }

        const revokedOtherSessions =
          await revokeOtherAdminSessionsForUser(
            {
              userId: input.context.userId,
              exceptSessionId: input.context.sessionId,
              revokedAt: verifiedAt,
              reason: "security-event",
            },
            mongoSession,
          );

        await recordPasskeyAudit({
          actorUserId: input.context.userId,
          eventType: "admin-passkey-registered",
          outcome: "success",
          createdAt: verifiedAt,
          ipHash,
          userAgentSummary,
          details: {
            attachment,
            deviceType: credentialDeviceType,
            backedUp: credentialBackedUp,
            passkeyCount,
            recoveryCodesGenerated: recoveryCodes !== null,
            revokedOtherSessions,
          },
          session: mongoSession,
        });

        return { createdCredential, recoveryCodes };
      },
      ADMIN_PASSKEY_TRANSACTION_OPTIONS,
    );

    if (!transactionResult) {
      throw new AdminPersistenceError(
        "Passkey registration did not complete.",
      );
    }

    return {
      passkey: toPasskeySummary(transactionResult.createdCredential),
      recoveryCodes: transactionResult.recoveryCodes,
      registeredAt: verifiedAt,
    };
  } finally {
    await mongoSession.endSession();
  }
}

async function resolveLoginChallenge(input: {
  challengeToken: string;
  requestMetadata: AdminRequestMetadata;
}) {
  const checkedAt = new Date();
  const ipHash = hashAdminIpAddress(input.requestMetadata.ipAddress);
  const userAgentSummary = summarizeAdminUserAgent(
    input.requestMetadata.userAgent,
  );
  const challenge = await findAdminMfaChallengeByTokenHash(
    hashAdminMfaChallengeToken(input.challengeToken),
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
    throw new AdminPasskeyVerificationError(
      "The administrator verification request expired. Sign in again.",
    );
  }

  return { challenge, checkedAt, ipHash, userAgentSummary };
}

export async function startAdminPasskeyLogin(input: {
  challengeToken: string;
  requestMetadata: AdminRequestMetadata;
}): Promise<{
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
  expiresAt: Date;
}> {
  const configuration = getAdminWebAuthnConfiguration();
  await initializeAdminStorage();
  const login = await resolveLoginChallenge(input);
  const credentials = await listActiveAdminPasskeys(
    login.challenge.userId,
  );

  if (credentials.length === 0) {
    throw new AdminPasskeyOperationError(
      "No passkey is registered for this administrator account.",
    );
  }

  const options = await generateAuthenticationOptions({
    rpID: configuration.rpId,
    allowCredentials: credentials.map((credential) => ({
      id: credential.credentialId,
      transports: credentialTransports(credential),
    })),
    userVerification: "required",
    timeout: ADMIN_PASSKEY_POLICY.challengeLifetimeMilliseconds,
  });
  const expiresAt = new Date(
    login.checkedAt.getTime() +
      ADMIN_PASSKEY_POLICY.challengeLifetimeMilliseconds,
  );

  await invalidateOpenAdminPasskeyChallenges({
    userId: login.challenge.userId,
    purpose: "login",
    parentMfaChallengeId: login.challenge._id,
    invalidatedAt: login.checkedAt,
  });

  const challengeId = randomUUID();
  await createAdminPasskeyChallenge({
    challengeDocumentId: new ObjectId(),
    publicId: challengeId,
    purpose: "login",
    userId: login.challenge.userId,
    sessionId: null,
    parentMfaChallengeId: login.challenge._id,
    challenge: options.challenge,
    label: null,
    attachment: null,
    maximumAttempts: ADMIN_PASSKEY_POLICY.maximumVerificationAttempts,
    ipHash: login.ipHash,
    userAgentSummary: login.userAgentSummary,
    createdAt: login.checkedAt,
    expiresAt,
  });

  return { challengeId, options, expiresAt };
}

export async function verifyAdminPasskeyLogin(input: {
  body: AdminPasskeyAuthenticationVerifyInput;
  challengeToken: string;
  requestMetadata: AdminRequestMetadata;
}): Promise<{
  result: IssuedAdminSessionResult;
  security: {
    mfaEnabled: boolean;
    mfaRequiredByPolicy: boolean;
    passkeysConfigured: boolean;
    passkeyCount: number;
    recoveryCodesRemaining: number;
    mfaEnabledAt: Date | null;
  };
}> {
  const authentication =
    adminPasskeyAuthenticationVerifyInputSchema.parse(input.body);
  const configuration = getAdminWebAuthnConfiguration();
  await initializeAdminStorage();
  const login = await resolveLoginChallenge(input);
  const challenge = await findAdminPasskeyChallenge({
    publicId: authentication.challengeId,
    purpose: "login",
    userId: login.challenge.userId,
    parentMfaChallengeId: login.challenge._id,
  });

  if (
    !challenge ||
    !challengeIsUsable({
      challenge,
      checkedAt: login.checkedAt,
      ipHash: login.ipHash,
      userAgentSummary: login.userAgentSummary,
    })
  ) {
    throw new AdminPasskeyVerificationError(
      "The passkey request expired. Try again or use another method.",
    );
  }

  const [user, credential] = await Promise.all([
    findActiveUserById(login.challenge.userId),
    findActiveAdminPasskeyByCredentialId({
      userId: login.challenge.userId,
      credentialId: String(authentication.response.id ?? ""),
    }),
  ]);

  if (!user || !user.roles.includes("admin") || !credential) {
    return failPasskeyChallenge({
      challenge,
      checkedAt: login.checkedAt,
      userId: login.challenge.userId,
      ipHash: login.ipHash,
      userAgentSummary: login.userAgentSummary,
      reason: "credential-not-owned",
      loginChallengeId: login.challenge._id,
    });
  }

  let verification;

  try {
    verification = await verifyAuthenticationResponse({
      response:
        authentication.response as unknown as AuthenticationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: configuration.origin,
      expectedRPID: configuration.rpId,
      credential: credentialForVerification(credential),
      requireUserVerification: true,
    });
  } catch {
    return failPasskeyChallenge({
      challenge,
      checkedAt: login.checkedAt,
      userId: user._id,
      ipHash: login.ipHash,
      userAgentSummary: login.userAgentSummary,
      reason: "authentication-verification",
      loginChallengeId: login.challenge._id,
    });
  }

  if (!verification.verified) {
    return failPasskeyChallenge({
      challenge,
      checkedAt: login.checkedAt,
      userId: user._id,
      ipHash: login.ipHash,
      userAgentSummary: login.userAgentSummary,
      reason: "authentication-not-verified",
      loginChallengeId: login.challenge._id,
    });
  }

  const client = await getMongoClient();
  const mongoSession = client.startSession();

  try {
    await mongoSession.withTransaction(async () => {
      // The Node.js driver does not support parallel operations inside one
      // transaction. Consume both single-use challenges sequentially so the
      // transaction either commits both changes or rolls both changes back.
      const passkeyConsumed = await consumeAdminPasskeyChallenge(
        challenge._id,
        login.checkedAt,
        mongoSession,
      );
      const loginConsumed = await consumeAdminMfaChallenge(
        login.challenge._id,
        login.checkedAt,
        mongoSession,
      );

      if (!passkeyConsumed || !loginConsumed) {
        throw new AdminPasskeyVerificationError(
          "The administrator verification request expired. Sign in again.",
        );
      }

      const updated = await updateAdminPasskeyUsage(
        {
          credentialDocumentId: credential._id,
          userId: user._id,
          expectedCounter: credential.counter,
          newCounter: verification.authenticationInfo.newCounter,
          deviceType: verification.authenticationInfo.credentialDeviceType,
          backedUp: verification.authenticationInfo.credentialBackedUp,
          usedAt: login.checkedAt,
        },
        mongoSession,
      );

      if (!updated) {
        throw new AdminPasskeyVerificationError(
          "The passkey state changed. Sign in again.",
        );
      }

    }, ADMIN_PASSKEY_TRANSACTION_OPTIONS);
  } finally {
    await mongoSession.endSession();
  }

  const result = await issueAdminSession({
    user,
    accessLevel: "full",
    mfaVerifiedAt: login.checkedAt,
    authenticatedAt: login.checkedAt,
    ipHash: login.ipHash,
    userAgentSummary: login.userAgentSummary,
    authenticationMethod: "password-and-passkey",
  });
  const [factor, passkeyCount] = await Promise.all([
    findAdminMfaFactorByUserId(user._id),
    countActiveAdminPasskeys(user._id),
  ]);
  const recoveryCodesRemaining = await getAdminRecoveryCodeCount(
    user._id,
    factor,
  );

  await recordPasskeyAudit({
    actorUserId: user._id,
    eventType: "admin-passkey-authentication-succeeded",
    outcome: "success",
    createdAt: login.checkedAt,
    ipHash: login.ipHash,
    userAgentSummary: login.userAgentSummary,
    details: {
      deviceType: verification.authenticationInfo.credentialDeviceType,
      backedUp: verification.authenticationInfo.credentialBackedUp,
    },
  });

  return {
    result,
    security: {
      mfaEnabled: factor !== null,
      mfaRequiredByPolicy: env.ADMIN_MFA_REQUIRED,
      passkeysConfigured: isAdminWebAuthnConfigured(),
      passkeyCount,
      recoveryCodesRemaining,
      mfaEnabledAt: factor?.enabledAt ?? null,
    },
  };
}

export async function startAdminPasskeyReauthentication(input: {
  context: AdminSessionContext;
  requestMetadata: AdminRequestMetadata;
}): Promise<{
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
  expiresAt: Date;
}> {
  const configuration = getAdminWebAuthnConfiguration();
  await initializeAdminStorage();
  const credentials = await listActiveAdminPasskeys(input.context.userId);

  if (credentials.length === 0) {
    throw new AdminPasskeyOperationError(
      "No passkey is registered for this administrator account.",
    );
  }

  const createdAt = new Date();
  const options = await generateAuthenticationOptions({
    rpID: configuration.rpId,
    allowCredentials: credentials.map((credential) => ({
      id: credential.credentialId,
      transports: credentialTransports(credential),
    })),
    userVerification: "required",
    timeout: ADMIN_PASSKEY_POLICY.challengeLifetimeMilliseconds,
  });
  const expiresAt = new Date(
    createdAt.getTime() +
      ADMIN_PASSKEY_POLICY.challengeLifetimeMilliseconds,
  );
  const ipHash = hashAdminIpAddress(input.requestMetadata.ipAddress);
  const userAgentSummary = summarizeAdminUserAgent(
    input.requestMetadata.userAgent,
  );

  await invalidateOpenAdminPasskeyChallenges({
    userId: input.context.userId,
    purpose: "reauthentication",
    sessionId: input.context.sessionId,
    invalidatedAt: createdAt,
  });

  const challengeId = randomUUID();
  await createAdminPasskeyChallenge({
    challengeDocumentId: new ObjectId(),
    publicId: challengeId,
    purpose: "reauthentication",
    userId: input.context.userId,
    sessionId: input.context.sessionId,
    parentMfaChallengeId: null,
    challenge: options.challenge,
    label: null,
    attachment: null,
    maximumAttempts: ADMIN_PASSKEY_POLICY.maximumVerificationAttempts,
    ipHash,
    userAgentSummary,
    createdAt,
    expiresAt,
  });

  return { challengeId, options, expiresAt };
}

export async function verifyAdminPasskeyReauthentication(input: {
  context: AdminSessionContext;
  body: AdminPasskeyAuthenticationVerifyInput;
  requestMetadata: AdminRequestMetadata;
}): Promise<{ authenticatedAt: Date }> {
  const authentication =
    adminPasskeyAuthenticationVerifyInputSchema.parse(input.body);
  const configuration = getAdminWebAuthnConfiguration();
  await initializeAdminStorage();
  const authenticatedAt = new Date();
  const ipHash = hashAdminIpAddress(input.requestMetadata.ipAddress);
  const userAgentSummary = summarizeAdminUserAgent(
    input.requestMetadata.userAgent,
  );
  const challenge = await findAdminPasskeyChallenge({
    publicId: authentication.challengeId,
    purpose: "reauthentication",
    userId: input.context.userId,
    sessionId: input.context.sessionId,
  });

  if (
    !challenge ||
    !challengeIsUsable({
      challenge,
      checkedAt: authenticatedAt,
      ipHash,
      userAgentSummary,
    })
  ) {
    throw new AdminPasskeyVerificationError(
      "The passkey confirmation expired. Start again.",
    );
  }

  const credential = await findActiveAdminPasskeyByCredentialId({
    userId: input.context.userId,
    credentialId: String(authentication.response.id ?? ""),
  });

  if (!credential) {
    return failPasskeyChallenge({
      challenge,
      checkedAt: authenticatedAt,
      userId: input.context.userId,
      ipHash,
      userAgentSummary,
      reason: "credential-not-owned",
    });
  }

  let verification;

  try {
    verification = await verifyAuthenticationResponse({
      response:
        authentication.response as unknown as AuthenticationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: configuration.origin,
      expectedRPID: configuration.rpId,
      credential: credentialForVerification(credential),
      requireUserVerification: true,
    });
  } catch {
    return failPasskeyChallenge({
      challenge,
      checkedAt: authenticatedAt,
      userId: input.context.userId,
      ipHash,
      userAgentSummary,
      reason: "reauthentication-verification",
    });
  }

  if (!verification.verified) {
    return failPasskeyChallenge({
      challenge,
      checkedAt: authenticatedAt,
      userId: input.context.userId,
      ipHash,
      userAgentSummary,
      reason: "reauthentication-not-verified",
    });
  }

  const client = await getMongoClient();
  const mongoSession = client.startSession();

  try {
    await mongoSession.withTransaction(async () => {
      const consumed = await consumeAdminPasskeyChallenge(
        challenge._id,
        authenticatedAt,
        mongoSession,
      );

      if (!consumed) {
        throw new AdminPasskeyVerificationError(
          "The passkey confirmation expired. Start again.",
        );
      }

      const credentialUpdated = await updateAdminPasskeyUsage(
        {
          credentialDocumentId: credential._id,
          userId: input.context.userId,
          expectedCounter: credential.counter,
          newCounter: verification.authenticationInfo.newCounter,
          deviceType: verification.authenticationInfo.credentialDeviceType,
          backedUp: verification.authenticationInfo.credentialBackedUp,
          usedAt: authenticatedAt,
        },
        mongoSession,
      );

      if (!credentialUpdated) {
        throw new AdminPasskeyVerificationError(
          "The passkey state changed. Start again.",
        );
      }

      const sessionUpdated = await updateAdminRecentAuthentication(
        {
          sessionId: input.context.sessionId,
          authenticatedAt,
        },
        mongoSession,
      );

      if (!sessionUpdated) {
        throw new AdminPersistenceError(
          "Recent administrator authentication could not be recorded.",
        );
      }

      await recordPasskeyAudit({
        actorUserId: input.context.userId,
        eventType: "admin-passkey-used-for-reauthentication",
        outcome: "success",
        createdAt: authenticatedAt,
        ipHash,
        userAgentSummary,
        details: {
          deviceType: verification.authenticationInfo.credentialDeviceType,
          backedUp: verification.authenticationInfo.credentialBackedUp,
        },
        session: mongoSession,
      });
    }, ADMIN_PASSKEY_TRANSACTION_OPTIONS);
  } finally {
    await mongoSession.endSession();
  }

  return { authenticatedAt };
}

export async function revokeAdministratorPasskey(input: {
  context: AdminSessionContext;
  credentialId: string;
  requestMetadata: AdminRequestMetadata;
}): Promise<{
  revokedAt: Date;
  remainingPasskeys: number;
  revokedOtherSessions: number;
}> {
  const credentialId = adminPasskeyCredentialIdSchema.parse(
    input.credentialId,
  );
  await initializeAdminStorage();

  const existingCredential = await findActiveAdminPasskeyByCredentialId({
    userId: input.context.userId,
    credentialId,
  });

  if (!existingCredential) {
    throw new AdminPasskeyOperationError(
      "The selected passkey was not found.",
    );
  }

  const revokedAt = new Date();
  const ipHash = hashAdminIpAddress(input.requestMetadata.ipAddress);
  const userAgentSummary = summarizeAdminUserAgent(
    input.requestMetadata.userAgent,
  );
  const client = await getMongoClient();
  const mongoSession = client.startSession();
  let revokedOtherSessions = 0;
  let remainingPasskeys = 0;

  try {
    await mongoSession.withTransaction(async () => {
      await bumpAdminSecurityRevision({
        userId: input.context.userId,
        changedAt: revokedAt,
        session: mongoSession,
      });

      // Keep all operations on this transaction session sequential.
      const credential = await findActiveAdminPasskeyByCredentialId(
        { userId: input.context.userId, credentialId },
        mongoSession,
      );
      const passkeyCount = await countActiveAdminPasskeys(
        input.context.userId,
        mongoSession,
      );
      const factor = await findAdminMfaFactorByUserId(
        input.context.userId,
        mongoSession,
      );

      if (!credential) {
        throw new AdminPasskeyOperationError(
          "The selected passkey is no longer active.",
        );
      }

      if (passkeyCount <= 1 && !factor) {
        throw new AdminPasskeyOperationError(
          "You cannot remove the final strong administrator verification method. Set up an authenticator app or another passkey first.",
        );
      }

      const revoked = await revokeAdminPasskeyCredential(
        {
          userId: input.context.userId,
          credentialId,
          revokedAt,
        },
        mongoSession,
      );

      if (!revoked) {
        throw new AdminPasskeyOperationError(
          "The selected passkey is no longer active.",
        );
      }

      remainingPasskeys = passkeyCount - 1;

      revokedOtherSessions = await revokeOtherAdminSessionsForUser(
        {
          userId: input.context.userId,
          exceptSessionId: input.context.sessionId,
          revokedAt,
          reason: "security-event",
        },
        mongoSession,
      );

      await recordPasskeyAudit({
        actorUserId: input.context.userId,
        eventType: "admin-passkey-revoked",
        outcome: "success",
        createdAt: revokedAt,
        ipHash,
        userAgentSummary,
        details: {
          remainingPasskeys,
          revokedOtherSessions,
          deviceType: credential.deviceType,
          backedUp: credential.backedUp,
        },
        session: mongoSession,
      });
    }, ADMIN_PASSKEY_TRANSACTION_OPTIONS);
  } finally {
    await mongoSession.endSession();
  }

  return {
    revokedAt,
    remainingPasskeys,
    revokedOtherSessions,
  };
}
