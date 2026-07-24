import type { Document } from "mongodb";

export type ContentLinkMediaType = "movie" | "tv";
export type PublicContentLinkKind = "movie" | "series" | null;
export type MovieQuality = "720p" | "1080p";

export interface SeriesLinkOptionDocument {
  id?: unknown;
  url?: unknown;
  link?: unknown;
  is_main?: unknown;
  active?: unknown;
}

export interface MovieQualityLinkDocument {
  label?: unknown;
  size?: unknown;
  url?: unknown;
  source_page?: unknown;
}

export interface MovieSourceDocument {
  id?: unknown;
  links?: unknown;
  is_main?: unknown;
  active?: unknown;
}

export interface ContentLinksDocument extends Document {
  media_type: ContentLinkMediaType;
  tmdb_id: number;
  active: boolean;
  kind?: "movie_links" | "series_link";
  title?: unknown;
  year?: unknown;
  updated_at?: unknown;
  link?: unknown;
  link_options?: unknown;
  links?: unknown;
  movie_sources?: unknown;
}

export interface PublicContentLink {
  id: string;
  label: string;
  url: string;
  isMain: boolean;
}

export interface PublicContentLinkGroup {
  id: string;
  label: string;
  links: PublicContentLink[];
}

export interface PublicContentLinksResponse {
  status: "success";
  available: boolean;
  mediaType: ContentLinkMediaType;
  tmdbId: number;
  kind: PublicContentLinkKind;
  groups: PublicContentLinkGroup[];
}