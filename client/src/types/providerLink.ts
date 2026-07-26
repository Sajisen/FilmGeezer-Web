import type { MediaType } from "./media";

export type ProviderLinkKind = "movie" | "series" | null;

export interface ProviderLink {
  id: string;
  label: string;
  url: string;
  isMain: boolean;
  size?: string;
}

export interface ProviderLinkGroup {
  id: string;
  label: string;
  links: ProviderLink[];
}

export interface ProviderLinksPayload {
  status: "success";
  available: boolean;
  mediaType: MediaType;
  tmdbId: number;
  kind: ProviderLinkKind;
  groups: ProviderLinkGroup[];
}
