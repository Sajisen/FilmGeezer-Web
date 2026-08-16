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
  AuthProvider,
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

export interface PreparedAuthSession {
  sessionId: ObjectId;

  sessionToken: string;
  tokenHash: string;
  csrfSecretHash: string;

  ipHash: string | null;
  userAgentSummary: string | null;

  createdAt: Date;
  expiresAt: Date;
}

export interface AuthSessionResult {
  user: {
    userId: string;
    provider: AuthProvider;
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

type SessionUser = Pick<
  FilmGeezerUserDocument,
  | "_id"
  | "emailDisplay"
  | "displayName"
  | "profileImage"
  | "roles"
>;

export function prepareAuthSession(
  requestMetadata: AuthRequestMetadata,
  createdAt: Date,
): PreparedAuthSession {
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

export async function createPreparedAuthSession(
  userId: ObjectId,
  provider: AuthProvider,
  preparedSession: PreparedAuthSession,
  session: ClientSession,
  recentAuthenticationAt: Date | null = null,
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
      authProvider: provider,

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

      recentAuthenticationAt,

      expiresAt:
        preparedSession.expiresAt,
    },
    session,
  );

  return sessionsRevokedForLimit;
}

export function createAuthSessionResult(
  user: SessionUser,
  provider: AuthProvider,
  preparedSession: PreparedAuthSession,
): AuthSessionResult {
  return {
    user: {
      userId:
        user._id.toHexString(),

      provider,

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

/*
 * Compatibility wrappers keep the mature local-auth call sites focused while
 * the shared session machinery remains provider-neutral for Google and any
 * future authentication provider.
 */
export type PreparedLocalAuthSession = PreparedAuthSession;
export type LocalAuthSessionResult = AuthSessionResult & {
  user: AuthSessionResult["user"] & {
    provider: "local";
  };
};

export const prepareLocalAuthSession = prepareAuthSession;

export async function createPreparedLocalAuthSession(
  userId: ObjectId,
  preparedSession: PreparedLocalAuthSession,
  session: ClientSession,
): Promise<number> {
  return createPreparedAuthSession(
    userId,
    "local",
    preparedSession,
    session,
  );
}

export function createLocalAuthSessionResult(
  user: SessionUser,
  preparedSession: PreparedLocalAuthSession,
): LocalAuthSessionResult {
  return createAuthSessionResult(
    user,
    "local",
    preparedSession,
  ) as LocalAuthSessionResult;
}
