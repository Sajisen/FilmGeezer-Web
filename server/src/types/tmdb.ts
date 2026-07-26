export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbGenreListResponse {
  genres: TmdbGenre[];
}

export interface TmdbSearchResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count?: number;
  popularity?: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  original_language: string;
  genre_ids?: number[];
  adult?: boolean;
  video?: boolean;
  origin_country?: string[];
}

export interface TmdbMultiSearchResponse {
  page: number;
  results: TmdbSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TmdbVideoResult {
  id: string
  key: string
  name: string
  site: string
  type: string
  official: boolean
  published_at?: string
  iso_639_1?: string
}

export interface TmdbVideoResponse {
  results: TmdbVideoResult[]
}

export interface TmdbExternalIds {
  imdb_id?: string | null
}

export interface TmdbTvSeasonSummary {
  id: number
  season_number: number
  name: string
  episode_count: number
  air_date: string | null
  overview: string
  poster_path: string | null
}

export interface TmdbMovieDetails {
  id: number
  title: string
  original_title: string
  release_date: string

  vote_average: number
  vote_count: number

  poster_path: string | null
  backdrop_path: string | null

  overview: string
  tagline: string

  genres: TmdbGenre[]
  runtime: number | null
  status: string
  original_language: string

  homepage: string | null

  videos?: TmdbVideoResponse
  external_ids?: TmdbExternalIds
}

export interface TmdbTvDetails {
  id: number
  name: string
  original_name: string
  first_air_date: string

  vote_average: number
  vote_count: number

  poster_path: string | null
  backdrop_path: string | null

  overview: string
  tagline: string

  genres: TmdbGenre[]

  number_of_seasons: number
  number_of_episodes: number
  episode_run_time: number[]

  seasons: TmdbTvSeasonSummary[]

  status: string
  original_language: string

  homepage: string | null

  videos?: TmdbVideoResponse
  external_ids?: TmdbExternalIds
}

export interface TmdbErrorResponse {
  status_code?: number;
  status_message?: string;
  success?: boolean;
}

export interface TmdbListResult {
  id: number;
  adult?: boolean;
  video?: boolean;
  popularity?: number;
  vote_count?: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  original_language: string;
  genre_ids: number[];
  origin_country?: string[];
}

export interface TmdbListResponse {
  page: number;
  results: TmdbListResult[];
  total_pages: number;
  total_results: number;
}

export interface TmdbKeywordSearchResult {
  id: number;
  name: string;
}

export interface TmdbKeywordSearchResponse {
  page: number;
  results: TmdbKeywordSearchResult[];
  total_pages: number;
  total_results: number;
}

export interface TmdbWatchProvider {
  display_priority: number
  logo_path: string | null
  provider_id: number
  provider_name: string
}

export interface TmdbWatchProviderRegion {
  link?: string

  flatrate?: TmdbWatchProvider[]
  free?: TmdbWatchProvider[]
  ads?: TmdbWatchProvider[]

  rent?: TmdbWatchProvider[]
  buy?: TmdbWatchProvider[]
}

export interface TmdbWatchProvidersResponse {
  id: number

  results: Record<
    string,
    TmdbWatchProviderRegion
  >
}

export interface TmdbMovieCastMember {
  id: number;
  name: string;
  character: string;
  order: number;
  popularity?: number;
  profile_path: string | null;
}

export interface TmdbMovieCreditsResponse {
  id: number;
  cast: TmdbMovieCastMember[];
}

export interface TmdbTvAggregateRole {
  credit_id: string;
  character: string;
  episode_count: number;
}

export interface TmdbTvAggregateCastMember {
  id: number;
  name: string;
  order: number;
  popularity?: number;
  profile_path: string | null;
  total_episode_count: number;
  roles: TmdbTvAggregateRole[];
}

export interface TmdbTvAggregateCreditsResponse {
  id: number;
  cast: TmdbTvAggregateCastMember[];
}

export interface TmdbTvSeasonEpisode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;

  air_date: string | null;
  runtime: number | null;
  still_path: string | null;

  vote_average: number;
  vote_count: number;
}

export interface TmdbTvSeasonDetails {
  id: number;
  season_number: number;
  name: string;
  overview: string;

  air_date: string | null;
  poster_path: string | null;

  episodes: TmdbTvSeasonEpisode[];
}