import {
  createHmac,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import { AUTH_EMAIL_VERIFICATION_POLICY } from "./auth.constants.js";
import type {
  AuthChallengePurpose,
} from "./auth.types.js";

export interface GeneratedAuthChallenge {
  publicId: string;
  secret: string;
  secretHash: string;

  createdAt: Date;
  expiresAt: Date;
}

function createVerificationCode(): string {
  const maximumValue =
    10 ** AUTH_EMAIL_VERIFICATION_POLICY.codeDigits;

  return randomInt(0, maximumValue)
    .toString()
    .padStart(
      AUTH_EMAIL_VERIFICATION_POLICY.codeDigits,
      "0",
    );
}

function createChallengeDigest(
  publicId: string,
  userId: ObjectId,
  purpose: AuthChallengePurpose,
  secret: string,
): Buffer {
  const value = [
    "filmgeezer-auth-challenge-v1",
    publicId,
    userId.toHexString(),
    purpose,
    secret,
  ].join(":");

  return createHmac(
    "sha256",
    env.AUTH_CHALLENGE_PEPPER,
  )
    .update(value, "utf8")
    .digest();
}

export function generateEmailVerificationChallenge(
  userId: ObjectId,
  createdAt = new Date(),
): GeneratedAuthChallenge {
  const publicId = randomUUID();
  const secret = createVerificationCode();

  const digest = createChallengeDigest(
    publicId,
    userId,
    "verify-email",
    secret,
  );

  return {
    publicId,
    secret,
    secretHash: digest.toString("base64url"),

    createdAt,
    expiresAt: new Date(
      createdAt.getTime() +
        AUTH_EMAIL_VERIFICATION_POLICY
          .expiresAfterMilliseconds,
    ),
  };
}

export function verifyAuthChallengeSecret(
  input: {
    publicId: string;
    userId: ObjectId;
    purpose: AuthChallengePurpose;
    candidateSecret: string;
    storedSecretHash: string;
  },
): boolean {
  const candidateDigest = createChallengeDigest(
    input.publicId,
    input.userId,
    input.purpose,
    input.candidateSecret,
  );

  let storedDigest: Buffer;

  try {
    storedDigest = Buffer.from(
      input.storedSecretHash,
      "base64url",
    );
  } catch {
    return false;
  }

  if (storedDigest.length !== candidateDigest.length) {
    return false;
  }

  return timingSafeEqual(
    storedDigest,
    candidateDigest,
  );
}