import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  AdminAuditFilterTooBroadError,
  AdminAuditPersistenceError,
} from "../features/admin/admin.audit.errors.js";
import { listAdminAuditEvents } from "../features/admin/admin.audit.service.js";
import { getAdminContext } from "../middleware/admin.middleware.js";

function readQueryValue(
  request: Request,
  key: string,
): string | undefined {
  const value = request.query[key];
  return typeof value === "string" ? value : undefined;
}

export async function getAdminAuditEvents(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const result = await listAdminAuditEvents(
      getAdminContext(request),
      {
        page: readQueryValue(request, "page"),
        pageSize: readQueryValue(request, "pageSize"),
        category: readQueryValue(request, "category"),
        event: readQueryValue(request, "event"),
        outcome: readQueryValue(request, "outcome"),
        actor: readQueryValue(request, "actor"),
        target: readQueryValue(request, "target"),
        from: readQueryValue(request, "from"),
        to: readQueryValue(request, "to"),
      },
    );

    response.status(200).json({
      status: "success",
      code: "ADMIN_AUDIT_EVENTS_READY",
      items: result.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      response.status(400).json({
        status: "error",
        code: "ADMIN_AUDIT_VALIDATION_FAILED",
        message:
          error.issues[0]?.message ??
          "The administrator audit request is invalid.",
      });
      return;
    }

    if (error instanceof AdminAuditFilterTooBroadError) {
      response.status(400).json({
        status: "error",
        code: "ADMIN_AUDIT_FILTER_TOO_BROAD",
        message: error.message,
      });
      return;
    }

    if (error instanceof AdminAuditPersistenceError) {
      response.status(503).json({
        status: "error",
        code: "ADMIN_AUDIT_TEMPORARILY_UNAVAILABLE",
        message: error.message,
      });
      return;
    }

    next(error);
  }
}
