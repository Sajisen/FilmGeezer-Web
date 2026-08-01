import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  WatchlistApiError,
  addAccountWatchlistItem,
  clearAccountWatchlist,
  getAccountWatchlist,
  mergeGuestWatchlistIntoAccount,
  removeAccountWatchlistItem,
} from "../../services/watchlistService";

import type { MediaType } from "../../types/media";
import type {
  AccountWatchlistItem,
  GuestWatchlistItem,
  WatchlistCandidate,
  WatchlistItem,
  WatchlistSnapshotResponse,
  WatchlistStorageMode,
  WatchlistSyncStatus,
  WatchlistToggleResult,
} from "../../types/watchlist";

import { useAuth } from "../auth/authContext";

import {
  getAccountWatchlistCacheKey,
  loadAccountWatchlistCache,
  saveAccountWatchlistCache,
} from "./accountWatchlistCache";

import {
  GUEST_WATCHLIST_EXPIRY_DAYS,
  GUEST_WATCHLIST_MAX_ITEMS,
  GUEST_WATCHLIST_STORAGE_KEY,
  clearGuestWatchlist,
  createGuestWatchlistItem,
  loadGuestWatchlist,
  saveGuestWatchlist,
} from "./guestWatchlistStorage";

import WatchlistToast, {
  type WatchlistToastNotice,
  type WatchlistToastTone,
} from "./components/WatchlistToast";

import {
  WatchlistContext,
  type WatchlistContextValue,
} from "./watchlistContext";

interface WatchlistProviderProps {
  children: ReactNode;
}

interface WatchlistState {
  items: WatchlistItem[];
  maxItems: number;
  storageMode: WatchlistStorageMode;
  storageAvailable: boolean;
  syncStatus: WatchlistSyncStatus;
  syncError: string | null;
  updatedAt: string | null;
}

function createIdentityKey(mediaType: MediaType, tmdbId: number): string {
  return `${mediaType}:${tmdbId}`;
}

function toAccountItems(items: AccountWatchlistItem[]): WatchlistItem[] {
  return items.map((item) => ({
    ...item,
    expiresAt: null,
  }));
}

function createInitialState(): WatchlistState {
  const guestSnapshot = loadGuestWatchlist();

  return {
    items: guestSnapshot.items,
    maxItems: GUEST_WATCHLIST_MAX_ITEMS,
    storageMode: "guest",
    storageAvailable: guestSnapshot.storageAvailable,
    syncStatus: "idle",
    syncError: null,
    updatedAt: null,
  };
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The Watchlist request could not be completed.";
}

