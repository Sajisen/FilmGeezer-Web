import { useEffect, useRef } from "react";
import { NavLink } from "react-router";
import { BookmarkIcon, CloseIcon, UserIcon } from "./NavigationIcons";
import { primaryNavigation, secondaryNavigation } from "./NavigationItems";

import { createPortal } from "react-dom";

interface MobileNavigationDrawerProps {
  onClose: () => void;
  onPlannedFeature: (featureName: string) => void;
}

function MobileNavigationDrawer({
  onClose,
  onPlannedFeature,
}: MobileNavigationDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedElementRef.current =
      document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;

    const previousPaddingRight = document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) {
        return;
      }

      const focusableElements = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          [
            "a[href]",
            "button:not([disabled])",
            '[tabindex]:not([tabindex="-1"])',
          ].join(","),
        ),
      );

      const firstElement = focusableElements[0];

      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        drawerRef.current.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      document.body.style.paddingRight = previousPaddingRight;

      document.removeEventListener("keydown", handleKeyDown);

      previouslyFocusedElementRef.current?.focus();
    };
  }, [onClose]);

  const drawer = (
    <div className="fixed inset-0 z-[80] lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close navigation menu"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />

      <aside
        id="mobile-navigation"
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-navigation-title"
        className="absolute inset-y-0 right-0 flex h-dvh w-[min(88vw,24rem)] max-w-full flex-col overflow-hidden border-l border-white/10 bg-slate-950 shadow-2xl shadow-black/60"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div>
            <NavLink
              id="mobile-navigation-title"
              to="/"
              onClick={onClose}
              className="text-xl font-bold tracking-tight"
            >
              Film
              <span className="text-sky-400">Geezer</span>
            </NavLink>

            <p className="mt-1 text-xs text-slate-500">
              Discover your next watch.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Explore
          </p>

          <div className="mt-3 flex flex-col gap-1.5">
            {primaryNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-12 items-center justify-between rounded-2xl px-4 text-base font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                    isActive
                      ? "bg-sky-500/15 text-sky-300"
                      : "text-slate-200 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>

                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full transition ${
                        isActive ? "bg-sky-300" : "bg-transparent"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="my-6 border-t border-white/10" />

          <p className="px-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Support
          </p>

          <div className="mt-3 flex flex-col gap-1.5">
            {secondaryNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex min-h-12 items-center justify-between rounded-2xl px-4 text-base font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                    isActive
                      ? "bg-sky-500/15 text-sky-300"
                      : "text-slate-200 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>

                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full transition ${
                        isActive ? "bg-sky-300" : "bg-transparent"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-white/10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
          <button
            type="button"
            onClick={() => onPlannedFeature("Watchlist")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <BookmarkIcon />
            Watchlist
          </button>

          <button
            type="button"
            onClick={() => onPlannedFeature("Profile and login")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-3 text-sm font-semibold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
          >
            <UserIcon />
            Profile
          </button>
        </div>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}

export default MobileNavigationDrawer;
