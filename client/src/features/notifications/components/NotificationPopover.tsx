import type { UserNotification } from "../../../types/notification";
import { BellIcon } from "../../../components/navigation/NavigationIcons";
import type { NotificationSummaryStatus } from "../notificationContext";
import NotificationCard from "./NotificationCard";

export default function NotificationPopover({
  status,
  notifications,
  unreadCount,
  errorMessage,
  isMutating,
  onOpenNotification,
  onMarkAllRead,
  onViewAll,
  onRetry,
}: {
  status: NotificationSummaryStatus;
  notifications: UserNotification[];
  unreadCount: number;
  errorMessage: string | null;
  isMutating: boolean;
  onOpenNotification: (notification: UserNotification) => void;
  onMarkAllRead: () => void;
  onViewAll: () => void;
  onRetry: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Recent notifications"
      className="absolute right-0 top-[calc(100%+0.75rem)] z-[75] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-900/98 shadow-2xl shadow-black/60 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-4 py-4">
        <div>
          <p className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-sky-300">
            Your activity
          </p>
          <h2 className="mt-1 text-base font-black text-white">
            Notifications
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} unread ${unreadCount === 1 ? "update" : "updates"}`
              : "You are all caught up"}
          </p>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            disabled={isMutating}
            onClick={onMarkAllRead}
            className="rounded-full border border-sky-300/15 bg-sky-400/[0.07] px-3 py-1.5 text-[0.68rem] font-black text-sky-200 transition hover:bg-sky-400/[0.12] disabled:cursor-wait disabled:opacity-50"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="max-h-[28rem] overflow-y-auto p-2.5">
        {status === "loading" || status === "idle" ? (
          <div className="space-y-2" role="status" aria-label="Loading notifications">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03] motion-reduce:animate-none"
              />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-rose-300/15 bg-rose-400/[0.07] p-4 text-center">
            <p className="text-sm font-bold text-rose-100">{errorMessage}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 rounded-full border border-rose-300/20 px-3 py-1.5 text-xs font-black text-rose-100 transition hover:bg-rose-400/10"
            >
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-slate-950/30 p-6 text-center">
            <div>
              <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl border border-white/[0.08] bg-white/[0.035] text-slate-500">
                <BellIcon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-black text-white">Nothing new yet</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Account and support updates will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                compact
                disabled={isMutating}
                onOpen={onOpenNotification}
              />
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.07] p-2.5">
        <button
          type="button"
          onClick={onViewAll}
          className="min-h-11 w-full rounded-xl bg-white/[0.045] px-4 text-sm font-black text-slate-200 transition hover:bg-white/[0.075] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
}
