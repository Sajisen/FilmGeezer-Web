import {
  createHmac,
  randomBytes,
} from "node:crypto";

import type {
  CookieOptions,
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
  expiresAt: Date,
): CookieOptions {
  return {
    httpOnly: true,
    secure:
      env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
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
