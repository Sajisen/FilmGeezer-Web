import {
  ObjectId,
  type TransactionOptions,
} from "mongodb";

import {
  closeMongoConnection,
  getMongoClient,
} from "../../config/database.js";
import { getAuthCollections } from "../auth/auth.collections.js";
import { normalizeEmail } from "../auth/auth.validation.js";
import {
  AdminRoleOperationError,
} from "./admin.errors.js";
import { initializeAdminStorage } from "./admin.indexes.js";
import { touchAdminMembershipGovernanceState } from "./admin.governance.repository.js";
import {
  createAdminAuditEvent,
  revokeAllAdminSessionsForUser,
} from "./admin.repository.js";

const ROLE_TRANSACTION_OPTIONS: TransactionOptions = {
  readPreference: "primary",
  readConcern: { level: "snapshot" },
  writeConcern: { w: "majority" },
  maxCommitTimeMS: 5_000,
};

export interface AdminRoleOperationResult {
  userId: string;
  email: string;
  displayName: string;
  changed: boolean;
}

export async function grantAdministratorRole(
  email: string,
): Promise<AdminRoleOperationResult> {
  await initializeAdminStorage();

  const normalizedEmail = normalizeEmail(email);
  const client = await getMongoClient();
  const mongoSession = client.startSession();

  try {
    const result = await mongoSession.withTransaction(async () => {
      const changedAt = new Date();
      await touchAdminMembershipGovernanceState(changedAt, mongoSession);
      const { users } = await getAuthCollections();
      const user = await users.findOne(
        {
          emailNormalized: normalizedEmail,
          status: "active",
          emailVerifiedAt: { $ne: null },
          suspendedAt: null,
          deactivatedAt: null,
          deletedAt: null,
        },
        { session: mongoSession },
      );

      if (!user) {
        throw new AdminRoleOperationError(
          "An active, verified FilmGeezer account with that email was not found.",
        );
      }

      const alreadyAdmin = user.roles.includes("admin");

      if (!alreadyAdmin) {
        await users.updateOne(
          { _id: user._id, roles: { $ne: "admin" } },
          {
            $addToSet: { roles: "admin" },
            $set: { updatedAt: changedAt },
          },
          { session: mongoSession },
        );
      }

      await createAdminAuditEvent(
        {
          auditEventId: new ObjectId(),
          actorUserId: null,
          targetUserId: user._id,
          eventType: "admin-role-granted",
          outcome: "success",
          details: {
            source: "server-cli",
            changed: !alreadyAdmin,
          },
          createdAt: changedAt,
        },
        mongoSession,
      );

      return {
        userId: user._id.toHexString(),
        email: user.emailDisplay,
        displayName: user.displayName,
        changed: !alreadyAdmin,
      };
    }, ROLE_TRANSACTION_OPTIONS);

    if (!result) {
      throw new AdminRoleOperationError(
        "The administrator role operation did not complete.",
      );
    }

    return result;
  } finally {
    await mongoSession.endSession();
  }
}

export async function revokeAdministratorRole(
  email: string,
): Promise<AdminRoleOperationResult> {
  await initializeAdminStorage();

  const normalizedEmail = normalizeEmail(email);
  const client = await getMongoClient();
  const mongoSession = client.startSession();

  try {
    const result = await mongoSession.withTransaction(async () => {
      const changedAt = new Date();
      await touchAdminMembershipGovernanceState(changedAt, mongoSession);
      const { users } = await getAuthCollections();
      const user = await users.findOne(
        { emailNormalized: normalizedEmail },
        { session: mongoSession },
      );

      if (!user) {
        throw new AdminRoleOperationError(
          "A FilmGeezer account with that email was not found.",
        );
      }

      const wasAdmin = user.roles.includes("admin");

      if (wasAdmin) {
        const administratorCount = await users.countDocuments(
          {
            roles: "admin",
            status: "active",
            emailVerifiedAt: { $ne: null },
            suspendedAt: null,
            deactivatedAt: null,
            deletedAt: null,
          },
          { session: mongoSession },
        );

        if (administratorCount <= 1) {
          throw new AdminRoleOperationError(
            "The final active administrator cannot be revoked.",
          );
        }
      }

      if (wasAdmin) {
        await users.updateOne(
          { _id: user._id, roles: "admin" },
          {
            $pull: { roles: "admin" },
            $set: { updatedAt: changedAt },
          },
          { session: mongoSession },
        );

        await revokeAllAdminSessionsForUser(
          {
            userId: user._id,
            revokedAt: changedAt,
            reason: "administrator-revoked",
          },
          mongoSession,
        );
      }

      await createAdminAuditEvent(
        {
          auditEventId: new ObjectId(),
          actorUserId: null,
          targetUserId: user._id,
          eventType: "admin-role-revoked",
          outcome: "success",
          details: {
            source: "server-cli",
            changed: wasAdmin,
          },
          createdAt: changedAt,
        },
        mongoSession,
      );

      return {
        userId: user._id.toHexString(),
        email: user.emailDisplay,
        displayName: user.displayName,
        changed: wasAdmin,
      };
    }, ROLE_TRANSACTION_OPTIONS);

    if (!result) {
      throw new AdminRoleOperationError(
        "The administrator role operation did not complete.",
      );
    }

    return result;
  } finally {
    await mongoSession.endSession();
  }
}

export { closeMongoConnection };
