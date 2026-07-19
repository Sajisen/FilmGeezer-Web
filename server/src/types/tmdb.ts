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
