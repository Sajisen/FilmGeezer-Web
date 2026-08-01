import type { MediaType } from "./media";

export interface WatchlistCandidate {
  mediaType: MediaType;
  tmdbId: number;
  title: string;
  posterUrl: string;
  year: string;
}

export interface WatchlistItem extends WatchlistCandidate {
  addedAt: string;
  expiresAt: string | null;
}

export interface GuestWatchlistItem extends WatchlistItem {
  expiresAt: string;
}

export interface AccountWatchlistItem extends WatchlistCandidate {
  addedAt: string;
}

export type WatchlistStorageMode = "guest" | "account";

export type WatchlistSyncStatus =
  | "idle"
  | "loading"
  | "syncing"
  | "error";

export type WatchlistToggleResult =
  | "added"
  | "removed"
  | "limit-reached"
  | "storage-unavailable"
  | "sync-unavailable"
  | "busy";

export interface WatchlistSnapshotResponse {
  status: "success";
  code: string;
  items: AccountWatchlistItem[];
  maximumItems: number;
  updatedAt: string | null;
}

export interface WatchlistMutationResponse
  extends WatchlistSnapshotResponse {
  message: string;
  changed: boolean;
}

export interface WatchlistMergeResponse
  extends WatchlistSnapshotResponse {
  code: "WATCHLIST_GUEST_ITEMS_MERGED";
  message: string;
  addedCount: number;
  duplicateCount: number;
  skippedForLimitCount: number;
}
