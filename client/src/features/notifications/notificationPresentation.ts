import type {
  NotificationCategory,
  UserNotification,
} from "../../types/notification";

export function formatNotificationTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getNotificationCategoryLabel(
  category: NotificationCategory,
): string {
  return category === "support" ? "Support" : "Account";
}

export function getNotificationAccessibleLabel(
  notification: UserNotification,
): string {
  const unreadLabel = notification.readAt === null ? "Unread. " : "";
  return `${unreadLabel}${notification.title}. ${notification.message}`;
}
