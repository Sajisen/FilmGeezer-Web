export type MediaType = "movie" | "tv";
export type SearchScope = "all" | MediaType | "anime" | "k-drama";

export type BrowseCategory = "trending" | "current" | "popular" | "top_rated";

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

  /** Internal Search metadata populated from TMDB list responses. */
  voteCount?: number;
  popularity?: number;
  releaseDate?: string;
}

export interface MediaVideo {
  id: string
  key: string
  name: string
  site: 'YouTube'
  type: 'Trailer' | 'Teaser'
  official: boolean
  language: string
  publishedAt: string
}

export interface MediaSeasonSummary {
  tmdbSeasonId: number
  seasonNumber: number
  name: string
  episodeCount: number
  airDate: string
  overview: string
  posterUrl: string
}

export interface MediaDetails
  extends MediaItem {
  originalTitle: string
  tagline: string
  fullReleaseDate: string
  voteCount: number
  homepageUrl: string
  imdbId: string

  runtimeMinutes: number | null
  numberOfSeasons: number | null
  numberOfEpisodes: number | null

  seasons: MediaSeasonSummary[]
  videos: MediaVideo[]
  primaryTrailer: MediaVideo | null
}