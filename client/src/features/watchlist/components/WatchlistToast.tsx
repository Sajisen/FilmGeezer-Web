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
  const iconClasses =
    notice.tone === "error"
      ? "border-red-300/20 bg-red-400/10 text-red-300"
      : notice.tone === "success"
        ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
        : "border-sky-300/20 bg-sky-400/10 text-sky-300";

  const accentClasses =
    notice.tone === "error"
      ? "bg-red-400"
      : notice.tone === "success"
        ? "bg-emerald-400"
        : "bg-sky-400";

  return (
    <div className="pointer-events-none fixed left-3 right-3 top-[5.25rem] z-[140] flex justify-end sm:left-auto sm:right-5 lg:right-7">
      <div
        role={notice.tone === "error" ? "alert" : "status"}
        aria-live={notice.tone === "error" ? "assertive" : "polite"}
        className="watchlist-toast-enter pointer-events-auto relative w-full max-w-[24rem] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 p-4 text-white shadow-[0_22px_70px_rgba(0,0,0,0.58)] ring-1 ring-sky-950/80 backdrop-blur-xl"
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-0 w-1 ${accentClasses}`}
        />

        <div className="flex items-start gap-3 pl-1">
          <span
            aria-hidden="true"
            className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${iconClasses}`}
          >
            <NoticeIcon tone={notice.tone} />
          </span>

          <div className="min-w-0 flex-1 pr-8">
            <p className="text-sm font-black tracking-tight text-white">
              {notice.title}
            </p>

            <p className="mt-1 text-sm leading-5 text-slate-300">
              {notice.message}
            </p>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss Watchlist notification"
            className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default WatchlistToast;
