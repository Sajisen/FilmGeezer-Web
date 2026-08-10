import { WarningIcon } from "../navigation/NavigationIcons";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

function getFriendlyMessage(message: string): string {
  const normalizedMessage = message.trim().toLocaleLowerCase();

  if (
    normalizedMessage === "failed to fetch" ||
    normalizedMessage === "load failed" ||
    normalizedMessage.includes("networkerror") ||
    normalizedMessage.includes("network request failed")
  ) {
    return "FilmGeezer couldn’t load this content right now. Check your connection and try again.";
  }

  return message;
}

function RetryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
    >
      <path
        d="M19 8.5V4m0 0h-4.5M19 4l-3.1 3.1A7 7 0 1 0 18.35 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ErrorState({
  title = "We couldn’t load this right now",
  message = "FilmGeezer could not load this content. Please try again.",
  onRetry,
}: ErrorStateProps) {
  const friendlyMessage = getFriendlyMessage(message);

  return (
    <div
      role="alert"
      className="relative overflow-hidden rounded-[1.6rem] border border-rose-300/15 bg-slate-900/72 p-5 text-white shadow-xl shadow-black/20 sm:p-6"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-rose-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-0 h-52 w-52 rounded-full bg-sky-500/[0.07] blur-3xl"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-7">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-rose-300/20 bg-rose-400/10 text-rose-200 shadow-inner shadow-rose-950/20 sm:h-12 sm:w-12"
          >
            <WarningIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>

          <div className="min-w-0">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-rose-200/85">
              Temporary problem
            </p>

            <h3 className="mt-1.5 text-lg font-black tracking-tight text-white sm:text-xl">
              {title}
            </h3>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300 sm:text-[0.95rem]">
              {friendlyMessage}
            </p>
          </div>
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-bold text-white shadow-lg shadow-sky-950/30 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 sm:w-auto"
          >
            <RetryIcon />
            Try again
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
