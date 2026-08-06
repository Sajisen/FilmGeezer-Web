import type {
  ClientSession,
  ObjectId,
} from "mongodb";

import {
  findAdminRecoveryCodeHash,
  generateAdminRecoveryCodes,
  hashAdminRecoveryCode,
} from "./admin.mfa.crypto.js";
import {
  consumeAdminRecoveryCode,
} from "./admin.mfa.repository.js";
import {
  consumeAdminRecoveryFactorCode,
  findAdminRecoveryFactorByUserId,
  replaceAdminRecoveryFactorCodes,
} from "./admin.recovery.repository.js";
import type {
  AdminMfaFactorDocument,
} from "./admin.types.js";

export async function getAdminRecoveryCodeCount(
  userId: ObjectId,
  legacyFactor?: AdminMfaFactorDocument | null,
  session?: ClientSession,
): Promise<number> {
  const dedicated = await findAdminRecoveryFactorByUserId(
    userId,
    session,
  );

  return dedicated
    ? dedicated.recoveryCodeHashes.length
    : legacyFactor?.recoveryCodeHashes.length ?? 0;
}

export async function consumeAdminRecoveryProof(input: {
  userId: ObjectId;
  candidateCode: string;
  legacyFactor?: AdminMfaFactorDocument | null;
  checkedAt: Date;
  session?: ClientSession;
}): Promise<boolean> {
  const dedicated = await findAdminRecoveryFactorByUserId(
    input.userId,
    input.session,
  );
  const hashes = dedicated
    ? dedicated.recoveryCodeHashes
    : input.legacyFactor?.recoveryCodeHashes ?? [];
  const matchingHash = findAdminRecoveryCodeHash({
    userId: input.userId,
    candidateCode: input.candidateCode,
    storedHashes: hashes,
  });

  if (!matchingHash) {
    return false;
  }

  if (dedicated) {
    return consumeAdminRecoveryFactorCode(
      {
        userId: input.userId,
        recoveryCodeHash: matchingHash,
        consumedAt: input.checkedAt,
      },
      input.session,
    );
  }

  if (!input.legacyFactor) {
    return false;
  }

  return consumeAdminRecoveryCode(
    {
      factorId: input.legacyFactor._id,
      recoveryCodeHash: matchingHash,
      consumedAt: input.checkedAt,
    },
    input.session,
  );
}

export async function generateAndStoreAdminRecoveryCodes(input: {
  userId: ObjectId;
  generatedAt: Date;
  session?: ClientSession;
}): Promise<string[]> {
  const recoveryCodes = generateAdminRecoveryCodes();
  const hashes = recoveryCodes.map((code) =>
    hashAdminRecoveryCode(input.userId, code),
  );

  await replaceAdminRecoveryFactorCodes(
    {
      userId: input.userId,
      hashes,
      updatedAt: input.generatedAt,
    },
    input.session,
  );

  return recoveryCodes;
}
