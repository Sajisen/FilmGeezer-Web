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

export interface TmdbMovieDetails {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genres: TmdbGenre[];
  runtime: number | null;
  status: string;
  original_language: string;
}

export interface TmdbTvDetails {
  id: number;
  name: string;
  first_air_date: string;
  vote_average: number;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  genres: TmdbGenre[];
  number_of_seasons: number;
  status: string;
  original_language: string;
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
