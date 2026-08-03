import {
  ObjectId,
  type ClientSession,
} from "mongodb";

import { getAuthCollections } from "../auth/auth.collections.js";
import { getAdminCollections } from "./admin.collections.js";
import {
  ADMIN_SCHEMA_VERSION,
  ADMIN_SESSION_POLICY,
} from "./admin.constants.js";
import type {
  AdminAuditDetailValue,
  AdminAuditEvent,
  AdminAuditEventDocument,
  AdminAuditOutcome,
  AdminSessionDocument,
  AdminSessionRevocationReason,
} from "./admin.types.js";

export interface CreateAdminSessionInput {
  sessionId: ObjectId;
  userId: ObjectId;
  tokenHash: string;
  csrfSecretHash: string;
  userAgentSummary: string | null;
  ipHash: string | null;
  createdAt: Date;
  expiresAt: Date;
}

export async function createAdminSession(
  input: CreateAdminSessionInput,
  session: ClientSession,
): Promise<AdminSessionDocument> {
  const { sessions } = await getAdminCollections();

  const document: AdminSessionDocument = {
    _id: input.sessionId,
    schemaVersion: ADMIN_SCHEMA_VERSION,
    userId: input.userId,
    tokenHash: input.tokenHash,
    csrfSecretHash: input.csrfSecretHash,
    userAgentSummary: input.userAgentSummary,
    ipHash: input.ipHash,
    createdAt: input.createdAt,
    lastSeenAt: input.createdAt,
    expiresAt: input.expiresAt,
    revokedAt: null,
    revocationReason: null,
  };

  await sessions.insertOne(document, { session });
  return document;
}

export async function findAdminSessionByTokenHash(
  tokenHash: string,
): Promise<AdminSessionDocument | null> {
  const { sessions } = await getAdminCollections();
  return sessions.findOne({ tokenHash });
}

export async function touchAdminSession(
  sessionId: ObjectId,
  touchedAt: Date,
): Promise<boolean> {
  const { sessions } = await getAdminCollections();

  const result = await sessions.updateOne(
    {
      _id: sessionId,
      revokedAt: null,
      expiresAt: { $gt: touchedAt },
      lastSeenAt: {
        $lte: new Date(
          touchedAt.getTime() -
            ADMIN_SESSION_POLICY.activityTouchIntervalMilliseconds,
        ),
      },
    },
    { $set: { lastSeenAt: touchedAt } },
  );

  return result.modifiedCount === 1;
}

export async function revokeAdminSession(
  input: {
    sessionId: ObjectId;
    userId: ObjectId;
    revokedAt: Date;
    reason: AdminSessionRevocationReason;
  },
  session?: ClientSession,
): Promise<boolean> {
  const { sessions } = await getAdminCollections();

  const result = await sessions.updateOne(
    {
      _id: input.sessionId,
      userId: input.userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: input.revokedAt,
        revocationReason: input.reason,
      },
    },
    session ? { session } : undefined,
  );

  return result.modifiedCount === 1;
}

export async function revokeAllAdminSessionsForUser(
  input: {
    userId: ObjectId;
    revokedAt: Date;
    reason: AdminSessionRevocationReason;
  },
  session?: ClientSession,
): Promise<number> {
  const { sessions } = await getAdminCollections();

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
    session ? { session } : undefined,
  );

  return result.modifiedCount;
}

export async function makeRoomForAdminSession(
  userId: ObjectId,
  createdAt: Date,
  session: ClientSession,
): Promise<number> {
  const { sessions } = await getAdminCollections();

  const activeSessions = await sessions
    .find(
      {
        userId,
        revokedAt: null,
        expiresAt: { $gt: createdAt },
      },
      {
        session,
        projection: { _id: 1 },
      },
    )
    .sort({ createdAt: 1, _id: 1 })
    .toArray();

  const maximumExisting = Math.max(
    0,
    ADMIN_SESSION_POLICY.maximumActiveSessionsPerUser - 1,
  );
  const numberToRevoke = Math.max(
    0,
    activeSessions.length - maximumExisting,
  );

  if (numberToRevoke === 0) {
    return 0;
  }

  const result = await sessions.updateMany(
    {
      _id: {
        $in: activeSessions
          .slice(0, numberToRevoke)
          .map((item) => item._id),
      },
      userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: createdAt,
        revocationReason: "session-limit",
      },
    },
    { session },
  );

  return result.modifiedCount;
}

export async function countActiveAdminSessions(
  checkedAt: Date,
): Promise<number> {
  const { sessions } = await getAdminCollections();

  return sessions.countDocuments({
    revokedAt: null,
    expiresAt: { $gt: checkedAt },
    lastSeenAt: {
      $gt: new Date(
        checkedAt.getTime() -
          ADMIN_SESSION_POLICY.idleTimeoutMilliseconds,
      ),
    },
  });
}

export async function createAdminAuditEvent(
  input: {
    auditEventId: ObjectId;
    actorUserId: ObjectId | null;
    targetUserId?: ObjectId | null;
    eventType: AdminAuditEvent;
    outcome: AdminAuditOutcome;
    ipHash?: string | null;
    userAgentSummary?: string | null;
    details?: Record<string, AdminAuditDetailValue>;
    createdAt: Date;
  },
  session?: ClientSession,
): Promise<AdminAuditEventDocument> {
  const { auditEvents } = await getAdminCollections();

  const document: AdminAuditEventDocument = {
    _id: input.auditEventId,
    schemaVersion: ADMIN_SCHEMA_VERSION,
    actorUserId: input.actorUserId,
    targetUserId: input.targetUserId ?? null,
    eventType: input.eventType,
    outcome: input.outcome,
    ipHash: input.ipHash ?? null,
    userAgentSummary: input.userAgentSummary ?? null,
    details: input.details ?? {},
    createdAt: input.createdAt,
  };

  await auditEvents.insertOne(
    document,
    session ? { session } : undefined,
  );

  return document;
}

export async function countActiveAdministrators(): Promise<number> {
  const { users } = await getAuthCollections();

  return users.countDocuments({
    roles: "admin",
    status: "active",
    emailVerifiedAt: { $ne: null },
    suspendedAt: null,
    deactivatedAt: null,
    deletedAt: null,
  });
}