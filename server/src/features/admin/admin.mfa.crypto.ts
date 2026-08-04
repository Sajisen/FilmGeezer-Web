import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

import QRCode from "qrcode";

import { env } from "../../config/env.js";
import { ADMIN_MFA_POLICY } from "./admin.constants.js";
import { AdminMfaConfigurationError } from "./admin.errors.js";
import type { AdminEncryptedSecret } from "./admin.types.js";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const NUMERIC_CODE_PATTERN = /^\d{6}$/u;

function requireEncryptionKey(): Buffer {
  if (!env.ADMIN_MFA_ENCRYPTION_KEY) {
    throw new AdminMfaConfigurationError();
  }

  const key = Buffer.from(env.ADMIN_MFA_ENCRYPTION_KEY, "base64");

  if (key.length !== 32) {
    throw new AdminMfaConfigurationError();
  }

  return key;
}

function requireRecoveryPepper(): string {
  if (!env.ADMIN_MFA_RECOVERY_PEPPER) {
    throw new AdminMfaConfigurationError();
  }

  return env.ADMIN_MFA_RECOVERY_PEPPER;
}

export function isAdminMfaConfigured(): boolean {
  return Boolean(
    env.ADMIN_MFA_ENCRYPTION_KEY && env.ADMIN_MFA_RECOVERY_PEPPER,
  );
}

function encodeBase32(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function decodeBase32(input: string): Buffer {
  const normalized = input
    .toUpperCase()
    .replace(/=+$/u, "")
    .replace(/\s+/gu, "");

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character);

    if (index < 0) {
      throw new Error("Invalid base32 secret.");
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

export function generateAdminMfaSecret(): string {
  return encodeBase32(randomBytes(ADMIN_MFA_POLICY.secretBytes));
}

export function encryptAdminMfaSecret(secret: string): AdminEncryptedSecret {
  const key = requireEncryptionKey();
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, initializationVector);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString("base64url"),
    initializationVector: initializationVector.toString("base64url"),
    authenticationTag: cipher.getAuthTag().toString("base64url"),
    keyVersion: ADMIN_MFA_POLICY.encryptionKeyVersion,
  };
}

export function decryptAdminMfaSecret(
  encryptedSecret: AdminEncryptedSecret,
): string {
  if (
    encryptedSecret.keyVersion !== ADMIN_MFA_POLICY.encryptionKeyVersion
  ) {
    throw new AdminMfaConfigurationError(
      "The administrator MFA encryption-key version is unsupported.",
    );
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    requireEncryptionKey(),
    Buffer.from(encryptedSecret.initializationVector, "base64url"),
  );
  decipher.setAuthTag(
    Buffer.from(encryptedSecret.authenticationTag, "base64url"),
  );

  return Buffer.concat([
    decipher.update(
      Buffer.from(encryptedSecret.ciphertext, "base64url"),
    ),
    decipher.final(),
  ]).toString("utf8");
}

function createTotpCode(secret: string, timeStep: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(timeStep));

  const digest = createHmac("sha1", decodeBase32(secret))
    .update(counter)
    .digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);

  return (binary % 10 ** ADMIN_MFA_POLICY.digits)
    .toString()
    .padStart(ADMIN_MFA_POLICY.digits, "0");
}

function timingSafeCodeEqual(left: unknown, right: unknown): boolean {
  if (typeof left !== "string" || typeof right !== "string") {
    return false;
  }

  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function verifyAdminTotpCode(input: {
  secret: string;
  candidateCode: string;
  checkedAt?: Date;
}): number | null {
  const candidateCode = input.candidateCode.trim();

  if (!NUMERIC_CODE_PATTERN.test(candidateCode)) {
    return null;
  }

  const checkedAt = input.checkedAt ?? new Date();
  const currentTimeStep = Math.floor(
    checkedAt.getTime() /
      1_000 /
      ADMIN_MFA_POLICY.periodSeconds,
  );

  for (
    let offset = -ADMIN_MFA_POLICY.verificationWindowSteps;
    offset <= ADMIN_MFA_POLICY.verificationWindowSteps;
    offset += 1
  ) {
    const timeStep = currentTimeStep + offset;

    if (
      timeStep >= 0 &&
      timingSafeCodeEqual(
        createTotpCode(input.secret, timeStep),
        candidateCode,
      )
    ) {
      return timeStep;
    }
  }

  return null;
}

export function createAdminMfaOtpAuthUri(input: {
  email: string;
  secret: string;
}): string {
  const issuer = ADMIN_MFA_POLICY.issuer;
  const label = `${issuer}:${input.email}`;
  const parameters = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: ADMIN_MFA_POLICY.algorithm,
    digits: String(ADMIN_MFA_POLICY.digits),
    period: String(ADMIN_MFA_POLICY.periodSeconds),
  });

  return `otpauth://totp/${encodeURIComponent(label)}?${parameters.toString()}`;
}

export async function createAdminMfaQrDataUrl(
  otpAuthUri: string,
): Promise<string> {
  return QRCode.toDataURL(otpAuthUri, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 256,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

function normalizeRecoveryCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/gu, "");
}

export function generateAdminRecoveryCodes(): string[] {
  const codes: string[] = [];

  for (let index = 0; index < ADMIN_MFA_POLICY.recoveryCodeCount; index += 1) {
    let raw = "";

    for (
      let characterIndex = 0;
      characterIndex < ADMIN_MFA_POLICY.recoveryCodeCharacters;
      characterIndex += 1
    ) {
      const randomIndex = randomInt(
        0,
        ADMIN_MFA_POLICY.recoveryAlphabet.length,
      );
      raw += ADMIN_MFA_POLICY.recoveryAlphabet[randomIndex];
    }

    codes.push(
      `${ADMIN_MFA_POLICY.recoveryCodePrefix}-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`,
    );
  }

  return codes;
}

export function hashAdminRecoveryCode(
  userId: { toHexString(): string },
  recoveryCode: string,
): string {
  return createHmac("sha256", requireRecoveryPepper())
    .update("filmgeezer-admin-mfa-recovery-v1")
    .update("\0")
    .update(userId.toHexString())
    .update("\0")
    .update(normalizeRecoveryCode(recoveryCode))
    .digest("base64url");
}

export function findAdminRecoveryCodeHash(input: {
  userId: { toHexString(): string };
  candidateCode: string;
  storedHashes: string[];
}): string | null {
  const candidateHash = hashAdminRecoveryCode(
    input.userId,
    input.candidateCode,
  );

  for (const storedHash of input.storedHashes) {
    if (timingSafeCodeEqual(candidateHash, storedHash)) {
      return storedHash;
    }
  }

  return null;
}