export function WatchlistProvider({
  children,
}: WatchlistProviderProps) {
  const {
    status: authStatus,
    user: authUser,
    csrfToken: authCsrfToken,
    refreshSession,
  } = useAuth();

  const [state, setState] = useState<WatchlistState>(createInitialState);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  const [notice, setNotice] = useState<WatchlistToastNotice | null>(null);

  const stateRef = useRef(state);
  const pendingKeysRef = useRef(new Set<string>());
  const activeUserIdRef = useRef<string | null>(null);
  const syncSequenceRef = useRef(0);
  const noticeSequenceRef = useRef(0);

  const applyState = useCallback((nextState: WatchlistState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const showNotice = useCallback(
    (
      tone: WatchlistToastTone,
      title: string,
      message: string,
    ) => {
      noticeSequenceRef.current += 1;

      setNotice({
        id: noticeSequenceRef.current,
        tone,
        title,
        message,
      });
    },
    [],
  );

  const applyGuestSnapshot = useCallback(() => {
    const snapshot = loadGuestWatchlist();

    activeUserIdRef.current = null;

    applyState({
      items: snapshot.items,
      maxItems: GUEST_WATCHLIST_MAX_ITEMS,
      storageMode: "guest",
      storageAvailable: snapshot.storageAvailable,
      syncStatus: "idle",
      syncError: null,
      updatedAt: null,
    });
  }, [applyState]);

  const applyAccountResponse = useCallback(
    (
      userId: string,
      response: WatchlistSnapshotResponse,
      syncStatus: WatchlistSyncStatus = "idle",
    ) => {
      const accountItems = toAccountItems(response.items);

      saveAccountWatchlistCache({
        userId,
        items: response.items,
        maximumItems: response.maximumItems,
        updatedAt: response.updatedAt,
      });

      applyState({
        items: accountItems,
        maxItems: response.maximumItems,
        storageMode: "account",
        storageAvailable: true,
        syncStatus,
        syncError: null,
        updatedAt: response.updatedAt,
      });
    },
    [applyState],
  );

  const synchronizeAccount = useCallback(
    async (
      userId: string,
      csrfToken: string,
      options: {
        signal?: AbortSignal;
        announceMerge: boolean;
      },
    ): Promise<void> => {
      const sequence = syncSequenceRef.current + 1;
      syncSequenceRef.current = sequence;
      activeUserIdRef.current = userId;

      const cache = loadAccountWatchlistCache(userId);

      applyState({
        items: toAccountItems(cache.items),
        maxItems: cache.maximumItems,
        storageMode: "account",
        storageAvailable: true,
        syncStatus: cache.items.length > 0 ? "syncing" : "loading",
        syncError: null,
        updatedAt: cache.updatedAt,
      });

      const guestSnapshot = loadGuestWatchlist();

      try {
        if (guestSnapshot.items.length > 0) {
          const response = await mergeGuestWatchlistIntoAccount(
            guestSnapshot.items,
            csrfToken,
            options.signal,
          );

          if (
            options.signal?.aborted ||
            syncSequenceRef.current !== sequence
          ) {
            return;
          }

          applyAccountResponse(userId, response);

          const guestStorageCleared = clearGuestWatchlist();

          if (options.announceMerge) {
            if (response.skippedForLimitCount > 0) {
              showNotice(
                "info",
                "Watchlist synced",
                `${response.addedCount} browser ${response.addedCount === 1 ? "title was" : "titles were"} added. ${response.skippedForLimitCount} could not be added because the account limit was reached.`,
              );
            } else if (response.addedCount > 0) {
              showNotice(
                "success",
                "Watchlist synced",
                `${response.addedCount} browser ${response.addedCount === 1 ? "title is" : "titles are"} now saved to your account.`,
              );
            }
          }

          if (!guestStorageCleared) {
            showNotice(
              "info",
              "Account copy is safe",
              "The titles were saved to your account, but this browser could not clear its temporary copy.",
            );
          }

          return;
        }

        const response = await getAccountWatchlist(options.signal);

        if (
          options.signal?.aborted ||
          syncSequenceRef.current !== sequence
        ) {
          return;
        }

        applyAccountResponse(userId, response);
      } catch (error) {
        if (
          (error instanceof DOMException && error.name === "AbortError") ||
          options.signal?.aborted ||
          syncSequenceRef.current !== sequence
        ) {
          return;
        }

        applyState({
          items: toAccountItems(cache.items),
          maxItems: cache.maximumItems,
          storageMode: "account",
          storageAvailable: true,
          syncStatus: "error",
          syncError: getErrorMessage(error),
          updatedAt: cache.updatedAt,
        });

        if (error instanceof WatchlistApiError && error.status === 401) {
          void refreshSession();
        }
      }
    },
    [
      applyAccountResponse,
      applyState,
      refreshSession,
      showNotice,
    ],
  );

  useEffect(() => {
    const controller = new AbortController();
    const userId = authUser?.userId ?? null;
    const csrfToken = authCsrfToken;

    const transitionTimer = window.setTimeout(() => {
      if (
        authStatus === "authenticated" &&
        userId &&
        csrfToken
      ) {
        void synchronizeAccount(userId, csrfToken, {
          signal: controller.signal,
          announceMerge: true,
        });
        return;
      }

      if (authStatus === "guest") {
        syncSequenceRef.current += 1;
        applyGuestSnapshot();
      }
    }, 0);

    return () => {
      window.clearTimeout(transitionTimer);
      controller.abort();
    };
  }, [
    applyGuestSnapshot,
    authCsrfToken,
    authStatus,
    authUser?.userId,
    synchronizeAccount,
  ]);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      const currentState = stateRef.current;

      if (
        currentState.storageMode === "guest" &&
        (event.key === GUEST_WATCHLIST_STORAGE_KEY || event.key === null)
      ) {
        applyGuestSnapshot();
        return;
      }

      const userId = activeUserIdRef.current;

      if (
        currentState.storageMode === "account" &&
        userId &&
        pendingKeysRef.current.size === 0 &&
        (event.key === getAccountWatchlistCacheKey(userId) ||
          event.key === null)
      ) {
        const cache = loadAccountWatchlistCache(userId);

        applyState({
          items: toAccountItems(cache.items),
          maxItems: cache.maximumItems,
          storageMode: "account",
          storageAvailable: true,
          syncStatus: "idle",
          syncError: null,
          updatedAt: cache.updatedAt,
        });
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState === "visible" &&
        stateRef.current.storageMode === "guest"
      ) {
        applyGuestSnapshot();
      }
    }

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [applyGuestSnapshot, applyState]);

  useEffect(() => {
    if (state.storageMode !== "guest" || state.items.length === 0) {
      return;
    }

    const expiryTimes = state.items
      .map((item) => (item.expiresAt ? Date.parse(item.expiresAt) : NaN))
      .filter(Number.isFinite);

    if (expiryTimes.length === 0) {
      return;
    }

    const maximumTimerDelay = 2_147_000_000;
    const nextExpiryTime = Math.min(...expiryTimes);
    const delay = Math.min(
      maximumTimerDelay,
      Math.max(0, nextExpiryTime - Date.now() + 100),
    );

    const expiryTimer = window.setTimeout(() => {
      applyGuestSnapshot();
    }, delay);

    return () => {
      window.clearTimeout(expiryTimer);
    };
  }, [applyGuestSnapshot, state.items, state.storageMode]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const dismissalTimer = window.setTimeout(() => {
      setNotice((currentNotice) =>
        currentNotice?.id === notice.id ? null : currentNotice,
      );
    }, 4_500);

    return () => {
      window.clearTimeout(dismissalTimer);
    };
  }, [notice]);

  const hasItem = useCallback(
    (mediaType: MediaType, tmdbId: number) =>
      stateRef.current.items.some(
        (item) =>
          item.mediaType === mediaType && item.tmdbId === tmdbId,
      ),
    [],
  );

  const isItemPending = useCallback(
    (mediaType: MediaType, tmdbId: number) =>
      pendingKeysRef.current.has(createIdentityKey(mediaType, tmdbId)),
    [],
  );

  const beginMutation = useCallback((key: string): boolean => {
    if (
      pendingKeysRef.current.size > 0 ||
      stateRef.current.syncStatus === "loading" ||
      stateRef.current.syncStatus === "syncing"
    ) {
      return false;
    }

    pendingKeysRef.current.add(key);
    setPendingKeys(Array.from(pendingKeysRef.current));
    return true;
  }, []);

  const finishMutation = useCallback((key: string) => {
    pendingKeysRef.current.delete(key);
    setPendingKeys(Array.from(pendingKeysRef.current));
  }, []);

  const commitGuestItems = useCallback(
    (items: GuestWatchlistItem[]): boolean => {
      if (!saveGuestWatchlist(items)) {
        applyState({
          ...stateRef.current,
          storageAvailable: false,
        });

        showNotice(
          "error",
          "Watchlist unavailable",
          "FilmGeezer could not access this browser's storage. Check the browser privacy settings and try again.",
        );

        return false;
      }

      applyState({
        items,
        maxItems: GUEST_WATCHLIST_MAX_ITEMS,
        storageMode: "guest",
        storageAvailable: true,
        syncStatus: "idle",
        syncError: null,
        updatedAt: null,
      });

      return true;
    },
    [applyState, showNotice],
  );

  const toggleGuestItem = useCallback(
    (candidate: WatchlistCandidate): WatchlistToggleResult => {
      const latestSnapshot = loadGuestWatchlist();
      const currentItems = latestSnapshot.storageAvailable
        ? latestSnapshot.items
        : (stateRef.current.items as GuestWatchlistItem[]);

      const identityKey = createIdentityKey(
        candidate.mediaType,
        candidate.tmdbId,
      );

      const existingItem = currentItems.find(
        (item) =>
          createIdentityKey(item.mediaType, item.tmdbId) === identityKey,
      );

      if (existingItem) {
        const nextItems = currentItems.filter(
          (item) =>
            createIdentityKey(item.mediaType, item.tmdbId) !== identityKey,
        );

        if (!commitGuestItems(nextItems)) {
          return "storage-unavailable";
        }

        showNotice(
          "info",
          "Removed from Watchlist",
          `${existingItem.title} is no longer saved on this browser.`,
        );

        return "removed";
      }

      if (currentItems.length >= GUEST_WATCHLIST_MAX_ITEMS) {
        applyState({
          ...stateRef.current,
          items: currentItems,
          storageAvailable: latestSnapshot.storageAvailable,
        });

        showNotice(
          "error",
          "Watchlist limit reached",
          `This browser can keep up to ${GUEST_WATCHLIST_MAX_ITEMS} titles. Remove one before adding another.`,
        );

        return "limit-reached";
      }

      const nextItem = createGuestWatchlistItem(candidate);

      if (!commitGuestItems([nextItem, ...currentItems])) {
        return "storage-unavailable";
      }

      showNotice(
        "success",
        "Added to Watchlist",
        `${nextItem.title} will stay on this browser for ${GUEST_WATCHLIST_EXPIRY_DAYS} days.`,
      );

      return "added";
    },
    [commitGuestItems, applyState, showNotice],
  );

  const applyAccountMutationResponse = useCallback(
    (userId: string, response: WatchlistSnapshotResponse) => {
      applyAccountResponse(userId, response);
    },
    [applyAccountResponse],
  );

  const toggleItem = useCallback(
    async (candidate: WatchlistCandidate): Promise<WatchlistToggleResult> => {
      if (stateRef.current.storageMode === "guest") {
        return toggleGuestItem(candidate);
      }

      const key = createIdentityKey(candidate.mediaType, candidate.tmdbId);

      if (!beginMutation(key)) {
        return "busy";
      }

      const userId = activeUserIdRef.current;
      const csrfToken = authCsrfToken;
      const previousState = stateRef.current;
      const existingItem = previousState.items.find(
        (item) =>
          item.mediaType === candidate.mediaType &&
          item.tmdbId === candidate.tmdbId,
      );

      if (!userId || !csrfToken) {
        finishMutation(key);
        showNotice(
          "error",
          "Watchlist not synced",
          "Your sign-in session is not ready. Refresh the page and try again.",
        );
        return "sync-unavailable";
      }

      if (
        !existingItem &&
        previousState.items.length >= previousState.maxItems
      ) {
        finishMutation(key);
        showNotice(
          "error",
          "Watchlist limit reached",
          `Your account Watchlist can keep up to ${previousState.maxItems} titles. Remove one before adding another.`,
        );
        return "limit-reached";
      }

      const optimisticItems = existingItem
        ? previousState.items.filter(
            (item) =>
              item.mediaType !== candidate.mediaType ||
              item.tmdbId !== candidate.tmdbId,
          )
        : [
            {
              ...candidate,
              addedAt: new Date().toISOString(),
              expiresAt: null,
            },
            ...previousState.items,
          ];

      applyState({
        ...previousState,
        items: optimisticItems,
        syncStatus: "syncing",
        syncError: null,
      });

      try {
        const response = existingItem
          ? await removeAccountWatchlistItem(
              candidate.mediaType,
              candidate.tmdbId,
              csrfToken,
            )
          : await addAccountWatchlistItem(candidate, csrfToken);

        if (activeUserIdRef.current !== userId) {
          return existingItem ? "removed" : "added";
        }

        applyAccountMutationResponse(userId, response);

        showNotice(
          existingItem ? "info" : "success",
          existingItem ? "Removed from Watchlist" : "Added to Watchlist",
          existingItem
            ? `${candidate.title} was removed from your account.`
            : `${candidate.title} is now saved to your account.`,
        );

        return existingItem ? "removed" : "added";
      } catch (error) {
        if (activeUserIdRef.current !== userId) {
          return "sync-unavailable";
        }

        applyState({
          ...previousState,
          syncStatus: "error",
          syncError: getErrorMessage(error),
        });

        if (
          error instanceof WatchlistApiError &&
          error.code === "WATCHLIST_LIMIT_REACHED"
        ) {
          if (error.maximumItems) {
            applyState({
              ...previousState,
              maxItems: error.maximumItems,
              syncStatus: "idle",
              syncError: null,
            });
          }

          showNotice(
            "error",
            "Watchlist limit reached",
            error.message,
          );

          return "limit-reached";
        }

        if (error instanceof WatchlistApiError && error.status === 401) {
          void refreshSession();
        }

        showNotice(
          "error",
          "Watchlist change failed",
          getErrorMessage(error),
        );

        return "sync-unavailable";
      } finally {
        finishMutation(key);
      }
    },
    [
      applyAccountMutationResponse,
      applyState,
      authCsrfToken,
      beginMutation,
      finishMutation,
      showNotice,
      toggleGuestItem,
      refreshSession,
    ],
  );

  const removeItem = useCallback(
    async (mediaType: MediaType, tmdbId: number): Promise<boolean> => {
      const existingItem = stateRef.current.items.find(
        (item) =>
          item.mediaType === mediaType && item.tmdbId === tmdbId,
      );

      if (!existingItem) {
        return true;
      }

      const result = await toggleItem(existingItem);
      return result === "removed";
    },
    [toggleItem],
  );

  const clearItems = useCallback(async (): Promise<boolean> => {
    const currentState = stateRef.current;

    if (currentState.items.length === 0) {
      return true;
    }

    if (currentState.storageMode === "guest") {
      if (!commitGuestItems([])) {
        return false;
      }

      showNotice(
        "info",
        "Watchlist cleared",
        "The titles saved on this browser were removed.",
      );
      return true;
    }

    const mutationKey = "__clear-watchlist__";

    if (!beginMutation(mutationKey)) {
      return false;
    }

    const userId = activeUserIdRef.current;
    const csrfToken = authCsrfToken;

    if (!userId || !csrfToken) {
      finishMutation(mutationKey);
      showNotice(
        "error",
        "Watchlist not cleared",
        "Your sign-in session is not ready. Refresh the page and try again.",
      );
      return false;
    }

    applyState({
      ...currentState,
      items: [],
      syncStatus: "syncing",
      syncError: null,
    });

    try {
      const response = await clearAccountWatchlist(csrfToken);

      if (activeUserIdRef.current !== userId) {
        return true;
      }

      applyAccountMutationResponse(userId, response);

      showNotice(
        "info",
        "Watchlist cleared",
        "All titles were removed from your account Watchlist.",
      );
      return true;
    } catch (error) {
      if (activeUserIdRef.current !== userId) {
        return false;
      }

      applyState({
        ...currentState,
        syncStatus: "error",
        syncError: getErrorMessage(error),
      });

      if (error instanceof WatchlistApiError && error.status === 401) {
        void refreshSession();
      }

      showNotice(
        "error",
        "Watchlist not cleared",
        getErrorMessage(error),
      );
      return false;
    } finally {
      finishMutation(mutationKey);
    }
  }, [
    applyAccountMutationResponse,
    applyState,
    authCsrfToken,
    beginMutation,
    commitGuestItems,
    finishMutation,
    showNotice,
    refreshSession,
  ]);

  const retrySync = useCallback(async (): Promise<void> => {
    if (stateRef.current.storageMode === "guest") {
      applyGuestSnapshot();
      return;
    }

    const userId = authUser?.userId;
    const csrfToken = authCsrfToken;

    if (!userId || !csrfToken) {
      return;
    }

    await synchronizeAccount(userId, csrfToken, {
      announceMerge: true,
    });
  }, [
    applyGuestSnapshot,
    authCsrfToken,
    authUser?.userId,
    synchronizeAccount,
  ]);

  const contextValue = useMemo<WatchlistContextValue>(
    () => ({
      items: state.items,
      itemCount: state.items.length,
      maxItems: state.maxItems,
      expiryDays: GUEST_WATCHLIST_EXPIRY_DAYS,
      storageMode: state.storageMode,
      storageAvailable: state.storageAvailable,
      syncStatus: state.syncStatus,
      syncError: state.syncError,
      isMutationPending:
        pendingKeys.length > 0 ||
        state.syncStatus === "loading" ||
        state.syncStatus === "syncing",
      hasItem,
      isItemPending,
      toggleItem,
      removeItem,
      clearItems,
      retrySync,
    }),
    [
      clearItems,
      hasItem,
      isItemPending,
      pendingKeys.length,
      removeItem,
      retrySync,
      state.items,
      state.maxItems,
      state.storageAvailable,
      state.storageMode,
      state.syncError,
      state.syncStatus,
      toggleItem,
    ],
  );

  return (
    <WatchlistContext.Provider value={contextValue}>
      {children}

      {notice && (
        <WatchlistToast
          notice={notice}
          onDismiss={() => setNotice(null)}
        />
      )}
    </WatchlistContext.Provider>
  );
}
