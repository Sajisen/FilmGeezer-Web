import type { ObjectId } from "mongodb";

import { initializeAuthStorage } from "../auth/auth.indexes.js";
import { createProfileImagePath } from "../profile-image/profileImage.path.js";
import {
  AdminAuditFilterTooBroadError,
  AdminAuditPersistenceError,
} from "./admin.audit.errors.js";
import {
  buildAdminAuditEventFilter,
  findAdminAuditEvents,
  findAdminAuditUsers,
  resolveAdminAuditIdentityFilter,
} from "./admin.audit.repository.js";
import type {
  AdminAuditCategory,
  AdminAuditEntry,
  AdminAuditIdentitySummary,
  AdminAuditListResult,
} from "./admin.audit.types.js";
import { adminAuditListQuerySchema } from "./admin.audit.validation.js";
import { initializeAdminStorage } from "./admin.indexes.js";
import type {
  AdminAuditDetailValue,
  AdminAuditEvent,
  AdminAuditEventDocument,
  AdminSessionContext,
} from "./admin.types.js";

const AUDIT_EVENT_CATEGORIES: Record<AdminAuditEvent, AdminAuditCategory> = {
  "admin-login-succeeded": "authentication",
  "admin-login-failed": "authentication",
  "admin-mfa-challenge-created": "authentication",
  "admin-mfa-challenge-failed": "authentication",
  "admin-mfa-login-succeeded": "authentication",

  "admin-mfa-setup-started": "security",
  "admin-mfa-enabled": "security",
  "admin-mfa-disabled": "security",
  "admin-mfa-recovery-used": "security",
  "admin-mfa-recovery-regenerated": "security",
  "admin-reauthentication-succeeded": "security",
  "admin-reauthentication-failed": "security",
  "admin-mfa-reset": "security",
  "admin-passkey-registration-started": "security",
  "admin-passkey-registered": "security",
  "admin-passkey-authentication-succeeded": "security",
  "admin-passkey-authentication-failed": "security",
  "admin-passkey-revoked": "security",
  "admin-passkey-used-for-reauthentication": "security",
  "admin-passkey-emergency-reset": "security",

  "admin-logout": "sessions",
  "admin-session-revoked": "sessions",

  "admin-role-granted": "roles",
  "admin-role-revoked": "roles",

  "admin-support-replied": "support",
  "admin-support-status-updated": "support",

  "admin-user-suspended": "users",
  "admin-user-reactivated": "users",
  "admin-user-session-revoked": "users",
  "admin-user-sessions-revoked": "users",

  "admin-content-created": "content",
  "admin-content-updated": "content",
  "admin-content-status-updated": "content",
};

const SAFE_DETAIL_KEYS = new Set([
  "accessLevel",
  "active",
  "adminSessionId",
  "attachment",
  "attemptsRemaining",
  "authenticationMethod",
  "backedUp",
  "changed",
  "deletedPasskeys",
  "deviceType",
  "existingPasskeys",
  "linkCount",
  "mediaType",
  "messageLength",
  "method",
  "nextStatus",
  "passkeyAllowed",
  "passkeyCount",
  "passwordHashReplaced",
  "previousStatus",
  "reason",
  "recoveryAllowed",
  "recoveryCodeCount",
  "recoveryCodesGenerated",
  "recoveryCodesRemaining",
  "referenceId",
  "remainingPasskeys",
  "restoredStatus",
  "revision",
  "revokedAdminSessions",
  "revokedOtherSessions",
  "revokedPublicSessions",
  "revokedSessions",
  "sessionId",
  "sessionsRevokedForLimit",
  "source",
  "sourceCount",
  "tmdbId",
  "totpAllowed",
  "verificationMethod",
]);

function eventsForCategory(
  category: AdminAuditCategory | "all",
): AdminAuditEvent[] | null {
  if (category === "all") {
    return null;
  }

  return (Object.entries(AUDIT_EVENT_CATEGORIES) as Array<
    [AdminAuditEvent, AdminAuditCategory]
  >)
    .filter(([, eventCategory]) => eventCategory === category)
    .map(([eventType]) => eventType);
}

function sanitizeString(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 180);
}

function sanitizeDetailValue(
  key: string,
  value: AdminAuditDetailValue,
): AdminAuditDetailValue {
  if (typeof value !== "string") {
    return value;
  }

  const sanitized = sanitizeString(value);

  if (key === "sessionId" || key === "adminSessionId") {
    return sanitized.length > 12
      ? `${sanitized.slice(0, 12)}…`
      : sanitized;
  }

  return sanitized;
}

