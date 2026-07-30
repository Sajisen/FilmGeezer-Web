import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  getMongoClient,
} from "../../config/database.js";

import {
  AUTH_SESSION_POLICY,
} from "../auth/auth.constants.js";

import {
  AuthPersistenceError,
  AuthSessionManagementError,
} from "../auth/auth.errors.js";

import {
  createAuthSessionReference,
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  verifyAuthSessionReference,
  type AuthRequestMetadata,
} from "../auth/auth.session.js";

import type {
  AuthSessionDocument,
} from "../auth/auth.types.js";

import {
  parseAccountSessionReference,
} from "../auth/auth.validation.js";

import {
  createAuthAuditEvent,
} from "../auth/repositories/authAudit.repository.js";

import {
  listActiveAuthSessions,
  revokeAuthSession,
} from "../auth/repositories/authSession.repository.js";

import type {
  AuthenticatedSessionContext,
} from "../auth/auth.session.service.js";

const ACCOUNT_SESSION_TRANSACTION_OPTIONS:
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

export type AccountSessionDeviceType =
  | "computer"
  | "phone"
  | "tablet"
  | "unknown";

export interface AccountSessionSummary {
  sessionReference: string;
  current: boolean;

  device: {
    type: AccountSessionDeviceType;
    label: string;
    browser: string;
    platform: string;
  };

  createdAt: Date;
  lastSeenAt: Date;
  idleExpiresAt: Date;
  expiresAt: Date;
}

export interface AccountSessionsResult {
  sessions: AccountSessionSummary[];
  maximumActiveSessions: number;
}

export interface RevokeAccountSessionResult {
  sessionReference: string;
  revokedAt: Date;
}

interface DescribedUserAgent {
  type: AccountSessionDeviceType;
  label: string;
  browser: string;
  platform: string;
}

function identifyBrowser(
  userAgent: string,
): string {
  if (/Edg\//iu.test(userAgent)) {
    return "Microsoft Edge";
  }

  if (/OPR\//iu.test(userAgent)) {
    return "Opera";
  }

  if (/Firefox\//iu.test(userAgent)) {
    return "Firefox";
  }

  if (
    /Chrome\//iu.test(userAgent) ||
    /CriOS\//iu.test(userAgent)
  ) {
    return "Chrome";
  }

  if (
    /Safari\//iu.test(userAgent) &&
    /Version\//iu.test(userAgent)
  ) {
    return "Safari";
  }

  return "Unknown browser";
}

function identifyPlatform(
  userAgent: string,
): string {
  if (/Windows NT/iu.test(userAgent)) {
    return "Windows";
  }

  if (/Android/iu.test(userAgent)) {
    return "Android";
  }

  if (/iPhone|iPod/iu.test(userAgent)) {
    return "iPhone";
  }

  if (/iPad/iu.test(userAgent)) {
    return "iPad";
  }

  if (/Macintosh|Mac OS X/iu.test(userAgent)) {
    return "macOS";
  }

  if (/Linux/iu.test(userAgent)) {
    return "Linux";
  }

  return "Unknown platform";
}

function identifyDeviceType(
  userAgent: string,
): AccountSessionDeviceType {
  if (/iPad|Tablet/iu.test(userAgent)) {
    return "tablet";
  }

  if (/Mobile|iPhone|iPod/iu.test(userAgent)) {
    return "phone";
  }

  if (/Android/iu.test(userAgent)) {
    return /Mobile/iu.test(userAgent)
      ? "phone"
      : "tablet";
  }

  if (
    /Windows NT|Macintosh|Mac OS X|Linux/iu.test(
      userAgent,
    )
  ) {
    return "computer";
  }

  return "unknown";
}

function describeUserAgent(
  userAgentSummary: string | null,
): DescribedUserAgent {
  if (!userAgentSummary) {
    return {
      type: "unknown",
      label: "Unknown device",
      browser: "Unknown browser",
      platform: "Unknown platform",
    };
  }

  const browser = identifyBrowser(
    userAgentSummary,
  );

  const platform = identifyPlatform(
    userAgentSummary,
  );

  const type = identifyDeviceType(
    userAgentSummary,
  );

  return {
    type,
    browser,
    platform,
    label:
      browser === "Unknown browser" &&
      platform === "Unknown platform"
        ? "Unknown device"
        : `${browser} on ${platform}`,
  };
}

