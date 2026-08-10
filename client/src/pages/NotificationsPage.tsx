import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";

import {
  BellIcon,
  CheckIcon,
  UserIcon,
} from "../components/navigation/NavigationIcons";
import { useAuth } from "../features/auth/authContext";
import { createAuthRouteState } from "../features/auth/authNavigation";
import NotificationCard from "../features/notifications/components/NotificationCard";
import WelcomeNotificationDialog from "../features/notifications/components/WelcomeNotificationDialog";
import { useNotifications } from "../features/notifications/notificationContext";
import {
  getNotification,
  getNotifications,
  NotificationApiError,
} from "../services/notificationService";
import type {
  NotificationListFilter,
  NotificationPagination,
  UserNotification,
} from "../types/notification";

const LIST_REFRESH_INTERVAL_MS = 60_000;

const INITIAL_PAGINATION: NotificationPagination = {
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 1,
};

function NotificationsPage() {
  const auth = useAuth();
  const notificationSummary = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedOpenId = searchParams.get("open");

  const [filter, setFilter] = useState<NotificationListFilter>("all");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [pagination, setPagination] =
    useState<NotificationPagination>(INITIAL_PAGINATION);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [welcomeNotification, setWelcomeNotification] =
    useState<UserNotification | null>(null);
  const listAbortRef = useRef<AbortController | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);
  const openedNotificationRef = useRef<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (auth.status !== "authenticated") {
      return;
    }

    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getNotifications({
        filter,
        page,
        signal: controller.signal,
      });

      if (!controller.signal.aborted) {
        setItems(response.notifications);
        setPagination(response.pagination);
        setUnreadCount(response.unreadCount);
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      if (!controller.signal.aborted) {
        setErrorMessage(
          error instanceof NotificationApiError
            ? error.message
            : "FilmGeezer could not load your notifications.",
        );
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [auth.status, filter, page]);

  useEffect(() => {
    if (auth.status !== "authenticated") {
      return;
    }

    const timer = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => {
      window.clearTimeout(timer);
      listAbortRef.current?.abort();
    };
  }, [auth.status, auth.user?.userId, loadNotifications]);

  useEffect(() => {
    return () => {
      detailAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (auth.status !== "authenticated") {
      return;
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void loadNotifications();
      }
    }

    const interval = window.setInterval(
      refreshWhenVisible,
      LIST_REFRESH_INTERVAL_MS,
    );

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener(
        "visibilitychange",
        refreshWhenVisible,
      );
    };
  }, [auth.status, loadNotifications]);

  useEffect(() => {
    const requestedId = requestedOpenId;

    if (auth.status !== "authenticated" || !requestedId) {
      if (!requestedId) {
        openedNotificationRef.current = null;
      }
      return;
    }

    if (openedNotificationRef.current === requestedId) {
      return;
    }

    const existing = items.find((item) => item.id === requestedId);

    if (existing?.type === "welcome") {
      const timer = window.setTimeout(() => {
        openedNotificationRef.current = requestedId;
        setWelcomeNotification(existing);
      }, 0);

      return () => {
        window.clearTimeout(timer);
      };
    }

    detailAbortRef.current?.abort();
    const controller = new AbortController();
    detailAbortRef.current = controller;

    const timer = window.setTimeout(() => {
      void getNotification(requestedId, controller.signal)
        .then((response) => {
          if (
            !controller.signal.aborted &&
            response.notification.type === "welcome"
          ) {
            openedNotificationRef.current = requestedId;
            setWelcomeNotification(response.notification);
          }
        })
        .catch((error: unknown) => {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return;
          }

          if (!controller.signal.aborted) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : "FilmGeezer could not open this notification.",
            );
          }
        });
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [auth.status, items, requestedOpenId]);

  function requestAuthentication() {
    navigate("/login", {
      state: createAuthRouteState(location),
    });
  }

  function changeFilter(nextFilter: NotificationListFilter) {
    setFilter(nextFilter);
    setPage(1);
    setSuccessMessage(null);
  }

  async function openNotification(notification: UserNotification) {
    setIsMutating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let nextNotification = notification;

      if (notification.readAt === null) {
        nextNotification = await notificationSummary.markRead(notification.id);
        setItems((current) =>
          filter === "unread"
            ? current.filter((item) => item.id !== nextNotification.id)
            : current.map((item) =>
                item.id === nextNotification.id ? nextNotification : item,
              ),
        );
        setUnreadCount((current) => Math.max(0, current - 1));
        setPagination((current) =>
          filter === "unread"
            ? {
                ...current,
                totalItems: Math.max(0, current.totalItems - 1),
              }
            : current,
        );
      }

      if (nextNotification.type === "welcome") {
        setWelcomeNotification(nextNotification);
        setSearchParams(
          (current) => {
            const next = new URLSearchParams(current);
            next.set("open", nextNotification.id);
            return next;
          },
          { replace: true },
        );
        return;
      }

      navigate(nextNotification.action.href);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not open this notification.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function markAllRead() {
    if (unreadCount === 0 || isMutating) {
      return;
    }

    setIsMutating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result = await notificationSummary.markAllRead();
      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? result.readAt,
        })),
      );
      setUnreadCount(0);
      setSuccessMessage(
        result.changedCount > 0
          ? "All notifications were marked as read."
          : "You were already caught up.",
      );

      if (filter === "unread") {
        await loadNotifications();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not update your notifications.",
      );
    } finally {
      setIsMutating(false);
    }
  }

  const closeWelcome = useCallback(() => {
    setWelcomeNotification(null);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("open");
        return next;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  if (auth.status === "loading") {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-slate-950 py-10 text-white"
      >
        <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <div className="h-56 animate-pulse rounded-[2rem] border border-white/[0.07] bg-white/[0.025] motion-reduce:animate-none" />
        </div>
      </main>
    );
  }

  if (auth.status !== "authenticated" || !auth.user) {
    return (
      <main
        id="main-content"
        className="relative min-h-screen overflow-hidden bg-slate-950 py-12 text-white"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.16),transparent_38%),radial-gradient(circle_at_80%_10%,rgba(79,70,229,0.12),transparent_34%)]" />
        <div className="relative mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <section className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-slate-900/70 p-7 text-center shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-200">
              <UserIcon className="h-6 w-6" />
            </span>
            <h1 className="mt-5 text-3xl font-black tracking-tight">
              Sign in to see notifications
            </h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-400">
              Account updates, welcome messages, and replies from FilmGeezer Support are private to your account.
            </p>
            <button
              type="button"
              onClick={requestAuthentication}
              className="mt-6 min-h-11 rounded-full bg-sky-500 px-6 text-sm font-black text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            >
              Sign in
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-x-clip bg-slate-950 py-8 text-white sm:py-11"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_14%_0%,rgba(14,165,233,0.16),transparent_38%),radial-gradient(circle_at_86%_4%,rgba(99,102,241,0.13),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/60 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="border-b border-white/[0.07] px-5 py-6 sm:px-7 sm:py-8 lg:px-9">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-[0.68rem] font-black uppercase tracking-[0.2em] text-sky-300">
                  <BellIcon className="h-4 w-4" />
                  Account activity
                </div>
                <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                  Notifications
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
                  Keep track of FilmGeezer account updates and replies from the support team. Essential account notifications remain available here even when optional email preferences are added later.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  aria-live="polite"
                  aria-atomic="true"
                  className="rounded-full border border-white/[0.08] bg-slate-950/35 px-3.5 py-2 text-xs font-black text-slate-300"
                >
                  {unreadCount} unread
                </span>
                <button
                  type="button"
                  disabled={unreadCount === 0 || isMutating}
                  onClick={() => void markAllRead()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-sky-300/18 bg-sky-400/[0.08] px-4 text-xs font-black text-sky-100 transition hover:bg-sky-400/[0.13] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <CheckIcon className="h-4 w-4" />
                  Mark all read
                </button>
              </div>
            </div>
          </div>

          <div
            aria-busy={isLoading || isMutating}
            className="p-4 sm:p-6 lg:p-8"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="group"
                aria-label="Notification filter"
                className="inline-flex rounded-full border border-white/[0.08] bg-slate-950/40 p-1"
              >
                {(["all", "unread"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={filter === value}
                    onClick={() => changeFilter(value)}
                    className={`min-h-9 rounded-full px-4 text-xs font-black capitalize transition ${
                      filter === value
                        ? "bg-sky-500 text-white shadow-lg shadow-sky-950/25"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void loadNotifications()}
                disabled={isLoading}
                className="rounded-full border border-white/[0.08] px-3.5 py-2 text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-wait disabled:opacity-50"
              >
                {isLoading ? "Refreshing…" : "Refresh"}
              </button>
            </div>

            {errorMessage ? (
              <div
                role="alert"
                className="mt-4 rounded-2xl border border-rose-300/15 bg-rose-400/[0.08] px-4 py-3 text-sm font-bold text-rose-100"
              >
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div
                role="status"
                className="mt-4 rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-4 py-3 text-sm font-bold text-emerald-100"
              >
                {successMessage}
              </div>
            ) : null}

            <div className="mt-5">
              {isLoading ? (
                <div className="space-y-3" role="status">
                  <span className="sr-only">Loading notifications</span>
                  {[0, 1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-32 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.025] motion-reduce:animate-none"
                    />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="grid min-h-72 place-items-center rounded-[1.6rem] border border-dashed border-white/[0.09] bg-slate-950/30 p-8 text-center">
                  <div>
                    <span className="mx-auto grid h-13 w-13 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-slate-500">
                      <BellIcon className="h-6 w-6" />
                    </span>
                    <h2 className="mt-4 text-lg font-black text-white">
                      {filter === "unread"
                        ? "No unread notifications"
                        : "No notifications yet"}
                    </h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                      {filter === "unread"
                        ? "You are caught up. Switch to All to revisit earlier updates."
                        : "Welcome messages and support replies will appear here when they are available."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((notification) => (
                    <NotificationCard
                      key={notification.id}
                      notification={notification}
                      disabled={isMutating}
                      onOpen={(item) => {
                        void openNotification(item);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {pagination.totalPages > 1 ? (
              <nav
                aria-label="Notification pages"
                className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-5"
              >
                <p className="text-xs font-semibold text-slate-500">
                  Page {pagination.page} of {pagination.totalPages} · {pagination.totalItems} notifications
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="min-h-10 rounded-full border border-white/[0.08] px-4 text-xs font-black text-slate-300 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages || isLoading}
                    onClick={() =>
                      setPage((current) =>
                        Math.min(pagination.totalPages, current + 1),
                      )
                    }
                    className="min-h-10 rounded-full border border-white/[0.08] px-4 text-xs font-black text-slate-300 transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </nav>
            ) : null}
          </div>
        </section>
      </div>

      {welcomeNotification ? (
        <WelcomeNotificationDialog
          notification={welcomeNotification}
          displayName={auth.user.displayName}
          onClose={closeWelcome}
        />
      ) : null}
    </main>
  );
}

export default NotificationsPage;
