import {
  ObjectId,
  type ClientSession,
} from "mongodb";

import {
  AUTH_SESSION_POLICY,
} from "./auth.constants.js";

import {
  createAuthSessionSecrets,
  hashAuthIpAddress,
  summarizeAuthUserAgent,
  type AuthRequestMetadata,
} from "./auth.session.js";

import type {
  AuthRole,
  FilmGeezerUserDocument,
} from "./auth.types.js";

import {
  createAuthSession,
  makeRoomForNewSession,
} from "./repositories/authSession.repository.js";

import {
  createProfileImagePath,
} from "../profile-image/profileImage.path.js";

export interface PreparedLocalAuthSession {
  sessionId: ObjectId;

  sessionToken: string;
  tokenHash: string;
  csrfSecretHash: string;

  ipHash: string | null;
  userAgentSummary: string | null;

  createdAt: Date;
  expiresAt: Date;
}

export interface LocalAuthSessionResult {
  user: {
    userId: string;
    provider: "local";
    email: string;
    displayName: string;
    profileImagePath: string | null;
    roles: AuthRole[];
  };

  session: {
    token: string;
    expiresAt: Date;
  };
}

type LocalSessionUser = Pick<
  FilmGeezerUserDocument,
  | "_id"
  | "emailDisplay"
  | "displayName"
  | "profileImage"
  | "roles"
>;

export function prepareLocalAuthSession(
  requestMetadata: AuthRequestMetadata,
  createdAt: Date,
): PreparedLocalAuthSession {
  const secrets =
    createAuthSessionSecrets();

  return {
    sessionId: new ObjectId(),

    sessionToken:
      secrets.sessionToken,

    tokenHash:
      secrets.tokenHash,

    csrfSecretHash:
      secrets.csrfSecretHash,

    ipHash:
      hashAuthIpAddress(
        requestMetadata.ipAddress,
      ),

    userAgentSummary:
      summarizeAuthUserAgent(
        requestMetadata.userAgent,
      ),

    createdAt,

    expiresAt: new Date(
      createdAt.getTime() +
        AUTH_SESSION_POLICY
          .absoluteLifetimeMilliseconds,
    ),
  };
}

export async function createPreparedLocalAuthSession(
  userId: ObjectId,
  preparedSession: PreparedLocalAuthSession,
  session: ClientSession,
): Promise<number> {
  const sessionsRevokedForLimit =
    await makeRoomForNewSession(
      {
        userId,
        createdAt:
          preparedSession.createdAt,
      },
      session,
    );

  await createAuthSession(
    {
      sessionId:
        preparedSession.sessionId,

      userId,

      tokenHash:
        preparedSession.tokenHash,

      csrfSecretHash:
        preparedSession
          .csrfSecretHash,

      userAgentSummary:
        preparedSession
          .userAgentSummary,

      ipHash:
        preparedSession.ipHash,

      createdAt:
        preparedSession.createdAt,

      expiresAt:
        preparedSession.expiresAt,
    },
    session,
  );

  return sessionsRevokedForLimit;
}

export function createLocalAuthSessionResult(
  user: LocalSessionUser,
  preparedSession: PreparedLocalAuthSession,
): LocalAuthSessionResult {
  return {
    user: {
      userId:
        user._id.toHexString(),

      provider: "local",

      email:
        user.emailDisplay,

      displayName:
        user.displayName,

      profileImagePath:
        createProfileImagePath(user),

      roles:
        [...user.roles],
    },

    session: {
      token:
        preparedSession.sessionToken,

      expiresAt:
        preparedSession.expiresAt,
    },
  };
}