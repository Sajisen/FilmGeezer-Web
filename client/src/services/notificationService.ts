import type {
  NotificationDetailResponse,
  NotificationErrorPayload,
  NotificationListFilter,
  NotificationListResponse,
  NotificationReadAllResponse,
  NotificationReadResponse,
  NotificationSummaryResponse,
  UserNotification,
} from "../types/notification";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class NotificationApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(
    status: number,
    payload: NotificationErrorPayload,
    fallbackMessage: string,
  ) {
    super(payload.message?.trim() || fallbackMessage);
    this.name = "NotificationApiError";
    this.status = status;
    this.code = typeof payload.code === "string" ? payload.code : null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNotification(value: unknown): value is UserNotification {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    (value.type === "welcome" || value.type === "support-reply") &&
    (value.category === "account" || value.category === "support") &&
    typeof value.title === "string" &&
    typeof value.message === "string" &&
    isRecord(value.action) &&
    (value.action.kind === "welcome" ||
      value.action.kind === "support-conversation") &&
    typeof value.action.label === "string" &&
    typeof value.action.href === "string" &&
    (value.sourceReference === null ||
      typeof value.sourceReference === "string") &&
    typeof value.createdAt === "string" &&
    (value.readAt === null || typeof value.readAt === "string")
  );
}

function isNotificationArray(value: unknown): value is UserNotification[] {
  return Array.isArray(value) && value.every(isNotification);
}

function isListResponse(value: unknown): value is NotificationListResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "NOTIFICATIONS_READY" &&
    isNotificationArray(value.notifications) &&
    typeof value.unreadCount === "number" &&
    isRecord(value.pagination) &&
    typeof value.pagination.page === "number" &&
    typeof value.pagination.pageSize === "number" &&
    typeof value.pagination.totalItems === "number" &&
    typeof value.pagination.totalPages === "number"
  );
}

function isSummaryResponse(
  value: unknown,
): value is NotificationSummaryResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "NOTIFICATION_SUMMARY_READY" &&
    isNotificationArray(value.notifications) &&
    typeof value.unreadCount === "number"
  );
}

function isDetailResponse(
  value: unknown,
): value is NotificationDetailResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "NOTIFICATION_READY" &&
    isNotification(value.notification)
  );
}

function isReadResponse(value: unknown): value is NotificationReadResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "NOTIFICATION_MARKED_READ" &&
    typeof value.message === "string" &&
    typeof value.changed === "boolean" &&
    isNotification(value.notification)
  );
}

function isReadAllResponse(
  value: unknown,
): value is NotificationReadAllResponse {
  return (
    isRecord(value) &&
    value.status === "success" &&
    value.code === "ALL_NOTIFICATIONS_MARKED_READ" &&
    typeof value.message === "string" &&
    typeof value.changedCount === "number" &&
    typeof value.readAt === "string"
  );
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function asErrorPayload(value: unknown): NotificationErrorPayload {
  return isRecord(value) ? (value as NotificationErrorPayload) : {};
}

async function requestNotificationsApi(
  path: string,
  init: RequestInit,
): Promise<{ response: Response; payload: unknown }> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: "include",
      ...init,
    });
  } catch {
    throw new NotificationApiError(
      0,
      {},
      "FilmGeezer could not reach the notification service.",
    );
  }

  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new NotificationApiError(
      response.status,
      asErrorPayload(payload),
      "FilmGeezer could not complete the notification request.",
    );
  }

  return { response, payload };
}

export async function getNotificationSummary(
  signal?: AbortSignal,
  limit = 6,
): Promise<NotificationSummaryResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
  });
  const { response, payload } = await requestNotificationsApi(
    `/api/notifications/summary?${params.toString()}`,
    {
      method: "GET",
      signal,
    },
  );

  if (!isSummaryResponse(payload)) {
    throw new NotificationApiError(
      response.status,
      {},
      "FilmGeezer received an unexpected notification summary.",
    );
  }

  return payload;
}

export async function getNotifications(
  input: {
    filter: NotificationListFilter;
    page: number;
    pageSize?: number;
    signal?: AbortSignal;
  },
): Promise<NotificationListResponse> {
  const params = new URLSearchParams({
    filter: input.filter,
    page: String(input.page),
    pageSize: String(input.pageSize ?? 20),
  });
  const { response, payload } = await requestNotificationsApi(
    `/api/notifications?${params.toString()}`,
    {
      method: "GET",
      signal: input.signal,
    },
  );

  if (!isListResponse(payload)) {
    throw new NotificationApiError(
      response.status,
      {},
      "FilmGeezer received an unexpected notification list.",
    );
  }

  return payload;
}

export async function getNotification(
  notificationId: string,
  signal?: AbortSignal,
): Promise<NotificationDetailResponse> {
  const { response, payload } = await requestNotificationsApi(
    `/api/notifications/${encodeURIComponent(notificationId)}`,
    {
      method: "GET",
      signal,
    },
  );

  if (!isDetailResponse(payload)) {
    throw new NotificationApiError(
      response.status,
      {},
      "FilmGeezer received an unexpected notification response.",
    );
  }

  return payload;
}

export async function markNotificationRead(
  notificationId: string,
  csrfToken: string,
): Promise<NotificationReadResponse> {
  const { response, payload } = await requestNotificationsApi(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "PATCH",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    },
  );

  if (!isReadResponse(payload)) {
    throw new NotificationApiError(
      response.status,
      {},
      "FilmGeezer received an unexpected notification update.",
    );
  }

  return payload;
}

export async function markAllNotificationsRead(
  csrfToken: string,
): Promise<NotificationReadAllResponse> {
  const { response, payload } = await requestNotificationsApi(
    "/api/notifications/read-all",
    {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    },
  );

  if (!isReadAllResponse(payload)) {
    throw new NotificationApiError(
      response.status,
      {},
      "FilmGeezer received an unexpected notification update.",
    );
  }

  return payload;
}
