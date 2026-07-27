import { randomUUID } from "node:crypto";
import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";
import { getMongoClient } from "../../config/database.js";
import {
  AuthAccountConflictError,
  AuthPersistenceError,
  isMongoDuplicateKeyError,
} from "./auth.errors.js";
import { initializeAuthStorage } from "./auth.indexes.js";
import { hashPassword } from "./auth.password.js";
import {
  parseRegistrationInput,
  type RegistrationInput,
} from "./auth.validation.js";
import { createAuthAuditEvent } from "./repositories/authAudit.repository.js";
import { createAuthCredential } from "./repositories/authCredential.repository.js";
import { createAuthIdentity } from "./repositories/authIdentity.repository.js";
import { createPendingUser } from "./repositories/authUser.repository.js";

const REGISTRATION_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: "primary",

  readConcern: {
    level: "snapshot",
  },

  writeConcern: {
    w: "majority",
  },

  maxCommitTimeMS: 5_000,
};

export interface RegisteredLocalUser {
  userId: string;
  email: string;
  displayName: string;
  status: "pending";
  provider: "local";
  providerSubject: string;
}

export async function registerLocalUser(
  input: RegistrationInput,
): Promise<RegisteredLocalUser> {
  const registration = parseRegistrationInput(input);

  await initializeAuthStorage();

  /*
   * Password hashing is intentionally performed before the transaction.
   *
   * Argon2id is computationally expensive by design. Keeping that work
   * outside the transaction reduces how long MongoDB resources and
   * transaction state must remain open.
   */
  const passwordHash = await hashPassword(
    registration.password,
  );

  /*
   * Generate stable IDs before entering the transaction. MongoDB may
   * retry the transaction callback after certain transient failures.
   */
  const userId = new ObjectId();
  const identityId = new ObjectId();
  const credentialId = new ObjectId();
  const auditEventId = new ObjectId();

  const providerSubject = randomUUID();
  const createdAt = new Date();

  const client = await getMongoClient();
  const session = client.startSession();

  try {
    const result = await session.withTransaction(
      async () => {
        const user = await createPendingUser(
          {
            userId,
            emailNormalized:
              registration.emailNormalized,
            emailDisplay: registration.emailDisplay,
            displayName: registration.displayName,
            createdAt,
          },
          session,
        );

        await createAuthIdentity(
          {
            identityId,
            userId: user._id,
            provider: "local",
            providerSubject,
            createdAt,
          },
          session,
        );

        await createAuthCredential(
          {
            credentialId,
            userId: user._id,
            passwordHash,
            createdAt,
          },
          session,
        );

        await createAuthAuditEvent(
          {
            auditEventId,
            userId: user._id,
            eventType: "registration-completed",
            outcome: "success",
            details: {
              provider: "local",
              initialStatus: "pending",
            },
            createdAt,
          },
          session,
        );

        return {
          userId: user._id.toHexString(),
          email: user.emailDisplay,
          displayName: user.displayName,
          status: "pending",
          provider: "local",
          providerSubject,
        } satisfies RegisteredLocalUser;
      },
      REGISTRATION_TRANSACTION_OPTIONS,
    );

    if (!result) {
      throw new AuthPersistenceError(
        "Registration transaction completed without returning a user.",
      );
    }

    return result;
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      throw new AuthAccountConflictError();
    }

    if (
      error instanceof AuthAccountConflictError ||
      error instanceof AuthPersistenceError
    ) {
      throw error;
    }

    throw new AuthPersistenceError(
      "The FilmGeezer account could not be created.",
      {
        cause: error,
      },
    );
  } finally {
    await session.endSession();
  }
}