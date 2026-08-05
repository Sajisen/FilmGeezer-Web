import type { ObjectId } from "mongodb";

import type {
  NOTIFICATION_ACTION_KIND_VALUES,
  NOTIFICATION_CATEGORY_VALUES,
  NOTIFICATION_LIST_FILTER_VALUES,
  NOTIFICATION_SCHEMA_VERSION,
  NOTIFICATION_TYPE_VALUES,
} from "./notification.constants.js";

export type NotificationType =
  (typeof NOTIFICATION_TYPE_VALUES)[number];

export type NotificationCategory =
  (typeof NOTIFICATION_CATEGORY_VALUES)[number];

export type NotificationActionKind =
  (typeof NOTIFICATION_ACTION_KIND_VALUES)[number];

export type NotificationListFilter =
  (typeof NOTIFICATION_LIST_FILTER_VALUES)[number];

export interface UserNotificationActionDocument {
  kind: NotificationActionKind;
  label: string;
  href: string;
}

export interface UserNotificationDocument {
  _id: ObjectId;
  schemaVersion: typeof NOTIFICATION_SCHEMA_VERSION;

  userId: ObjectId;
  type: NotificationType;
  category: NotificationCategory;

  title: string;
  message: string;
  action: UserNotificationActionDocument;

  dedupeKey: string;
  sourceReference: string | null;

  createdAt: Date;
  readAt: Date | null;
}

export interface UserNotificationItem {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  action: UserNotificationActionDocument;
  sourceReference: string | null;
  createdAt: Date;
  readAt: Date | null;
}

export interface NotificationListQuery {
  filter: NotificationListFilter;
  page: number;
  pageSize: number;
}

export interface NotificationListResult {
  items: UserNotificationItem[];
  unreadCount: number;
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface NotificationSummaryResult {
  items: UserNotificationItem[];
  unreadCount: number;
}
