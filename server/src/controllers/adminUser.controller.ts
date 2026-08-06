import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  AdminUserFinalAdministratorError,
  AdminUserNotFoundError,
  AdminUserPersistenceError,
  AdminUserSelfActionError,
  AdminUserSessionNotFoundError,
  AdminUserStateConflictError,
} from "../features/admin/admin.user.errors.js";
import {
  getAdminUser,
  listAdminUsers,
  reactivateAdminUser,
  revokeAdminUserSession,
  revokeAllAdminUserSessions,
  suspendAdminUser,
} from "../features/admin/admin.user.service.js";
import type {
  AdminManagedUserDetail,
  AdminManagedUserSummary,
} from "../features/admin/admin.user.types.js";
import { getAdminContext } from "../middleware/admin.middleware.js";

function createRequestMetadata(request: Request) {
  return {
    ipAddress: request.ip || request.socket.remoteAddress || null,
    userAgent: request.get("user-agent") ?? null,
  };
}

function serializeSummary(user: AdminManagedUserSummary) {
  return {
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
  };
}

function serializeDetail(detail: AdminManagedUserDetail) {
  return {
    user: {
      ...serializeSummary(detail.user),
      emailVerifiedAt:
        detail.user.emailVerifiedAt?.toISOString() ?? null,
      suspendedAt: detail.user.suspendedAt?.toISOString() ?? null,
      deactivatedAt:
        detail.user.deactivatedAt?.toISOString() ?? null,
      deletedAt: detail.user.deletedAt?.toISOString() ?? null,
    },
    identities: detail.identities.map((identity) => ({
      ...identity,
      createdAt: identity.createdAt.toISOString(),
    })),
    activeSessions: detail.activeSessions.map((session) => ({
      ...session,
      createdAt: session.createdAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      recentAuthenticationAt:
        session.recentAuthenticationAt?.toISOString() ?? null,
      expiresAt: session.expiresAt.toISOString(),
    })),
    permissions: detail.permissions,
  };
}

function sendAdminUserError(
  error: unknown,
  response: Response,
): boolean {
  if (error instanceof z.ZodError) {
    response.status(400).json({
      status: "error",
      code: "ADMIN_USER_VALIDATION_FAILED",
      message:
        error.issues[0]?.message ??
        "The administrator user request is invalid.",
    });
    return true;
  }

  if (error instanceof AdminUserNotFoundError) {
    response.status(404).json({
      status: "error",
      code: "ADMIN_USER_NOT_FOUND",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminUserSessionNotFoundError) {
    response.status(404).json({
      status: "error",
      code: "ADMIN_USER_SESSION_NOT_FOUND",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminUserSelfActionError) {
    response.status(409).json({
      status: "error",
      code: "ADMIN_USER_SELF_ACTION_BLOCKED",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminUserFinalAdministratorError) {
    response.status(409).json({
      status: "error",
      code: "ADMIN_FINAL_ADMINISTRATOR_PROTECTED",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminUserStateConflictError) {
    response.status(409).json({
      status: "error",
      code: "ADMIN_USER_STATE_CONFLICT",
      message: error.message,
    });
    return true;
  }

  if (error instanceof AdminUserPersistenceError) {
    response.status(503).json({
      status: "error",
      code: "ADMIN_USERS_TEMPORARILY_UNAVAILABLE",
      message: error.message,
    });
    return true;
  }

  return false;
}

export async function getAdminUsers(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listAdminUsers(
      getAdminContext(request),
      {
        page:
          typeof request.query.page === "string"
            ? request.query.page
            : undefined,
        pageSize:
          typeof request.query.pageSize === "string"
            ? request.query.pageSize
            : undefined,
        status:
          typeof request.query.status === "string"
            ? request.query.status
            : undefined,
        role:
          typeof request.query.role === "string"
            ? request.query.role
            : undefined,
        verification:
          typeof request.query.verification === "string"
            ? request.query.verification
            : undefined,
        search:
          typeof request.query.search === "string"
            ? request.query.search
            : undefined,
      },
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_USERS_READY",
      items: result.items.map(serializeSummary),
      pagination: result.pagination,
    });
  } catch (error) {
    if (!sendAdminUserError(error, response)) {
      next(error);
    }
  }
}

export async function getAdminUserDetail(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await getAdminUser(
      getAdminContext(request),
      request.params.userId,
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_USER_READY",
      detail: serializeDetail(detail),
    });
  } catch (error) {
    if (!sendAdminUserError(error, response)) {
      next(error);
    }
  }
}

export async function postAdminUserSuspension(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await suspendAdminUser(
      getAdminContext(request),
      request.params.userId,
      request.body,
      createRequestMetadata(request),
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_USER_SUSPENDED",
      message:
        "The FilmGeezer account was suspended and its active sessions were revoked.",
      detail: serializeDetail(detail),
    });
  } catch (error) {
    if (!sendAdminUserError(error, response)) {
      next(error);
    }
  }
}

export async function postAdminUserReactivation(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await reactivateAdminUser(
      getAdminContext(request),
      request.params.userId,
      request.body,
      createRequestMetadata(request),
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_USER_REACTIVATED",
      message:
        detail.user.status === "pending"
          ? "The FilmGeezer account was restored to pending verification."
          : "The FilmGeezer account was reactivated.",
      detail: serializeDetail(detail),
    });
  } catch (error) {
    if (!sendAdminUserError(error, response)) {
      next(error);
    }
  }
}

export async function deleteAdminUserSession(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const detail = await revokeAdminUserSession(
      getAdminContext(request),
      request.params.userId,
      request.params.sessionId,
      createRequestMetadata(request),
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_USER_SESSION_REVOKED",
      message: "The selected public FilmGeezer session was revoked.",
      detail: serializeDetail(detail),
    });
  } catch (error) {
    if (!sendAdminUserError(error, response)) {
      next(error);
    }
  }
}

export async function postAdminUserSessionsRevocation(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await revokeAllAdminUserSessions(
      getAdminContext(request),
      request.params.userId,
      createRequestMetadata(request),
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_USER_SESSIONS_REVOKED",
      message:
        result.revokedSessions === 1
          ? "One public FilmGeezer session was revoked."
          : `${result.revokedSessions} public FilmGeezer sessions were revoked.`,
      revokedSessions: result.revokedSessions,
      detail: serializeDetail(result.detail),
    });
  } catch (error) {
    if (!sendAdminUserError(error, response)) {
      next(error);
    }
  }
}