function createAccountSessionSummary(
  authSession: AuthSessionDocument,
  currentSessionId: ObjectId,
): AccountSessionSummary {
  return {
    sessionReference:
      createAuthSessionReference(
        authSession._id,
      ),

    current:
      authSession._id.equals(
        currentSessionId,
      ),

    device: describeUserAgent(
      authSession.userAgentSummary,
    ),

    createdAt:
      authSession.createdAt,

    lastSeenAt:
      authSession.lastSeenAt,

    idleExpiresAt: new Date(
      authSession.lastSeenAt.getTime() +
        AUTH_SESSION_POLICY
          .idleTimeoutMilliseconds,
    ),

    expiresAt:
      authSession.expiresAt,
  };
}

function createAuditMetadata(
  requestMetadata: AuthRequestMetadata,
) {
  return {
    ipHash: hashAuthIpAddress(
      requestMetadata.ipAddress,
    ),

    userAgentSummary:
      summarizeAuthUserAgent(
        requestMetadata.userAgent,
      ),
  };
}

export async function getAccountSessions(
  auth: AuthenticatedSessionContext,
): Promise<AccountSessionsResult> {
  const checkedAt = new Date();

  const authSessions =
    await listActiveAuthSessions({
      userId: auth.userId,
      checkedAt,
    });

  const sessions = authSessions
    .map((authSession) =>
      createAccountSessionSummary(
        authSession,
        auth.sessionId,
      ),
    )
    .sort((left, right) => {
      if (left.current !== right.current) {
        return left.current ? -1 : 1;
      }

      return (
        right.lastSeenAt.getTime() -
        left.lastSeenAt.getTime()
      );
    });

  return {
    sessions,

    maximumActiveSessions:
      AUTH_SESSION_POLICY
        .maximumActiveSessionsPerUser,
  };
}

export async function revokeAccountSession(
  sessionReferenceInput: unknown,
  auth: AuthenticatedSessionContext,
  requestMetadata: AuthRequestMetadata,
): Promise<RevokeAccountSessionResult> {
  const sessionReference =
    parseAccountSessionReference(
      sessionReferenceInput,
    );

  if (
    verifyAuthSessionReference(
      sessionReference,
      auth.sessionId,
    )
  ) {
    throw new AuthSessionManagementError(
      "current-session",
    );
  }

  const revokedAt = new Date();

  const activeSessions =
    await listActiveAuthSessions({
      userId: auth.userId,
      checkedAt: revokedAt,
    });

  const targetSession =
    activeSessions.find(
      (candidate) =>
        verifyAuthSessionReference(
          sessionReference,
          candidate._id,
        ),
    );

  if (!targetSession) {
    throw new AuthSessionManagementError(
      "not-found",
    );
  }

  const auditMetadata =
    createAuditMetadata(
      requestMetadata,
    );

  const auditEventId =
    new ObjectId();

  const client =
    await getMongoClient();

  const transactionSession =
    client.startSession();

  try {
    await transactionSession.withTransaction(
      async () => {
        const wasRevoked =
          await revokeAuthSession(
            {
              sessionId:
                targetSession._id,

              userId:
                auth.userId,

              revokedAt,

              reason:
                "user-revoked",
            },
            transactionSession,
          );

        if (!wasRevoked) {
          throw new AuthSessionManagementError(
            "not-found",
          );
        }

        await createAuthAuditEvent(
          {
            auditEventId,
            userId: auth.userId,
            eventType:
              "session-revoked",
            outcome: "success",
            ...auditMetadata,
            details: {
              reason:
                "user-revoked",

              sessionReference,
            },
            createdAt: revokedAt,
          },
          transactionSession,
        );
      },
      ACCOUNT_SESSION_TRANSACTION_OPTIONS,
    );

    return {
      sessionReference,
      revokedAt,
    };
  } catch (error) {
    if (
      error instanceof
      AuthSessionManagementError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The selected FilmGeezer session could not be revoked.",
      {
        cause: error,
      },
    );
  } finally {
    await transactionSession.endSession();
  }
}
