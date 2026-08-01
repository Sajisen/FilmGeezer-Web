import * as argon2 from "argon2";

const PASSWORD_HASH_OPTIONS = {
  type: argon2.argon2id,

  /*
   * Argon2's memoryCost is measured in KiB.
   * 19,456 KiB equals 19 MiB.
   */
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,

  /*
   * A 32-byte derived hash is sufficient for password verification.
   */
  hashLength: 32,
} as const;

export async function hashPassword(
  password: string,
): Promise<string> {
  return argon2.hash(password, PASSWORD_HASH_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  candidatePassword: string,
): Promise<boolean> {
  return argon2.verify(passwordHash, candidatePassword);
}

export function passwordHashNeedsRehash(
  passwordHash: string,
): boolean {
  return argon2.needsRehash(
    passwordHash,
    PASSWORD_HASH_OPTIONS,
  );
}