function sanitizeAuditDetails(
  details: Record<string, AdminAuditDetailValue>,
): Record<string, AdminAuditDetailValue> {
  const safeDetails: Record<string, AdminAuditDetailValue> = {};

  for (const [key, value] of Object.entries(details)) {
    if (!SAFE_DETAIL_KEYS.has(key)) {
      continue;
    }

    safeDetails[key] = sanitizeDetailValue(key, value);
  }

  return safeDetails;
}

function collectUserIds(
  documents: AdminAuditEventDocument[],
): ObjectId[] {
  const byHexId = new Map<string, ObjectId>();

  for (const document of documents) {
    for (const userId of [document.actorUserId, document.targetUserId]) {
      if (userId) {
        byHexId.set(userId.toHexString(), userId);
      }
    }
  }

  return [...byHexId.values()];
}

function createIdentitySummary(
  userId: ObjectId,
  usersById: Map<
    string,
    Awaited<ReturnType<typeof findAdminAuditUsers>>[number]
  >,
): AdminAuditIdentitySummary {
  const user = usersById.get(userId.toHexString());

  if (!user) {
    return {
      kind: "unknown-user",
      userId: userId.toHexString(),
      email: null,
      displayName: "Unavailable account",
      profileImagePath: null,
      roles: [],
      status: null,
    };
  }

  return {
    kind: "user",
    userId: user._id.toHexString(),
    email: user.emailDisplay,
    displayName: user.displayName,
    profileImagePath: createProfileImagePath(user),
    roles: user.roles,
    status: user.status,
  };
}

function toAuditEntry(
  document: AdminAuditEventDocument,
  usersById: Map<
    string,
    Awaited<ReturnType<typeof findAdminAuditUsers>>[number]
  >,
): AdminAuditEntry {
  return {
    auditEventId: document._id.toHexString(),
    eventType: document.eventType,
    category: AUDIT_EVENT_CATEGORIES[document.eventType],
    outcome: document.outcome,
    actor: document.actorUserId
      ? createIdentitySummary(document.actorUserId, usersById)
      : {
          kind: "system",
          userId: null,
          email: null,
          displayName: "FilmGeezer system",
          profileImagePath: null,
          roles: [],
          status: null,
        },
    target: document.targetUserId
      ? createIdentitySummary(document.targetUserId, usersById)
      : null,
    details: sanitizeAuditDetails(document.details),
    userAgentSummary: document.userAgentSummary
      ? sanitizeString(document.userAgentSummary).slice(0, 256)
      : null,
    createdAt: document.createdAt,
  };
}

export async function listAdminAuditEvents(
  _administrator: AdminSessionContext,
  rawQuery: unknown,
): Promise<AdminAuditListResult> {
  const query = adminAuditListQuerySchema.parse(rawQuery);

  try {
    await Promise.all([initializeAdminStorage(), initializeAuthStorage()]);

    const [actorResolution, targetResolution] = await Promise.all([
      resolveAdminAuditIdentityFilter(query.actor, {
        allowSystem: true,
        allowNone: false,
      }),
      resolveAdminAuditIdentityFilter(query.target, {
        allowSystem: false,
        allowNone: true,
      }),
    ]);

    if (actorResolution.tooBroad) {
      throw new AdminAuditFilterTooBroadError(
        "The actor filter matches too many accounts. Use a more specific email, name, or user ID.",
      );
    }

    if (targetResolution.tooBroad) {
      throw new AdminAuditFilterTooBroadError(
        "The target filter matches too many accounts. Use a more specific email, name, or user ID.",
      );
    }

    const filter = buildAdminAuditEventFilter(
      query,
      eventsForCategory(query.category),
      actorResolution.filter,
      targetResolution.filter,
    );

    const { documents, totalItems } = await findAdminAuditEvents({
      query,
      filter,
    });
    const users = await findAdminAuditUsers(collectUserIds(documents));
    const usersById = new Map(
      users.map((user) => [user._id.toHexString(), user]),
    );
    const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

    return {
      items: documents.map((document) =>
        toAuditEntry(document, usersById),
      ),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages,
      },
    };
  } catch (error) {
    if (error instanceof AdminAuditFilterTooBroadError) {
      throw error;
    }

    throw new AdminAuditPersistenceError(
      "Administrator audit records are temporarily unavailable.",
      { cause: error },
    );
  }
}
