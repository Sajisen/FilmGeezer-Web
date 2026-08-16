import {
  ObjectId,
  type ClientSession,
} from "mongodb";

import {
  AUTH_SCHEMA_VERSION,
  AUTH_SESSION_POLICY,
} from "../auth.constants.js";

import {
  getAuthCollections,
} from "../auth.collections.js";

import type {
  AuthProvider,
  AuthSessionDocument,
  AuthSessionRevocationReason,
} from "../auth.types.js";

export interface CreateAuthSessionInput {
  sessionId: ObjectId;
  userId: ObjectId;
  authProvider: AuthProvider;

  tokenHash: string;
  csrfSecretHash: string;

  userAgentSummary: string | null;
  ipHash: string | null;

  createdAt: Date;
  recentAuthenticationAt?: Date | null;
  recentAuthenticationMethod?: "password" | "google" | null;
  expiresAt: Date;
}

export async function createAuthSession(
  input: CreateAuthSessionInput,
  session: ClientSession,
): Promise<AuthSessionDocument> {
  const { sessions } =
    await getAuthCollections();

  const authSession:
    AuthSessionDocument = {
      _id: input.sessionId,
      schemaVersion:
        AUTH_SCHEMA_VERSION,

      userId: input.userId,
      authProvider: input.authProvider,

      tokenHash:
        input.tokenHash,
      csrfSecretHash:
        input.csrfSecretHash,

      userAgentSummary:
        input.userAgentSummary,
      ipHash:
        input.ipHash,

      createdAt: input.createdAt,
      lastSeenAt: input.createdAt,
      recentAuthenticationAt:
        input.recentAuthenticationAt ?? null,
      expiresAt: input.expiresAt,

      revokedAt: null,
      revocationReason: null,
    };

  await sessions.insertOne(
    authSession,
    {
      session,
    },
  );

  return authSession;
}

export async function findAuthSessionByTokenHash(
  tokenHash: string,
): Promise<AuthSessionDocument | null> {
  const { sessions } =
    await getAuthCollections();

  return sessions.findOne({
    tokenHash,
  });
}

export interface TouchAuthSessionInput {
  sessionId: ObjectId;
  touchedAt: Date;
}

export async function touchAuthSession(
  input: TouchAuthSessionInput,
): Promise<boolean> {
  const { sessions } =
    await getAuthCollections();

  const result =
    await sessions.updateOne(
      {
        _id: input.sessionId,
        revokedAt: null,
        expiresAt: {
          $gt: input.touchedAt,
        },
        lastSeenAt: {
          $lte: new Date(
            input.touchedAt.getTime() -
              AUTH_SESSION_POLICY
                .activityTouchIntervalMilliseconds,
          ),
        },
      },
      {
        $set: {
          lastSeenAt:
            input.touchedAt,
        },
      },
    );

  return result.modifiedCount === 1;
}

export interface RevokeAuthSessionInput {
  sessionId: ObjectId;
  userId: ObjectId;
  revokedAt: Date;
  reason:
    AuthSessionRevocationReason;
}

export async function revokeAuthSession(
  input: RevokeAuthSessionInput,
  session?: ClientSession,
): Promise<boolean> {
  const { sessions } =
    await getAuthCollections();

  const result =
    await sessions.updateOne(
      {
        _id: input.sessionId,
        userId: input.userId,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt:
            input.revokedAt,
          revocationReason:
            input.reason,
        },
      },
      session
        ? {
            session,
          }
        : undefined,
    );

  return result.modifiedCount === 1;
}

export interface RevokeAllActiveAuthSessionsInput {
  userId: ObjectId;
  revokedAt: Date;
  reason:
    AuthSessionRevocationReason;
}

export async function revokeAllActiveAuthSessions(
  input:
    RevokeAllActiveAuthSessionsInput,
  session: ClientSession,
): Promise<number> {
  const { sessions } =
    await getAuthCollections();

  const result =
    await sessions.updateMany(
      {
        userId: input.userId,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt:
            input.revokedAt,
          revocationReason:
            input.reason,
        },
      },
      {
        session,
      },
    );

  return result.modifiedCount;
}

