import {
  BellIcon,
  ContactIcon,
} from "../../../components/navigation/NavigationIcons";
import type { UserNotification } from "../../../types/notification";
import {
  formatNotificationTime,
  getNotificationAccessibleLabel,
  getNotificationCategoryLabel,
} from "../notificationPresentation";

export default function NotificationCard({
  notification,
  compact = false,
  disabled = false,
  onOpen,
}: {
  notification: UserNotification;
  compact?: boolean;
  disabled?: boolean;
  onOpen: (notification: UserNotification) => void;
}) {
  const isUnread = notification.readAt === null;
  const Icon = notification.category === "support" ? ContactIcon : BellIcon;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onOpen(notification)}
      aria-label={getNotificationAccessibleLabel(notification)}
      className={`group relative w-full rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-60 ${
        isUnread
          ? "border-sky-300/20 bg-sky-400/[0.075] hover:border-sky-300/35 hover:bg-sky-400/[0.11]"
          : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.12] hover:bg-white/[0.045]"
      } ${compact ? "p-3" : "p-4 sm:p-5"}`}
    >
      <span className="flex items-start gap-3">
        <span
          className={`grid shrink-0 place-items-center rounded-xl border ${
            compact ? "h-9 w-9" : "h-11 w-11"
          } ${
            notification.category === "support"
              ? "border-violet-300/15 bg-violet-400/[0.09] text-violet-200"
              : "border-sky-300/15 bg-sky-400/[0.09] text-sky-200"
          }`}
        >
          <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <span
              className={`font-black leading-snug text-white ${
                compact ? "text-sm" : "text-base"
              }`}
            >
              {notification.title}
            </span>

            <time
              dateTime={notification.createdAt}
              className="shrink-0 text-[0.68rem] font-semibold text-slate-500"
            >
              {formatNotificationTime(notification.createdAt)}
            </time>
          </span>

          <span
            className={`mt-1.5 block leading-relaxed text-slate-400 ${
              compact ? "line-clamp-2 text-xs" : "text-sm"
            }`}
          >
            {notification.message}
          </span>

          {!compact ? (
            <span className="mt-3 flex flex-wrap items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.13em]">
              <span className="rounded-full border border-white/[0.08] bg-slate-950/35 px-2.5 py-1 text-slate-400">
                {getNotificationCategoryLabel(notification.category)}
              </span>
              <span className="text-sky-300 transition group-hover:translate-x-0.5">
                {notification.action.label} →
              </span>
            </span>
          ) : null}
        </span>
      </span>

      {isUnread ? (
        <span
          aria-hidden="true"
          className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.8)]"
        />
      ) : null}
    </button>
  );
}
