import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";

import {
  BellIcon,
  BookmarkIcon,
  CloseIcon,
  SettingsIcon,
} from "../../../components/navigation/NavigationIcons";
import type { UserNotification } from "../../../types/notification";

import WelcomeCelebrationCanvas from "./WelcomeCelebrationCanvas";

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
      className="fixed inset-0 z-[130] grid isolate place-items-center overflow-x-hidden overflow-y-auto bg-slate-950/80 px-3 py-4 backdrop-blur-lg sm:px-4 sm:py-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="welcome-celebration-ambient" aria-hidden="true" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filmgeezer-welcome-title"
        className="welcome-dialog-enter welcome-dialog-scrollbar relative z-20 max-h-[calc(100dvh-2rem)] w-full max-w-[22rem] overflow-x-hidden overflow-y-auto rounded-[1.5rem] border border-sky-300/15 bg-slate-900 shadow-2xl shadow-black/60 sm:max-h-[calc(100dvh-4rem)] sm:max-w-2xl sm:rounded-[2rem]"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[radial-gradient(circle_at_18%_0%,rgba(56,189,248,0.22),transparent_42%),radial-gradient(circle_at_82%_10%,rgba(99,102,241,0.18),transparent_38%)] sm:h-64" />

        <div className="relative p-4 sm:p-7 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-200 shadow-lg shadow-sky-950/20 sm:h-13 sm:w-13">
              <BellIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close welcome message"
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-slate-950/30 text-slate-400 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:h-10 sm:w-10"
            >
              <CloseIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>

          <p className="mt-4 text-[0.62rem] font-black uppercase tracking-[0.2em] text-sky-300 sm:mt-6 sm:text-[0.68rem] sm:tracking-[0.22em]">
            Account ready
          </p>
          <h2
            id="filmgeezer-welcome-title"
            className="mt-1.5 break-words text-2xl font-black tracking-tight text-white sm:mt-2 sm:text-4xl"
          >
            Welcome to FilmGeezer, {displayName}.
          </h2>
          <p className="mt-3 max-w-xl text-[0.82rem] leading-6 text-slate-300 sm:mt-4 sm:text-base sm:leading-7">
            {notification.message}
          </p>

          <div className="mt-5 grid gap-2 sm:mt-7 sm:grid-cols-3 sm:gap-3">
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-slate-950/35 p-3 sm:block sm:rounded-2xl sm:p-4">
              <BellIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-300 sm:mt-0 sm:h-5 sm:w-5" />
              <div>
                <p className="text-sm font-black text-white sm:mt-3">
                  Discover
                </p>
                <p className="mt-0.5 text-[0.72rem] leading-5 text-slate-500 sm:mt-1 sm:text-xs">
                  Browse Movies, TV Series, Anime, and K-Drama in one place.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-slate-950/35 p-3 sm:block sm:rounded-2xl sm:p-4">
              <BookmarkIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-300 sm:mt-0 sm:h-5 sm:w-5" />
              <div>
                <p className="text-sm font-black text-white sm:mt-3">Save</p>
                <p className="mt-0.5 text-[0.72rem] leading-5 text-slate-500 sm:mt-1 sm:text-xs">
                  Keep the films and series you love together in your Watchlist.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-slate-950/35 p-3 sm:block sm:rounded-2xl sm:p-4">
              <SettingsIcon className="mt-0.5 h-4 w-4 shrink-0 text-sky-300 sm:mt-0 sm:h-5 sm:w-5" />
              <div>
                <p className="text-sm font-black text-white sm:mt-3">
                  Personalize
                </p>
                <p className="mt-0.5 text-[0.72rem] leading-5 text-slate-500 sm:mt-1 sm:text-xs">
                  Shape recommendations using your interests and saved titles.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-7 sm:flex sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-full border border-white/10 px-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.05] hover:text-white sm:min-h-11 sm:px-5 sm:text-sm"
            >
              Continue browsing
            </button>
            <button
              type="button"
              onClick={() => goTo("/")}
              className="min-h-10 rounded-full bg-sky-500 px-3 text-xs font-black text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 sm:min-h-11 sm:px-5 sm:text-sm"
            >
              Start exploring
            </button>
          </div>
        </div>
      </div>

      <WelcomeCelebrationCanvas />
    </div>,
    document.body,
  );
}
