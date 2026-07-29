import {
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import type {
  CookieOptions,
  Request,
  Response,
} from "express";

import { env } from "../../config/env.js";
import {
  AUTH_SESSION_POLICY,
} from "./auth.constants.js";

export interface AuthRequestMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface PreparedAuthSessionSecrets {
  sessionToken: string;
  tokenHash: string;
  csrfSecretHash: string;
}

const BASE64URL_PATTERN =
  /^[A-Za-z0-9_-]+$/u;

function createScopedSessionDigest(
  scope: string,
  value: string,
): string {
  return createHmac(
    "sha256",
    env.AUTH_SESSION_PEPPER,
  )
    .update(scope)
    .update("\0")
    .update(value)
    .digest("base64url");
}

function timingSafeTextEqual(
  left: string,
  right: string,
): boolean {
  const leftBuffer =
    Buffer.from(left, "utf8");

  const rightBuffer =
    Buffer.from(right, "utf8");

  if (
    leftBuffer.length !==
    rightBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    leftBuffer,
    rightBuffer,
  );
}

export function hashAuthSessionToken(
  sessionToken: string,
): string {
  return createScopedSessionDigest(
    "filmgeezer-session-token",
    sessionToken,
  );
}

export function deriveAuthCsrfSecret(
  sessionToken: string,
): string {
  return createScopedSessionDigest(
    "filmgeezer-session-csrf-secret",
    sessionToken,
  );
}

export function hashAuthCsrfSecret(
  csrfSecret: string,
): string {
  return createScopedSessionDigest(
    "filmgeezer-session-csrf-hash",
    csrfSecret,
  );
}

export function verifyAuthCsrfToken(
  candidateToken: string,
  storedSecretHash: string,
): boolean {
  if (
    candidateToken.length !== 43 ||
    !BASE64URL_PATTERN.test(
      candidateToken,
    )
  ) {
    return false;
  }

  const candidateHash =
    hashAuthCsrfSecret(
      candidateToken,
    );

  return timingSafeTextEqual(
    candidateHash,
    storedSecretHash,
  );
}

export function createAuthSessionSecrets():
  PreparedAuthSessionSecrets {
  const sessionToken = randomBytes(
    AUTH_SESSION_POLICY.tokenBytes,
  ).toString("base64url");

  const csrfSecret =
    deriveAuthCsrfSecret(sessionToken);

  return {
    sessionToken,

    tokenHash:
      hashAuthSessionToken(
        sessionToken,
      ),

    csrfSecretHash:
      hashAuthCsrfSecret(
        csrfSecret,
      ),
  };
}

export function isValidAuthSessionTokenFormat(
  sessionToken: string,
): boolean {
  return (
    sessionToken.length ===
      AUTH_SESSION_POLICY
        .tokenCharacterLength &&
    BASE64URL_PATTERN.test(
      sessionToken,
    )
  );
}

export function hashAuthIpAddress(
  ipAddress: string | null,
): string | null {
  const normalizedIpAddress =
    ipAddress?.trim();

  if (!normalizedIpAddress) {
    return null;
  }

  return createScopedSessionDigest(
    "filmgeezer-auth-ip",
    normalizedIpAddress,
  );
}

export function summarizeAuthUserAgent(
  userAgent: string | null,
): string | null {
  const normalizedUserAgent = userAgent
    ?.replace(/\s+/gu, " ")
    .trim();

  if (!normalizedUserAgent) {
    return null;
  }

  return normalizedUserAgent.slice(
    0,
    AUTH_SESSION_POLICY
      .userAgentMaximumLength,
  );
}

export function getAuthSessionCookieName():
  string {
  return env.NODE_ENV === "production"
    ? AUTH_SESSION_POLICY
        .productionCookieName
    : AUTH_SESSION_POLICY
        .developmentCookieName;
}

function createAuthSessionCookieOptions(
  expiresAt?: Date,
): CookieOptions {
  return {
    httpOnly: true,
    secure:
      env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(expiresAt
      ? {
          expires: expiresAt,
        }
      : {}),
  };
}

export function setAuthSessionCookie(
  response: Response,
  sessionToken: string,
  expiresAt: Date,
): void {
  response.cookie(
    getAuthSessionCookieName(),
    sessionToken,
    createAuthSessionCookieOptions(
      expiresAt,
    ),
  );
}

export function clearAuthSessionCookie(
  response: Response,
): void {
  response.clearCookie(
    getAuthSessionCookieName(),
    createAuthSessionCookieOptions(),
  );
}

export function readAuthSessionToken(
  request: Request,
): string | null {
  const cookieHeader =
    request.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookieName =
    getAuthSessionCookieName();

  const matchingValues: string[] = [];

  for (
    const cookiePart of
    cookieHeader.split(";")
  ) {
    const separatorIndex =
      cookiePart.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const name = cookiePart
      .slice(0, separatorIndex)
      .trim();

    if (name !== cookieName) {
      continue;
    }

    const rawValue = cookiePart
      .slice(separatorIndex + 1)
      .trim();

    try {
      matchingValues.push(
        decodeURIComponent(rawValue),
      );
    } catch {
      return null;
    }
  }

  /*
   * Reject duplicate session cookies instead of guessing which one the
   * browser or a reverse proxy intended to use.
   */
  if (matchingValues.length !== 1) {
    return null;
  }

  const [sessionToken] =
    matchingValues;

  return sessionToken &&
    isValidAuthSessionTokenFormat(
      sessionToken,
    )
    ? sessionToken
    : null;
}