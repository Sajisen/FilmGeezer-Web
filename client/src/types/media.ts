export type MediaType = "movie" | "tv";
export type SearchScope = "all" | MediaType | "anime" | "k-drama";

export interface MediaItem {
  tmdbId: number;
  title: string;
  mediaType: MediaType;
  year: string;
  rating: number;
  posterUrl: string;
  backdropUrl: string;
  overview: string;
  genres: string[];
  durationLabel: string;
  status: string;
  language: string;
}
