import {
  ObjectId,
  type ClientSession,
} from "mongodb";
import { DATA_RETENTION_POLICY } from "../../../config/dataRetention.js";
import { AUTH_SCHEMA_VERSION } from "../auth.constants.js";
import { getAuthCollections } from "../auth.collections.js";
import type {
  AuthAuditDetailValue,
  AuthAuditEvent,
  AuthAuditEventDocument,
  AuthAuditOutcome,
} from "../auth.types.js";

export interface CreateAuthAuditEventInput {
  auditEventId: ObjectId;
  userId: ObjectId | null;

  eventType: AuthAuditEvent;
  outcome: AuthAuditOutcome;

  ipHash?: string | null;
  userAgentSummary?: string | null;

  details?: Record<string, AuthAuditDetailValue>;

  createdAt: Date;
}

export async function createAuthAuditEvent(
  input: CreateAuthAuditEventInput,
  session?: ClientSession,
): Promise<AuthAuditEventDocument> {
  const { auditEvents } = await getAuthCollections();

  const auditEvent: AuthAuditEventDocument = {
    _id: input.auditEventId,
    schemaVersion: AUTH_SCHEMA_VERSION,

    userId: input.userId,

    eventType: input.eventType,
    outcome: input.outcome,

    ipHash: input.ipHash ?? null,
    userAgentSummary:
      input.userAgentSummary ?? null,

    details: input.details ?? {},

    createdAt: input.createdAt,
    deleteAt: new Date(
      input.createdAt.getTime() +
        DATA_RETENTION_POLICY.authAuditSeconds * 1_000,
    ),
  };

await auditEvents.insertOne(
  auditEvent,
  session ? { session } : undefined,
);

  return auditEvent;
}