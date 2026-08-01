import {
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import type { ObjectId } from "mongodb";
import { env } from "../../config/env.js";
import {
  AUTH_EMAIL_CHANGE_POLICY,
  AUTH_EMAIL_VERIFICATION_POLICY,
  AUTH_PASSWORD_RESET_POLICY,
} from "./auth.constants.js";
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

function createNumericCode(
  digits: number,
): string {
  const maximumValue = 10 ** digits;

  return randomInt(0, maximumValue)
    .toString()
    .padStart(digits, "0");
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
  const secret = createNumericCode(
    AUTH_EMAIL_VERIFICATION_POLICY.codeDigits,
  );

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


export function generateEmailChangeChallenge(
  userId: ObjectId,
  createdAt = new Date(),
): GeneratedAuthChallenge {
  const publicId = randomUUID();
  const secret = createNumericCode(
    AUTH_EMAIL_CHANGE_POLICY.codeDigits,
  );

  const digest = createChallengeDigest(
    publicId,
    userId,
    "change-email",
    secret,
  );

  return {
    publicId,
    secret,
    secretHash: digest.toString("base64url"),
    createdAt,
    expiresAt: new Date(
      createdAt.getTime() +
        AUTH_EMAIL_CHANGE_POLICY
          .expiresAfterMilliseconds,
    ),
  };
}

export function generatePasswordResetChallenge(
  userId: ObjectId,
  createdAt = new Date(),
): GeneratedAuthChallenge {
  const publicId = randomUUID();

  const secret = randomBytes(
    AUTH_PASSWORD_RESET_POLICY.tokenBytes,
  ).toString("base64url");

  const digest = createChallengeDigest(
    publicId,
    userId,
    "reset-password",
    secret,
  );

  return {
    publicId,
    secret,
    secretHash: digest.toString("base64url"),
    createdAt,
    expiresAt: new Date(
      createdAt.getTime() +
        AUTH_PASSWORD_RESET_POLICY
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
