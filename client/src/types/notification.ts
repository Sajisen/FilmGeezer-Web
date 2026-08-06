export type NotificationType =
  | "welcome"
  | "support-reply";

export type NotificationCategory =
  | "account"
  | "support";

export type NotificationActionKind =
  | "welcome"
  | "support-conversation";

export type NotificationListFilter =
  | "all"
  | "unread";

export interface UserNotificationAction {
  kind: NotificationActionKind;
  label: string;
  href: string;
}

export interface UserNotification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  action: UserNotificationAction;
  sourceReference: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface NotificationListResponse {
  status: "success";
  code: "NOTIFICATIONS_READY";
  notifications: UserNotification[];
  unreadCount: number;
  pagination: NotificationPagination;
}

export interface NotificationSummaryResponse {
  status: "success";
  code: "NOTIFICATION_SUMMARY_READY";
  notifications: UserNotification[];
  unreadCount: number;
}

export interface NotificationDetailResponse {
  status: "success";
  code: "NOTIFICATION_READY";
  notification: UserNotification;
}

export interface NotificationReadResponse {
  status: "success";
  code: "NOTIFICATION_MARKED_READ";
  message: string;
  changed: boolean;
  notification: UserNotification;
}

export interface NotificationReadAllResponse {
  status: "success";
  code: "ALL_NOTIFICATIONS_MARKED_READ";
  message: string;
  changedCount: number;
  readAt: string;
}

export interface NotificationErrorPayload {
  status?: "error";
  code?: string;
  message?: string;
}
