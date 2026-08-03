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
import { ADMIN_SESSION_POLICY } from "./admin.constants.js";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/u;

function createAdminDigest(scope: string, value: string): string {
  return createHmac("sha256", env.AUTH_SESSION_PEPPER)
    .update(scope)
    .update("\0")
    .update(value)
    .digest("base64url");
}

function timingSafeTextEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function createAdminSessionSecrets() {
  const sessionToken = randomBytes(
    ADMIN_SESSION_POLICY.tokenBytes,
  ).toString("base64url");

  const csrfToken = deriveAdminCsrfToken(sessionToken);

  return {
    sessionToken,
    tokenHash: hashAdminSessionToken(sessionToken),
    csrfToken,
    csrfSecretHash: hashAdminCsrfToken(csrfToken),
  };
}

export function hashAdminSessionToken(sessionToken: string): string {
  return createAdminDigest(
    "filmgeezer-admin-session-token",
    sessionToken,
  );
}

export function deriveAdminCsrfToken(sessionToken: string): string {
  return createAdminDigest(
    "filmgeezer-admin-session-csrf-secret",
    sessionToken,
  );
}

export function hashAdminCsrfToken(csrfToken: string): string {
  return createAdminDigest(
    "filmgeezer-admin-session-csrf-hash",
    csrfToken,
  );
}

export function verifyAdminCsrfToken(
  candidateToken: string,
  storedSecretHash: string,
): boolean {
  if (
    candidateToken.length !== ADMIN_SESSION_POLICY.tokenCharacterLength ||
    !BASE64URL_PATTERN.test(candidateToken)
  ) {
    return false;
  }

  return timingSafeTextEqual(
    hashAdminCsrfToken(candidateToken),
    storedSecretHash,
  );
}

export function hashAdminIpAddress(
  ipAddress: string | null,
): string | null {
  const normalized = ipAddress?.trim();

  return normalized
    ? createAdminDigest("filmgeezer-admin-ip", normalized)
    : null;
}

export function summarizeAdminUserAgent(
  userAgent: string | null,
): string | null {
  const normalized = userAgent?.replace(/\s+/gu, " ").trim();

  return normalized
    ? normalized.slice(0, ADMIN_SESSION_POLICY.userAgentMaximumLength)
    : null;
}

export function getAdminSessionCookieName(): string {
  return env.NODE_ENV === "production"
    ? ADMIN_SESSION_POLICY.productionCookieName
    : ADMIN_SESSION_POLICY.developmentCookieName;
}

function createAdminCookieOptions(expiresAt?: Date): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    ...(expiresAt ? { expires: expiresAt } : {}),
  };
}

export function setAdminSessionCookie(
  response: Response,
  sessionToken: string,
  expiresAt: Date,
): void {
  response.cookie(
    getAdminSessionCookieName(),
    sessionToken,
    createAdminCookieOptions(expiresAt),
  );
}

export function clearAdminSessionCookie(response: Response): void {
  response.clearCookie(
    getAdminSessionCookieName(),
    createAdminCookieOptions(),
  );
}

export function readAdminSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookieName = getAdminSessionCookieName();
  const matches: string[] = [];

  for (const cookiePart of cookieHeader.split(";")) {
    const separatorIndex = cookiePart.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const name = cookiePart.slice(0, separatorIndex).trim();

    if (name !== cookieName) {
      continue;
    }

    try {
      matches.push(
        decodeURIComponent(
          cookiePart.slice(separatorIndex + 1).trim(),
        ),
      );
    } catch {
      return null;
    }
  }

  if (matches.length !== 1) {
    return null;
  }

  const [sessionToken] = matches;

  return sessionToken &&
    sessionToken.length === ADMIN_SESSION_POLICY.tokenCharacterLength &&
    BASE64URL_PATTERN.test(sessionToken)
    ? sessionToken
    : null;
}