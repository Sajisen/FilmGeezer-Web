import { createContext, useContext } from "react";

import type { MediaType } from "../../types/media";
import type {
  WatchlistCandidate,
  WatchlistItem,
  WatchlistStorageMode,
  WatchlistSyncStatus,
  WatchlistToggleResult,
} from "../../types/watchlist";

export interface WatchlistContextValue {
  items: WatchlistItem[];
  itemCount: number;
  maxItems: number;
  expiryDays: number;
  storageMode: WatchlistStorageMode;
  storageAvailable: boolean;
  pendingGuestCount: number;
  syncStatus: WatchlistSyncStatus;
  syncError: string | null;
  isMutationPending: boolean;

  hasItem: (mediaType: MediaType, tmdbId: number) => boolean;
  isItemPending: (mediaType: MediaType, tmdbId: number) => boolean;
  toggleItem: (item: WatchlistCandidate) => Promise<WatchlistToggleResult>;
  removeItem: (mediaType: MediaType, tmdbId: number) => Promise<boolean>;
  clearItems: () => Promise<boolean>;
  retrySync: () => Promise<void>;
}

export const WatchlistContext =
  createContext<WatchlistContextValue | null>(null);

export function useWatchlist(): WatchlistContextValue {
  const context = useContext(WatchlistContext);

  if (!context) {
    throw new Error(
      "useWatchlist must be used within WatchlistProvider.",
    );
  }

  return context;
}
