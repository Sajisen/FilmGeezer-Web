import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { NavLink, useNavigate } from "react-router";

import { useModalAccessibility } from "../../hooks/useModalAccessibility";

import ProfileAvatar from "../ProfileAvatar";
import {
  ArrowRightIcon,
  BookmarkIcon,
  CloseIcon,
  SearchIcon,
  UserIcon,
} from "./NavigationIcons";
import {
  primaryNavigation,
  secondaryNavigation,
} from "./NavigationItems";

interface MobileNavigationDrawerProps {
  onClose: () => void;
  onWatchlist: () => void;
  onAccountAction: () => void;
  accountLabel: string;
  accountInitials: string | null;
  accountProfileImagePath: string | null;
}

const EXIT_DURATION_MS = 280;
const CLOSE_SWIPE_DISTANCE = 72;
const DIRECTION_RATIO = 1.35;

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getExitDuration() {
  return prefersReducedMotion() ? 0 : EXIT_DURATION_MS;
}

function MobileNavigationDrawer({
  onClose,
  onWatchlist,
  onAccountAction,
  accountLabel,
  accountInitials,
  accountProfileImagePath,
}: MobileNavigationDrawerProps) {
  const [isEntered, setIsEntered] = useState(() =>
  prefersReducedMotion(),
);
  const navigate = useNavigate();

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      return;
    }

    const exitDuration = getExitDuration();

    setIsEntered(false);

    if (exitDuration === 0) {
      onClose();
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      onClose();
    }, exitDuration);
  }, [onClose]);

  const requestAction = useCallback(
    (action: () => void) => {
      if (closeTimerRef.current !== null) {
        return;
      }

      const exitDuration = getExitDuration();

      const finishAction = () => {
        onClose();

        window.setTimeout(() => {
          action();
        }, 0);
      };

      setIsEntered(false);

      if (exitDuration === 0) {
        finishAction();
        return;
      }

      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        finishAction();
      }, exitDuration);
    },
    [onClose],
  );