export interface MakeRoomForNewSessionInput {
  userId: ObjectId;
  createdAt: Date;
}

export async function makeRoomForNewSession(
  input: MakeRoomForNewSessionInput,
  session: ClientSession,
): Promise<number> {
  const { sessions } =
    await getAuthCollections();

  /*
   * The login transaction first writes the same user document for every
   * successful login. That serializes concurrent logins for the user, so
   * this query can enforce the active-session limit consistently.
   */
  const activeSessions =
    await sessions
      .find(
        {
          userId: input.userId,
          revokedAt: null,
          expiresAt: {
            $gt: input.createdAt,
          },
        },
        {
          session,
          projection: {
            _id: 1,
          },
        },
      )
      .sort({
        createdAt: 1,
        _id: 1,
      })
      .toArray();

  const maximumExistingSessions =
    Math.max(
      0,
      AUTH_SESSION_POLICY
        .maximumActiveSessionsPerUser - 1,
    );

  const numberToRevoke = Math.max(
    0,
    activeSessions.length -
      maximumExistingSessions,
  );

  if (numberToRevoke === 0) {
    return 0;
  }

  const sessionIdsToRevoke =
    activeSessions
      .slice(0, numberToRevoke)
      .map(
        (authSession) =>
          authSession._id,
      );

  const result =
    await sessions.updateMany(
      {
        _id: {
          $in:
            sessionIdsToRevoke,
        },
        userId: input.userId,
        revokedAt: null,
      },
      {
        $set: {
          revokedAt:
            input.createdAt,
          revocationReason:
            "session-limit",
        },
      },
      {
        session,
      },
    );

  return result.modifiedCount;
}

export interface RecordRecentAuthenticationInput {
  sessionId: ObjectId;
  userId: ObjectId;
  confirmedAt: Date;
  method: "password" | "google";
}

export async function recordRecentAuthentication(
  input: RecordRecentAuthenticationInput,
  session?: ClientSession,
): Promise<boolean> {
  const { sessions } =
    await getAuthCollections();

  const result =
    await sessions.updateOne(
      {
        _id: input.sessionId,
        userId: input.userId,
        revokedAt: null,
        expiresAt: {
          $gt: input.confirmedAt,
        },
      },
      {
        $set: {
          recentAuthenticationAt:
            input.confirmedAt,
          recentAuthenticationMethod:
            input.method,
        },
      },
      session
        ? {
            session,
          }
        : undefined,
    );

  return result.matchedCount === 1;
}

export async function revokeActiveAuthSessionsByProvider(
  input: {
    userId: ObjectId;
    provider: AuthProvider;
    revokedAt: Date;
  },
  session: ClientSession,
): Promise<number> {
  const { sessions } = await getAuthCollections();

  const result = await sessions.updateMany(
    {
      userId: input.userId,
      authProvider: input.provider,
      revokedAt: null,
      expiresAt: { $gt: input.revokedAt },
    },
    {
      $set: {
        revokedAt: input.revokedAt,
        revocationReason: "provider-migration",
      },
    },
    { session },
  );

  return result.modifiedCount;
}

export interface ListActiveAuthSessionsInput {
  userId: ObjectId;
  checkedAt: Date;
}

export async function listActiveAuthSessions(
  input: ListActiveAuthSessionsInput,
): Promise<AuthSessionDocument[]> {
  const { sessions } =
    await getAuthCollections();

  const idleThreshold = new Date(
    input.checkedAt.getTime() -
      AUTH_SESSION_POLICY
        .idleTimeoutMilliseconds,
  );

  return sessions
    .find({
      userId: input.userId,
      revokedAt: null,
      expiresAt: {
        $gt: input.checkedAt,
      },
      lastSeenAt: {
        $gt: idleThreshold,
      },
    })
    .sort({
      lastSeenAt: -1,
      createdAt: -1,
      _id: -1,
    })
    .toArray();
}
