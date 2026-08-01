import type { ObjectId } from "mongodb";

export type WatchlistMediaType = "movie" | "tv";

export interface WatchlistItemDocument {
  mediaType: WatchlistMediaType;
  tmdbId: number;
  title: string;
  posterUrl: string;
  year: string;
  addedAt: Date;
}

export interface WatchlistDocument {
  _id: ObjectId;
  schemaVersion: number;
  userId: ObjectId;
  revision: number;
  items: WatchlistItemDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WatchlistItemInput {
  mediaType: WatchlistMediaType;
  tmdbId: number;
  title: string;
  posterUrl: string;
  year: string;
}

export interface GuestWatchlistMergeItemInput extends WatchlistItemInput {
  addedAt: Date;
}

export interface WatchlistItemDto {
  mediaType: WatchlistMediaType;
  tmdbId: number;
  title: string;
  posterUrl: string;
  year: string;
  addedAt: Date;
}

export interface WatchlistSnapshot {
  items: WatchlistItemDto[];
  maximumItems: number;
  updatedAt: Date | null;
}
