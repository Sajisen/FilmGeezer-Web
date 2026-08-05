import {
  useEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";

import {
  BellIcon,
  BookmarkIcon,
  CloseIcon,
  SettingsIcon,
} from "../../../components/navigation/NavigationIcons";
import type { UserNotification } from "../../../types/notification";

export default function WelcomeNotificationDialog({
  notification,
  displayName,
  onClose,
}: {
  notification: UserNotification;
  displayName: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), a[href]",
        ),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [onClose]);

  function goTo(path: string) {
    onClose();
    navigate(path);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[130] grid place-items-center overflow-y-auto bg-slate-950/80 px-4 py-8 backdrop-blur-lg"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filmgeezer-welcome-title"
        className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-sky-300/15 bg-slate-900 shadow-2xl shadow-black/60"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.22),transparent_42%),radial-gradient(circle_at_82%_10%,rgba(99,102,241,0.18),transparent_38%)]" />

        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <span className="grid h-13 w-13 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-200 shadow-lg shadow-sky-950/20">
              <BellIcon className="h-6 w-6" />
            </span>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close welcome message"
              className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-slate-950/30 text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <p className="mt-6 text-[0.68rem] font-black uppercase tracking-[0.22em] text-sky-300">
            Account ready
          </p>
          <h2
            id="filmgeezer-welcome-title"
            className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl"
          >
            Welcome to FilmGeezer, {displayName}.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
            {notification.message}
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-slate-950/35 p-4">
              <BellIcon className="h-5 w-5 text-sky-300" />
              <p className="mt-3 text-sm font-black text-white">Discover</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Browse Movies, TV Series, Anime, and K-Drama in one place.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-slate-950/35 p-4">
              <BookmarkIcon className="h-5 w-5 text-sky-300" />
              <p className="mt-3 text-sm font-black text-white">Save</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Keep up to fifty titles in your account Watchlist.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-slate-950/35 p-4">
              <SettingsIcon className="h-5 w-5 text-sky-300" />
              <p className="mt-3 text-sm font-black text-white">Personalize</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Shape recommendations using your interests and saved titles.
              </p>
            </div>
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-full border border-white/10 px-5 text-sm font-black text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
            >
              Keep browsing notifications
            </button>
            <button
              type="button"
              onClick={() => goTo("/")}
              className="min-h-11 rounded-full bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            >
              Start exploring
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
