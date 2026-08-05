import {
  ObjectId,
  type ClientSession,
  type Filter,
} from "mongodb";

import { getAuthCollections } from "../auth/auth.collections.js";
import { AUTH_SESSION_POLICY } from "../auth/auth.constants.js";
import type {
  AuthIdentityDocument,
  AuthSessionDocument,
  FilmGeezerUserDocument,
  UserStatus,
} from "../auth/auth.types.js";
import type { AdminUserListQuery } from "./admin.user.types.js";

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function buildUserFilter(
  query: AdminUserListQuery,
): Filter<FilmGeezerUserDocument> {
  const filter: Filter<FilmGeezerUserDocument> = {};

  if (query.status !== "all") {
    filter.status = query.status;
  }

  if (query.role !== "all") {
    filter.roles = query.role;
  }

  if (query.verification === "verified") {
    filter.emailVerifiedAt = { $ne: null };
  } else if (query.verification === "unverified") {
    filter.emailVerifiedAt = null;
  }

  if (query.search) {
    const escaped = escapeRegularExpression(query.search);
    const emailPrefix = new RegExp(`^${escaped}`, "iu");
    const nameMatch = new RegExp(escaped, "iu");
    const conditions: Filter<FilmGeezerUserDocument>[] = [
      { emailNormalized: emailPrefix },
      { emailDisplay: emailPrefix },
      { displayName: nameMatch },
    ];

    if (/^[a-fA-F0-9]{24}$/u.test(query.search)) {
      conditions.unshift({ _id: new ObjectId(query.search) });
    }

    filter.$or = conditions;
  }

  return filter;
}

export async function findAdminUsers(
  query: AdminUserListQuery,
): Promise<{
  documents: FilmGeezerUserDocument[];
  totalItems: number;
}> {
  const { users } = await getAuthCollections();
  const filter = buildUserFilter(query);
  const skip = (query.page - 1) * query.pageSize;

  const [documents, totalItems] = await Promise.all([
    users
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(query.pageSize)
      .toArray(),
    users.countDocuments(filter),
  ]);

  return { documents, totalItems };
}

export async function findManagedUserById(
  userId: ObjectId,
  session?: ClientSession,
): Promise<FilmGeezerUserDocument | null> {
  const { users } = await getAuthCollections();

  return users.findOne(
    { _id: userId },
    session ? { session } : undefined,
  );
}

export async function findManagedUserIdentities(
  userId: ObjectId,
): Promise<AuthIdentityDocument[]> {
  const { identities } = await getAuthCollections();

  return identities
    .find({ userId })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
}

function createActiveSessionFilter(
  userId: ObjectId,
  checkedAt: Date,
): Filter<AuthSessionDocument> {
  return {
    userId,
    revokedAt: null,
    expiresAt: { $gt: checkedAt },
    lastSeenAt: {
      $gt: new Date(
        checkedAt.getTime() -
          AUTH_SESSION_POLICY.idleTimeoutMilliseconds,
      ),
    },
  };
}

export async function findActiveManagedUserSessions(
  userId: ObjectId,
  checkedAt: Date,
): Promise<AuthSessionDocument[]> {
  const { sessions } = await getAuthCollections();

  return sessions
    .find(createActiveSessionFilter(userId, checkedAt))
    .sort({ lastSeenAt: -1, createdAt: -1, _id: -1 })
    .toArray();
}

export async function countActiveManagedUserSessions(
  userIds: ObjectId[],
  checkedAt: Date,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  if (userIds.length === 0) {
    return result;
  }

  const { sessions } = await getAuthCollections();
  const idleThreshold = new Date(
    checkedAt.getTime() -
      AUTH_SESSION_POLICY.idleTimeoutMilliseconds,
  );

  const activeSessions = await sessions
    .find(
      {
        userId: { $in: userIds },
        revokedAt: null,
        expiresAt: { $gt: checkedAt },
        lastSeenAt: { $gt: idleThreshold },
      },
      {
        projection: { _id: 0, userId: 1 },
      },
    )
    .toArray();

  for (const session of activeSessions) {
    const key = session.userId.toHexString();
    result.set(key, (result.get(key) ?? 0) + 1);
  }

  return result;
}

export async function countActiveEligibleAdministrators(
  session?: ClientSession,
): Promise<number> {
  const { users } = await getAuthCollections();

  return users.countDocuments(
    {
      roles: "admin",
      status: "active",
      emailVerifiedAt: { $ne: null },
      suspendedAt: null,
      deactivatedAt: null,
      deletedAt: null,
    },
    session ? { session } : undefined,
  );
}

export async function suspendManagedUser(
  input: {
    userId: ObjectId;
    expectedUpdatedAt: Date;
    suspendedAt: Date;
  },
  session: ClientSession,
): Promise<FilmGeezerUserDocument | null> {
  const { users } = await getAuthCollections();

  return users.findOneAndUpdate(
    {
      _id: input.userId,
      updatedAt: input.expectedUpdatedAt,
      status: { $in: ["active", "pending"] },
      suspendedAt: null,
      deactivatedAt: null,
      deletedAt: null,
    },
    {
      $set: {
        status: "suspended",
        suspendedAt: input.suspendedAt,
        updatedAt: input.suspendedAt,
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
}

export async function reactivateManagedUser(
  input: {
    userId: ObjectId;
    expectedUpdatedAt: Date;
    status: Extract<UserStatus, "active" | "pending">;
    reactivatedAt: Date;
  },
  session: ClientSession,
): Promise<FilmGeezerUserDocument | null> {
  const { users } = await getAuthCollections();

  return users.findOneAndUpdate(
    {
      _id: input.userId,
      updatedAt: input.expectedUpdatedAt,
      status: "suspended",
      suspendedAt: { $ne: null },
      deactivatedAt: null,
      deletedAt: null,
    },
    {
      $set: {
        status: input.status,
        suspendedAt: null,
        updatedAt: input.reactivatedAt,
      },
    },
    {
      returnDocument: "after",
      session,
    },
  );
}

export async function revokeManagedUserSession(
  input: {
    userId: ObjectId;
    sessionId: ObjectId;
    revokedAt: Date;
  },
  session: ClientSession,
): Promise<boolean> {
  const { sessions } = await getAuthCollections();

  const result = await sessions.updateOne(
    {
      _id: input.sessionId,
      userId: input.userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: input.revokedAt,
        revocationReason: "user-revoked",
      },
    },
    { session },
  );

  return result.modifiedCount === 1;
}

export async function revokeAllManagedUserSessions(
  input: {
    userId: ObjectId;
    revokedAt: Date;
    reason: "user-revoked" | "account-suspended";
  },
  session: ClientSession,
): Promise<number> {
  const { sessions } = await getAuthCollections();

  const result = await sessions.updateMany(
    {
      userId: input.userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: input.revokedAt,
        revocationReason: input.reason,
      },
    },
    { session },
  );

  return result.modifiedCount;
}

export async function touchManagedUser(
  userId: ObjectId,
  changedAt: Date,
  session: ClientSession,
): Promise<boolean> {
  const { users } = await getAuthCollections();

  const result = await users.updateOne(
    { _id: userId },
    { $set: { updatedAt: changedAt } },
    { session },
  );

  return result.matchedCount === 1;
}
