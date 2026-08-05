import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { z } from "zod";

import {
  getAuthenticatedSessionContext,
} from "../middleware/auth.middleware.js";
import {
  NotificationNotFoundError,
  NotificationPersistenceError,
} from "../features/notifications/notification.errors.js";
import {
  getNotification,
  getNotificationSummary,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../features/notifications/notification.service.js";

function serializeNotification(
  notification: Awaited<ReturnType<typeof getNotification>>,
) {
  return {
    ...notification,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  };
}

function sendNotificationError(
  response: Response,
  error: unknown,
): boolean {
  if (error instanceof z.ZodError) {
    response.status(400).json({
      status: "error",
      code: "NOTIFICATION_INVALID_INPUT",
      message: "The notification request is invalid.",
      errors: error.flatten(),
    });
    return true;
  }

  if (error instanceof NotificationNotFoundError) {
    response.status(404).json({
      status: "error",
      code: error.code,
      message: error.message,
    });
    return true;
  }

  if (error instanceof NotificationPersistenceError) {
    response.status(503).json({
      status: "error",
      code: error.code,
      message: error.message,
    });
    return true;
  }

  return false;
}

export async function getCurrentNotifications(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result = await listNotifications(auth.userId, request.query);

    response.status(200).json({
      status: "success",
      code: "NOTIFICATIONS_READY",
      notifications: result.items.map(serializeNotification),
      unreadCount: result.unreadCount,
      pagination: result.pagination,
    });
  } catch (error) {
    if (sendNotificationError(response, error)) {
      return;
    }

    next(error);
  }
}

export async function getCurrentNotificationSummary(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result = await getNotificationSummary(auth.userId, request.query);

    response.status(200).json({
      status: "success",
      code: "NOTIFICATION_SUMMARY_READY",
      notifications: result.items.map(serializeNotification),
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    if (sendNotificationError(response, error)) {
      return;
    }

    next(error);
  }
}

export async function getCurrentNotification(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const notification = await getNotification(
      auth.userId,
      typeof request.params.notificationId === "string"
        ? request.params.notificationId
        : "",
    );

    response.status(200).json({
      status: "success",
      code: "NOTIFICATION_READY",
      notification: serializeNotification(notification),
    });
  } catch (error) {
    if (sendNotificationError(response, error)) {
      return;
    }

    next(error);
  }
}

export async function markCurrentNotificationRead(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result = await markNotificationRead(
      auth.userId,
      typeof request.params.notificationId === "string"
        ? request.params.notificationId
        : "",
    );

    response.status(200).json({
      status: "success",
      code: "NOTIFICATION_MARKED_READ",
      message: result.changed
        ? "The notification was marked as read."
        : "The notification was already read.",
      changed: result.changed,
      notification: serializeNotification(result.notification),
    });
  } catch (error) {
    if (sendNotificationError(response, error)) {
      return;
    }

    next(error);
  }
}

export async function markAllCurrentNotificationsRead(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  response.setHeader("Cache-Control", "no-store");

  try {
    const auth = getAuthenticatedSessionContext(request);
    const result = await markAllNotificationsRead(auth.userId);

    response.status(200).json({
      status: "success",
      code: "ALL_NOTIFICATIONS_MARKED_READ",
      message:
        result.changedCount > 0
          ? "All notifications were marked as read."
          : "There were no unread notifications.",
      changedCount: result.changedCount,
      readAt: result.readAt.toISOString(),
    });
  } catch (error) {
    if (sendNotificationError(response, error)) {
      return;
    }

    next(error);
  }
}
