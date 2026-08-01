import {
  CheckIcon,
  CloseIcon,
  InfoIcon,
  WarningIcon,
} from "../../../components/navigation/NavigationIcons";

export type WatchlistToastTone = "success" | "info" | "error";

export interface WatchlistToastNotice {
  id: number;
  tone: WatchlistToastTone;
  title: string;
  message: string;
}

interface WatchlistToastProps {
  notice: WatchlistToastNotice;
  onDismiss: () => void;
}

function NoticeIcon({ tone }: { tone: WatchlistToastTone }) {
  if (tone === "success") {
    return <CheckIcon className="h-5 w-5" />;
  }

  if (tone === "error") {
    return <WarningIcon className="h-5 w-5" />;
  }

  return <InfoIcon className="h-5 w-5" />;
}

function WatchlistToast({ notice, onDismiss }: WatchlistToastProps) {
  const accentClasses =
    notice.tone === "error"
      ? "bg-red-100 text-red-700 ring-red-200"
      : notice.tone === "success"
        ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
        : "bg-sky-100 text-sky-700 ring-sky-200";

  return (
    <div className="pointer-events-none fixed left-4 right-4 top-20 z-[140] flex justify-end sm:left-auto sm:right-5 lg:right-7">
      <div
        role={notice.tone === "error" ? "alert" : "status"}
        aria-live={notice.tone === "error" ? "assertive" : "polite"}
        className="watchlist-toast-enter pointer-events-auto relative w-full max-w-[23rem] overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/95 p-3.5 text-slate-950 shadow-[0_16px_45px_rgba(2,6,23,0.3)] ring-1 ring-black/5 backdrop-blur-xl"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ${accentClasses}`}
          >
            <NoticeIcon tone={notice.tone} />
          </span>

          <div className="min-w-0 flex-1 pr-8">
            <p className="truncate text-sm font-black tracking-tight text-slate-950">
              {notice.title}
            </p>

            <p className="mt-1 text-sm leading-5 text-slate-600">
              {notice.message}
            </p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss Watchlist notification"
            className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/80 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default WatchlistToast;
