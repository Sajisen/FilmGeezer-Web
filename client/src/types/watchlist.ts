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
  expiresAt: string;
}

export type WatchlistToggleResult =
  | "added"
  | "removed"
  | "limit-reached"
  | "storage-unavailable";
