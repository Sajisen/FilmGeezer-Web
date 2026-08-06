import { createContext, useContext } from "react";

import type { UserNotification } from "../../types/notification";

export type NotificationSummaryStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error";

export interface NotificationContextValue {
  status: NotificationSummaryStatus;
  notifications: UserNotification[];
  unreadCount: number;
  errorMessage: string | null;
  refreshSummary: () => Promise<void>;
  markRead: (notificationId: string) => Promise<UserNotification>;
  markAllRead: () => Promise<{
    changedCount: number;
    readAt: string;
  }>;
}

export const NotificationContext =
  createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider.",
    );
  }

  return context;
}