useEffect(() => {
  const shouldAnimate = !prefersReducedMotion();

  const animationFrame = shouldAnimate
    ? window.requestAnimationFrame(() => {
        setIsEntered(true);
      })
    : null;

  return () => {
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
    }

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  };
}, []);

  useModalAccessibility({
    isOpen: true,
    dialogRef: drawerRef,
    initialFocusRef: closeButtonRef,
    onEscape: requestClose,
  });

  useEffect(() => {
    const drawer = drawerRef.current;

    if (!drawer) {
      return;
    }

    let isTracking = false;
    let startX = 0;
    let startY = 0;
    let latestX = 0;
    let latestY = 0;

    function resetGesture() {
      isTracking = false;
      startX = 0;
      startY = 0;
      latestX = 0;
      latestY = 0;
    }

    function handleTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      isTracking = true;
      startX = touch.clientX;
      startY = touch.clientY;
      latestX = touch.clientX;
      latestY = touch.clientY;
    }

    function handleTouchMove(event: TouchEvent) {
      if (!isTracking || event.touches.length !== 1) {
        return;
      }

      const touch = event.touches[0];
      latestX = touch.clientX;
      latestY = touch.clientY;

      const horizontalDistance = latestX - startX;
      const verticalDistance = Math.abs(latestY - startY);

      if (
        verticalDistance > 18 &&
        verticalDistance > Math.abs(horizontalDistance)
      ) {
        resetGesture();
      }
    }

    function handleTouchEnd() {
      if (!isTracking) {
        return;
      }

      const horizontalDistance = latestX - startX;
      const verticalDistance = Math.abs(latestY - startY);

      if (
        horizontalDistance >= CLOSE_SWIPE_DISTANCE &&
        horizontalDistance >= verticalDistance * DIRECTION_RATIO
      ) {
        requestClose();
      }

      resetGesture();
    }

    drawer.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    drawer.addEventListener("touchmove", handleTouchMove, {
      passive: true,
    });
    drawer.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });
    drawer.addEventListener("touchcancel", resetGesture, {
      passive: true,
    });

    return () => {
      drawer.removeEventListener("touchstart", handleTouchStart);
      drawer.removeEventListener("touchmove", handleTouchMove);
      drawer.removeEventListener("touchend", handleTouchEnd);
      drawer.removeEventListener("touchcancel", resetGesture);
    };
  }, [requestClose]);

  const drawer = (
    <div className="fixed inset-0 z-[80] lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close navigation menu"
        onClick={requestClose}
        className={`absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300 ${
          isEntered ? "opacity-100" : "opacity-0"
        }`}
      />

      <aside
        id="mobile-navigation"
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-navigation-title"
        className={`absolute bottom-2 right-2 top-2 flex w-[min(88vw,22rem)] max-w-full touch-pan-y flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/[0.98] shadow-2xl shadow-black/70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isEntered ? "translate-x-0" : "translate-x-[105%]"
        }`}
      >
        <div className="relative flex shrink-0 items-center justify-between overflow-hidden border-b border-white/10 px-5 pb-4 pt-[max(1.1rem,env(safe-area-inset-top))]">
          <div
            aria-hidden="true"
            className="absolute -left-16 -top-20 h-40 w-40 rounded-full bg-sky-500/15 blur-3xl"
          />

          <NavLink
            id="mobile-navigation-title"
            to="/"
            onClick={requestClose}
            className="relative inline-flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <img
              src="/filmgeezer-logo-v1.webp"
              alt=""
              className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-sky-950/35"
            />

            <span>
              <span className="block text-xl font-black tracking-tight text-white">
                Film<span className="text-sky-400">Geezer</span>
              </span>

              <span className="mt-0.5 block text-xs text-slate-500">
                Discover your next watch
              </span>
            </span>
          </NavLink>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={requestClose}
            aria-label="Close navigation menu"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:border-sky-300/25 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          <button
            type="button"
            onClick={() =>
              requestAction(() => {
                navigate("/search", {
                  state: { focusSearchInput: true },
                });
              })
            }
            className="group flex min-h-[3.75rem] w-full items-center gap-3 rounded-2xl border border-sky-400/20 bg-gradient-to-r from-sky-500/12 to-blue-500/5 px-4 text-left transition hover:border-sky-300/35 hover:from-sky-500/18 hover:to-blue-500/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
              <SearchIcon />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-white">
                Search FilmGeezer
              </span>

              <span className="mt-0.5 block truncate text-xs text-slate-400">
                Movies, TV, Anime and K-Drama
              </span>
            </span>

            <ArrowRightIcon className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-sky-300" />
          </button>

          <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Explore
          </p>

          <div className="mt-3 flex flex-col gap-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-1">
            {primaryNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={requestClose}
                className={({ isActive }) =>
                  `flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
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

          {accountInitials && (
            <>
              <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                Account
              </p>

              <NavLink
                to="/account?section=security"
                onClick={requestClose}
                className="mt-3 flex min-h-12 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.025] px-4 text-base font-medium text-slate-200 transition hover:border-sky-300/20 hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <span>Settings</span>
                <ArrowRightIcon className="h-4 w-4 text-slate-600" />
              </NavLink>
            </>
          )}

          <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            More
          </p>

          <div className="mt-3 flex flex-col gap-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-1">
            {secondaryNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={requestClose}
                className={({ isActive }) =>
                  `flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
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

        <div className="grid shrink-0 grid-cols-[0.85fr_1.15fr] gap-2.5 border-t border-white/10 bg-slate-950/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <button
            type="button"
            onClick={() => requestAction(onWatchlist)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 text-sm font-semibold text-slate-100 transition hover:border-sky-400/20 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <BookmarkIcon />
            Watchlist
          </button>

          <button
            type="button"
            onClick={() => requestAction(onAccountAction)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-sky-500 px-3 text-sm font-bold text-white shadow-lg shadow-sky-950/25 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
          >
            {accountInitials ? (
              <ProfileAvatar
                displayName={accountInitials}
                profileImagePath={accountProfileImagePath}
                alt=""
                className="h-7 w-7 border-white/15 shadow-none"
                initialsClassName="text-[0.65rem] tracking-wide"
              />
            ) : (
              <UserIcon />
            )}

            {accountLabel}
          </button>
        </div>
      </aside>
    </div>
  );

  return createPortal(drawer, document.body);
}

export default MobileNavigationDrawer;