import { useRef } from "react";

import { useModalAccessibility } from "../../../hooks/useModalAccessibility";

import {
  BookmarkIcon,
  CloseIcon,
  UserIcon,
} from "../../../components/navigation/NavigationIcons";

interface WatchlistLimitDialogProps {
  onClose: () => void;
  onSignIn: () => void;
  onRegister: () => void;
}

function WatchlistLimitDialog({
  onClose,
  onSignIn,
  onRegister,
}: WatchlistLimitDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const signInButtonRef = useRef<HTMLButtonElement>(null);

  useModalAccessibility({
    isOpen: true,
    dialogRef,
    initialFocusRef: signInButtonRef,
    onEscape: onClose,
  });

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close account invitation"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="watchlist-limit-title"
        aria-describedby="watchlist-limit-description"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-sky-300/15 bg-slate-950 p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.7)] ring-1 ring-white/5 sm:p-7"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_50%_0%,rgba(14,165,233,0.2),transparent_70%)]" />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close account invitation"
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <div className="relative">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
            <BookmarkIcon className="h-6 w-6" />
          </span>

          <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
            Your Watchlist is full
          </p>

          <h2
            id="watchlist-limit-title"
            className="mt-2 text-2xl font-black tracking-tight sm:text-[1.75rem]"
          >
            Keep saving with an account.
          </h2>

          <p
            id="watchlist-limit-description"
            className="mt-3 text-sm leading-7 text-slate-300"
          >
            This browser can hold 20 titles. Sign in or create an account to
            save up to 50 and keep your Watchlist across your signed-in
            devices.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              ref={signInButtonRef}
              type="button"
              onClick={onSignIn}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <UserIcon className="h-4 w-4" />
              Sign in
            </button>

            <button
              type="button"
              onClick={onRegister}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] px-5 text-sm font-bold text-slate-100 transition hover:border-sky-300/35 hover:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              Create account
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mx-auto mt-4 block rounded-full px-4 py-2 text-sm font-semibold text-slate-500 transition hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            Not now
          </button>
        </div>
      </section>
    </div>
  );
}

export default WatchlistLimitDialog;
