import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router";
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
  onPlannedFeature: (featureName: string) => void;
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
  onPlannedFeature,
}: MobileNavigationDrawerProps) {
  const [isEntered, setIsEntered] = useState(false);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
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

  const requestPlannedFeature = useCallback(
    (featureName: string) => {
      if (closeTimerRef.current !== null) {
        return;
      }

      const exitDuration = getExitDuration();

      setIsEntered(false);

      if (exitDuration === 0) {
        onPlannedFeature(featureName);
        return;
      }

      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null;
        onPlannedFeature(featureName);
      }, exitDuration);
    },
    [onPlannedFeature],
  );

  useEffect(() => {
    if (prefersReducedMotion()) {
      setIsEntered(true);

      return () => {
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current);
        }
      };
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setIsEntered(true);
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);

      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

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
        requestClose();
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
      const previouslyFocusedElement =
        previouslyFocusedElementRef.current;

      if (previouslyFocusedElement?.isConnected) {
        previouslyFocusedElement.focus();
      }
    };
  }, [requestClose]);

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
        className={`absolute inset-0 bg-slate-950/[0.82] backdrop-blur-md transition-opacity duration-300 ${
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
        className={`absolute bottom-3 right-3 top-3 flex w-[min(84vw,22rem)] max-w-full touch-pan-y flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/[0.98] shadow-2xl shadow-black/70 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          isEntered ? "translate-x-0" : "translate-x-[105%]"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 pb-4 pt-[max(1.1rem,env(safe-area-inset-top))]">
          <div>
            <NavLink
              id="mobile-navigation-title"
              to="/"
              onClick={requestClose}
              className="text-xl font-bold tracking-tight"
            >
              Film<span className="text-sky-400">Geezer</span>
            </NavLink>

            <p className="mt-1 text-xs text-slate-500">
              Discover your next watch.
            </p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={requestClose}
            aria-label="Close navigation menu"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          <NavLink
            to="/search"
            onClick={requestClose}
            className="group flex min-h-[3.75rem] items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 text-left transition hover:border-sky-300/35 hover:bg-sky-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
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
          </NavLink>

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

          <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            Support
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

        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-white/10 bg-slate-950/90 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <button
            type="button"
            onClick={() => requestPlannedFeature("Watchlist")}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <BookmarkIcon />
            Watchlist
          </button>

          <button
            type="button"
            onClick={() => requestPlannedFeature("Profile and login")}
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
