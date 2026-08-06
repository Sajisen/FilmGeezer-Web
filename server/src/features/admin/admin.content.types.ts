import type { ObjectId } from "mongodb";

import type { ContentLinksDocument } from "../contentLinks/contentLinks.types.js";

export const ADMIN_CONTENT_MEDIA_TYPE_VALUES = ["movie", "tv"] as const;
export type AdminContentMediaType =
  (typeof ADMIN_CONTENT_MEDIA_TYPE_VALUES)[number];

export const ADMIN_CONTENT_STATUS_FILTER_VALUES = [
  "all",
  "active",
  "inactive",
] as const;
export type AdminContentStatusFilter =
  (typeof ADMIN_CONTENT_STATUS_FILTER_VALUES)[number];

export const ADMIN_CONTENT_MEDIA_TYPE_FILTER_VALUES = [
  "all",
  ...ADMIN_CONTENT_MEDIA_TYPE_VALUES,
] as const;
export type AdminContentMediaTypeFilter =
  (typeof ADMIN_CONTENT_MEDIA_TYPE_FILTER_VALUES)[number];

export type AdminContentKind = "movie" | "series";
export type AdminContentMovieQuality = "720p" | "1080p";

export interface AdminContentLinksDocument extends ContentLinksDocument {
  _id: ObjectId;
  admin_revision?: unknown;
  admin_updated_at?: unknown;
  admin_updated_by?: unknown;
}

export interface AdminContentListQuery {
  page: number;
  pageSize: number;
  mediaType: AdminContentMediaTypeFilter;
  status: AdminContentStatusFilter;
  search: string;
}

export interface AdminContentSummary {
  mediaType: AdminContentMediaType;
  tmdbId: number;
  kind: AdminContentKind;
  title: string;
  year: string;
  active: boolean;
  sourceCount: number;
  linkCount: number;
  revision: number;
  updatedAt: Date | null;
}

export interface AdminContentMediaSnapshot {
  mediaType: AdminContentMediaType;
  tmdbId: number;
  title: string;
  year: string;
  rating: number;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
}

export interface AdminContentSeriesOption {
  id: string;
  url: string;
  isMain: boolean;
  active: boolean;
}

export interface AdminContentMovieQualityLink {
  url: string;
  size: string | null;
}

export interface AdminContentMovieSource {
  id: string;
  isMain: boolean;
  active: boolean;
  links: {
    "720p": AdminContentMovieQualityLink | null;
    "1080p": AdminContentMovieQualityLink | null;
  };
}

export interface AdminContentDetail {
  media: AdminContentMediaSnapshot;
  exists: boolean;
  active: boolean;
  kind: AdminContentKind;
  revision: number;
  revisionToken: string;
  updatedAt: Date | null;
  seriesOptions: AdminContentSeriesOption[];
  movieSources: AdminContentMovieSource[];
}

export interface AdminContentListResult {
  items: AdminContentSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AdminContentTmdbSearchResult {
  items: AdminContentMediaSnapshot[];
  pagination: {
    page: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface AdminContentSeriesSaveInput {
  expectedRevision: number;
  expectedRevisionToken: string;
  kind: "series";
  options: AdminContentSeriesOption[];
}

export interface AdminContentMovieSaveInput {
  expectedRevision: number;
  expectedRevisionToken: string;
  kind: "movie";
  sources: AdminContentMovieSource[];
}

export type AdminContentSaveInput =
  | AdminContentSeriesSaveInput
  | AdminContentMovieSaveInput;

export interface AdminContentStatusInput {
  expectedRevision: number;
  expectedRevisionToken: string;
  active: boolean;
  reason: string;
}
