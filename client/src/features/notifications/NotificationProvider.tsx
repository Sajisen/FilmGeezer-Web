import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "../auth/authContext";
import {
  getNotificationSummary,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationService";
import type { UserNotification } from "../../types/notification";
import {
  NotificationContext,
  type NotificationContextValue,
  type NotificationSummaryStatus,
} from "./notificationContext";

const SUMMARY_LIMIT = 6;
const REFRESH_INTERVAL_MS = 60_000;
const BROADCAST_CHANNEL_NAME = "filmgeezer-notifications";

interface NotificationState {
  status: NotificationSummaryStatus;
  notifications: UserNotification[];
  unreadCount: number;
  errorMessage: string | null;
}

const INITIAL_STATE: NotificationState = {
  status: "idle",
  notifications: [],
  unreadCount: 0,
  errorMessage: null,
};

export function NotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const auth = useAuth();
  const [state, setState] = useState<NotificationState>(INITIAL_STATE);
  const requestControllerRef = useRef<AbortController | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const refreshSummary = useCallback(async () => {
    if (auth.status !== "authenticated") {
      setState(INITIAL_STATE);
      return;
    }

    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    setState((current) => ({
      ...current,
      status: current.status === "ready" ? "ready" : "loading",
      errorMessage: null,
    }));

    try {
      const response = await getNotificationSummary(
        controller.signal,
        SUMMARY_LIMIT,
      );

      if (!controller.signal.aborted) {
        setState({
          status: "ready",
          notifications: response.notifications,
          unreadCount: response.unreadCount,
          errorMessage: null,
        });
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      if (!controller.signal.aborted) {
        setState((current) => ({
          ...current,
          status: "error",
          errorMessage:
            error instanceof Error
              ? error.message
              : "FilmGeezer could not load your notifications.",
        }));
      }
    }
  }, [auth.status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (auth.status !== "authenticated") {
        requestControllerRef.current?.abort();
        setState(INITIAL_STATE);
        return;
      }

      void refreshSummary();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      requestControllerRef.current?.abort();
    };
  }, [auth.status, auth.user?.userId, refreshSummary]);

  useEffect(() => {
    if (auth.status !== "authenticated") {
      return;
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void refreshSummary();
      }
    }

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshSummary();
      }
    }, REFRESH_INTERVAL_MS);

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [auth.status, refreshSummary]);

  useEffect(() => {
    if (
      auth.status !== "authenticated" ||
      !("BroadcastChannel" in window)
    ) {
      return;
    }

    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channelRef.current = channel;

    channel.addEventListener("message", () => {
      if (auth.status === "authenticated") {
        void refreshSummary();
      }
    });

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [auth.status, refreshSummary]);

  const markRead = useCallback(
    async (notificationId: string): Promise<UserNotification> => {
      if (auth.status !== "authenticated" || !auth.csrfToken) {
        throw new Error("Sign in again before updating notifications.");
      }

      const optimisticReadAt = new Date().toISOString();
      const targetWasUnread = state.notifications.some(
        (item) => item.id === notificationId && item.readAt === null,
      );

      if (targetWasUnread) {
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((item) =>
            item.id === notificationId
              ? { ...item, readAt: optimisticReadAt }
              : item,
          ),
          unreadCount: Math.max(0, current.unreadCount - 1),
        }));
      }

      try {
        const response = await markNotificationRead(
          notificationId,
          auth.csrfToken,
        );

        setState((current) => ({
          ...current,
          notifications: current.notifications.map((item) =>
            item.id === notificationId ? response.notification : item,
          ),
          unreadCount:
            response.changed && !targetWasUnread
              ? Math.max(0, current.unreadCount - 1)
              : current.unreadCount,
        }));
        channelRef.current?.postMessage({ type: "changed" });

        return response.notification;
      } catch (error) {
        void refreshSummary();
        throw error;
      }
    },
    [
      auth.csrfToken,
      auth.status,
      refreshSummary,
      state.notifications,
    ],
  );

  const markAllRead = useCallback(async () => {
    if (auth.status !== "authenticated" || !auth.csrfToken) {
      throw new Error("Sign in again before updating notifications.");
    }

    const optimisticReadAt = new Date().toISOString();

    setState((current) => ({
      ...current,
      notifications: current.notifications.map((item) => ({
        ...item,
        readAt: item.readAt ?? optimisticReadAt,
      })),
      unreadCount: 0,
    }));

    try {
      const response = await markAllNotificationsRead(auth.csrfToken);
      channelRef.current?.postMessage({ type: "changed" });

      return {
        changedCount: response.changedCount,
        readAt: response.readAt,
      };
    } catch (error) {
      void refreshSummary();
      throw error;
    }
  }, [auth.csrfToken, auth.status, refreshSummary]);

  const contextValue = useMemo<NotificationContextValue>(
    () => ({
      status: state.status,
      notifications: state.notifications,
      unreadCount: state.unreadCount,
      errorMessage: state.errorMessage,
      refreshSummary,
      markRead,
      markAllRead,
    }),
    [markAllRead, markRead, refreshSummary, state],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}
