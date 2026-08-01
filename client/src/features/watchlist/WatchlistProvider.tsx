import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { MediaType } from "../../types/media";
import type {
  WatchlistCandidate,
  WatchlistItem,
  WatchlistToggleResult,
} from "../../types/watchlist";

import {
  GUEST_WATCHLIST_EXPIRY_DAYS,
  GUEST_WATCHLIST_MAX_ITEMS,
  GUEST_WATCHLIST_STORAGE_KEY,
  createGuestWatchlistItem,
  loadGuestWatchlist,
  saveGuestWatchlist,
} from "./guestWatchlistStorage";

import {
  WatchlistContext,
  type WatchlistContextValue,
} from "./watchlistContext";

interface WatchlistProviderProps {
  children: ReactNode;
}

interface WatchlistState {
  items: WatchlistItem[];
  storageAvailable: boolean;
}

interface WatchlistNotice {
  id: number;
  tone: "success" | "info" | "error";
  message: string;
}

function getIdentityKey(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

function createInitialState(): WatchlistState {
  return loadGuestWatchlist();
}

export function WatchlistProvider({
  children,
}: WatchlistProviderProps) {
  const [state, setState] = useState<WatchlistState>(createInitialState);
  const [notice, setNotice] = useState<WatchlistNotice | null>(null);

  const itemsRef = useRef(state.items);
  const noticeSequenceRef = useRef(0);

  const applyState = useCallback((nextState: WatchlistState) => {
    itemsRef.current = nextState.items;
    setState(nextState);
  }, []);

  const showNotice = useCallback(
    (tone: WatchlistNotice["tone"], message: string) => {
      noticeSequenceRef.current += 1;

      setNotice({
        id: noticeSequenceRef.current,
        tone,
        message,
      });
    },
    [],
  );

  const refreshFromStorage = useCallback(() => {
    applyState(loadGuestWatchlist());
  }, [applyState]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (
        event.key === GUEST_WATCHLIST_STORAGE_KEY ||
        event.key === null
      ) {
        refreshFromStorage();
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        refreshFromStorage();
      }
    }

    window.addEventListener("storage", handleStorage);
    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      );
    };
  }, [refreshFromStorage]);

  useEffect(() => {
    if (state.items.length === 0) {
      return;
    }

    const nextExpiryTime = Math.min(
      ...state.items.map((item) => Date.parse(item.expiresAt)),
    );

    const maximumTimerDelay = 2_147_000_000;
    const delay = Math.min(
      maximumTimerDelay,
      Math.max(0, nextExpiryTime - Date.now() + 100),
    );

    const expiryTimer = window.setTimeout(() => {
      refreshFromStorage();
    }, delay);

    return () => {
      window.clearTimeout(expiryTimer);
    };
  }, [refreshFromStorage, state.items]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const dismissalTimer = window.setTimeout(() => {
      setNotice((currentNotice) =>
        currentNotice?.id === notice.id ? null : currentNotice,
      );
    }, 4_000);

    return () => {
      window.clearTimeout(dismissalTimer);
    };
  }, [notice]);

  const hasItem = useCallback(
    (mediaType: MediaType, tmdbId: number) =>
      itemsRef.current.some(
        (item) =>
          item.mediaType === mediaType && item.tmdbId === tmdbId,
      ),
    [],
  );

  const commitItems = useCallback(
    (items: WatchlistItem[]): boolean => {
      if (!saveGuestWatchlist(items)) {
        applyState({
          items: itemsRef.current,
          storageAvailable: false,
        });

        showNotice(
          "error",
          "FilmGeezer could not access browser storage. Check your browser privacy settings and try again.",
        );

        return false;
      }

      applyState({
        items,
        storageAvailable: true,
      });

      return true;
    },
    [applyState, showNotice],
  );

  const toggleItem = useCallback(
    (candidate: WatchlistCandidate): WatchlistToggleResult => {
      const latestSnapshot = loadGuestWatchlist();
      const currentItems = latestSnapshot.storageAvailable
        ? latestSnapshot.items
        : itemsRef.current;

      const identityKey = getIdentityKey(
        candidate.mediaType,
        candidate.tmdbId,
      );

      const existingItem = currentItems.find(
        (item) =>
          getIdentityKey(item.mediaType, item.tmdbId) === identityKey,
      );

      if (existingItem) {
        const nextItems = currentItems.filter(
          (item) =>
            getIdentityKey(item.mediaType, item.tmdbId) !== identityKey,
        );

        if (!commitItems(nextItems)) {
          return "storage-unavailable";
        }

        showNotice(
          "info",
          `${existingItem.title} was removed from your Watchlist.`,
        );

        return "removed";
      }

      if (currentItems.length >= GUEST_WATCHLIST_MAX_ITEMS) {
        applyState({
          items: currentItems,
          storageAvailable: latestSnapshot.storageAvailable,
        });

        showNotice(
          "error",
          `This browser Watchlist can keep up to ${GUEST_WATCHLIST_MAX_ITEMS} titles. Remove one before adding another.`,
        );

        return "limit-reached";
      }

      const nextItem = createGuestWatchlistItem(candidate);
      const nextItems = [nextItem, ...currentItems];

      if (!commitItems(nextItems)) {
        return "storage-unavailable";
      }

      showNotice(
        "success",
        `${nextItem.title} was saved on this browser for ${GUEST_WATCHLIST_EXPIRY_DAYS} days.`,
      );

      return "added";
    },
    [applyState, commitItems, showNotice],
  );

  const removeItem = useCallback(
    (mediaType: MediaType, tmdbId: number): boolean => {
      const latestSnapshot = loadGuestWatchlist();
      const currentItems = latestSnapshot.storageAvailable
        ? latestSnapshot.items
        : itemsRef.current;

      const itemToRemove = currentItems.find(
        (item) =>
          item.mediaType === mediaType && item.tmdbId === tmdbId,
      );

      if (!itemToRemove) {
        refreshFromStorage();
        return true;
      }

      const nextItems = currentItems.filter(
        (item) =>
          item.mediaType !== mediaType || item.tmdbId !== tmdbId,
      );

      if (!commitItems(nextItems)) {
        return false;
      }

      showNotice(
        "info",
        `${itemToRemove.title} was removed from your Watchlist.`,
      );

      return true;
    },
    [commitItems, refreshFromStorage, showNotice],
  );

  const clearItems = useCallback((): boolean => {
    if (itemsRef.current.length === 0) {
      return true;
    }

    if (!commitItems([])) {
      return false;
    }

    showNotice("info", "Your browser Watchlist was cleared.");
    return true;
  }, [commitItems, showNotice]);

  const contextValue = useMemo<WatchlistContextValue>(
    () => ({
      items: state.items,
      itemCount: state.items.length,
      maxItems: GUEST_WATCHLIST_MAX_ITEMS,
      expiryDays: GUEST_WATCHLIST_EXPIRY_DAYS,
      storageAvailable: state.storageAvailable,
      hasItem,
      toggleItem,
      removeItem,
      clearItems,
    }),
    [
      clearItems,
      hasItem,
      removeItem,
      state.items,
      state.storageAvailable,
      toggleItem,
    ],
  );

  const noticeClasses =
    notice?.tone === "error"
      ? "border-red-300/25 bg-red-950/95 text-red-50"
      : notice?.tone === "success"
        ? "border-emerald-300/25 bg-emerald-950/95 text-emerald-50"
        : "border-sky-300/25 bg-slate-900/95 text-slate-100";

  return (
    <WatchlistContext.Provider value={contextValue}>
      {children}

      {notice && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[120] flex justify-center px-4"
        >
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            aria-live={notice.tone === "error" ? "assertive" : "polite"}
            className={`pointer-events-auto flex w-full max-w-xl items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl shadow-black/45 backdrop-blur-xl ${noticeClasses}`}
          >
            <p className="min-w-0 flex-1 text-sm font-medium leading-6">
              {notice.message}
            </p>

            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 rounded-full px-2 py-1 text-xs font-bold opacity-80 transition hover:bg-white/10 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </WatchlistContext.Provider>
  );
}
