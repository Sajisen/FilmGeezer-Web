import {
  ObjectId,
  type Filter,
} from "mongodb";

import { getAuthCollections } from "../auth/auth.collections.js";
import type { FilmGeezerUserDocument } from "../auth/auth.types.js";
import { getAdminCollections } from "./admin.collections.js";
import type {
  AdminAuditEventDocument,
  AdminAuditEvent,
} from "./admin.types.js";
import type {
  AdminAuditIdentityFilter,
  AdminAuditListQuery,
} from "./admin.audit.types.js";

const MAXIMUM_IDENTITY_MATCHES = 50;

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export async function resolveAdminAuditIdentityFilter(
  value: string,
  options: { allowSystem: boolean; allowNone: boolean },
): Promise<{
  filter: AdminAuditIdentityFilter;
  tooBroad: boolean;
}> {
  if (!value) {
    return { filter: { kind: "any" }, tooBroad: false };
  }

  const normalized = value.toLowerCase();

  if (options.allowSystem && normalized === "system") {
    return { filter: { kind: "system" }, tooBroad: false };
  }

  if (
    options.allowNone &&
    (normalized === "none" || normalized === "unassigned")
  ) {
    return { filter: { kind: "none" }, tooBroad: false };
  }

  if (/^[a-fA-F0-9]{24}$/u.test(value)) {
    return {
      filter: { kind: "users", userIds: [new ObjectId(value)] },
      tooBroad: false,
    };
  }

  const { users } = await getAuthCollections();
  const escaped = escapeRegularExpression(value);
  const emailPrefix = new RegExp(`^${escaped}`, "iu");
  const displayNameMatch = new RegExp(escaped, "iu");

  const matches = await users
    .find(
      {
        $or: [
          { emailNormalized: emailPrefix },
          { emailDisplay: emailPrefix },
          { displayName: displayNameMatch },
        ],
      },
      { projection: { _id: 1 } },
    )
    .sort({ updatedAt: -1, _id: -1 })
    .limit(MAXIMUM_IDENTITY_MATCHES + 1)
    .toArray();

  return {
    filter:
      matches.length === 0
        ? { kind: "users", userIds: [] }
        : {
            kind: "users",
            userIds: matches
              .slice(0, MAXIMUM_IDENTITY_MATCHES)
              .map((item) => item._id),
          },
    tooBroad: matches.length > MAXIMUM_IDENTITY_MATCHES,
  };
}

function applyIdentityFilter(
  filter: Filter<AdminAuditEventDocument>,
  field: "actorUserId" | "targetUserId",
  identity: AdminAuditIdentityFilter,
): void {
  if (identity.kind === "any") {
    return;
  }

  const value =
    identity.kind === "system" || identity.kind === "none"
      ? null
      : { $in: identity.userIds };

  if (field === "actorUserId") {
    filter.actorUserId = value;
  } else {
    filter.targetUserId = value;
  }
}

export function buildAdminAuditEventFilter(
  query: AdminAuditListQuery,
  categoryEvents: AdminAuditEvent[] | null,
  actor: AdminAuditIdentityFilter,
  target: AdminAuditIdentityFilter,
): Filter<AdminAuditEventDocument> {
  const filter: Filter<AdminAuditEventDocument> = {};

  if (query.event !== "all") {
    filter.eventType = query.event;
  } else if (categoryEvents !== null) {
    filter.eventType = { $in: categoryEvents };
  }

  if (query.outcome !== "all") {
    filter.outcome = query.outcome;
  }

  applyIdentityFilter(filter, "actorUserId", actor);
  applyIdentityFilter(filter, "targetUserId", target);

  if (query.from || query.to) {
    filter.createdAt = {
      ...(query.from ? { $gte: query.from } : {}),
      ...(query.to ? { $lte: query.to } : {}),
    };
  }

  return filter;
}

export async function findAdminAuditEvents(
  input: {
    query: AdminAuditListQuery;
    filter: Filter<AdminAuditEventDocument>;
  },
): Promise<{
  documents: AdminAuditEventDocument[];
  totalItems: number;
}> {
  const { auditEvents } = await getAdminCollections();
  const skip = (input.query.page - 1) * input.query.pageSize;

  const [documents, totalItems] = await Promise.all([
    auditEvents
      .find(input.filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(input.query.pageSize)
      .toArray(),
    auditEvents.countDocuments(input.filter),
  ]);

  return { documents, totalItems };
}

export async function findAdminAuditUsers(
  userIds: ObjectId[],
): Promise<FilmGeezerUserDocument[]> {
  if (userIds.length === 0) {
    return [];
  }

  const { users } = await getAuthCollections();

  return users
    .find({ _id: { $in: userIds } })
    .toArray();
}
