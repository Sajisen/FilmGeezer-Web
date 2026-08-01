import { createContext, useContext } from "react";

import type { MediaType } from "../../types/media";
import type {
  WatchlistCandidate,
  WatchlistItem,
  WatchlistToggleResult,
} from "../../types/watchlist";

export interface WatchlistContextValue {
  items: WatchlistItem[];
  itemCount: number;
  maxItems: number;
  expiryDays: number;
  storageAvailable: boolean;
  hasItem: (mediaType: MediaType, tmdbId: number) => boolean;
  toggleItem: (item: WatchlistCandidate) => WatchlistToggleResult;
  removeItem: (mediaType: MediaType, tmdbId: number) => boolean;
  clearItems: () => boolean;
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
