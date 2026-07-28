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
  AuthSessionDocument,
} from "../auth.types.js";

export interface CreateAuthSessionInput {
  sessionId: ObjectId;
  userId: ObjectId;

  tokenHash: string;
  csrfSecretHash: string;

  userAgentSummary: string | null;
  ipHash: string | null;

  createdAt: Date;
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
      authProvider: "local",

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
