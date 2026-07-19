import type {
  BrowseCategory,
  MediaDetails,
  MediaItem,
  MediaType,
  MediaVideo,
  SearchScope,
} from '../types/media.js'

import type {
  TmdbErrorResponse,
  TmdbGenreListResponse,
  TmdbKeywordSearchResponse,
  TmdbListResponse,
  TmdbListResult,
  TmdbMovieDetails,
  TmdbMultiSearchResponse,
  TmdbSearchResult,
  TmdbTvDetails,
} from "../types/tmdb.js";

import {
  isSuitableForPublicAnime,
  isSuitableForPublicKDrama,
  type CategoryMediaCandidate,
} from "../utils/categoryMedia.js";

export interface TmdbBrowseResult {
  page: number;
  totalPages: number;
  totalResults: number;
  results: MediaItem[];
  hasMore?: boolean;
}

export interface TmdbCatalogFilters {
  search?: string;
  genre?: string;
  language?: string;
  minRating?: number;
  page?: number;
}

export interface TmdbSearchFilters {
  genre?: string;
  language?: string;
  minRating?: number;
}

export class UnknownGenreError extends Error {
  constructor(genre: string) {
    super(`Unknown TMDB genre: ${genre}`);
    this.name = "UnknownGenreError";
  }
}

const genreMapCache: Partial<Record<MediaType, Map<number, string>>> = {};

const TMDB_API_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

const POSTER_FALLBACK_URL = "https://placehold.co/500x750?text=No+Poster";

const BACKDROP_FALLBACK_URL = "https://placehold.co/1280x720?text=No+Backdrop";

export class TmdbRequestError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TmdbRequestError";
    this.status = status;
  }
}

function getAccessToken() {
  const token = process.env.TMDB_READ_ACCESS_TOKEN;

  if (!token) {
    throw new Error(
      "TMDB_READ_ACCESS_TOKEN is missing from the server environment.",
    );
  }

  return token;
}

async function tmdbFetch<T>(path: string): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(`${TMDB_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      accept: "application/json",
    },
  });

  if (!response.ok) {
    let message = `TMDB request failed with status ${response.status}.`;

    try {
      const errorData = (await response.json()) as TmdbErrorResponse;

      if (errorData.status_message) {
        message = errorData.status_message;
      }
    } catch {
      // Keep the default error message if the response is not JSON.
    }

    throw new TmdbRequestError(message, response.status);
  }

  return (await response.json()) as T;
}

async function getGenreMap(mediaType: MediaType): Promise<Map<number, string>> {
  const cachedMap = genreMapCache[mediaType];

  if (cachedMap) {
    return cachedMap;
  }

  const data = await tmdbFetch<TmdbGenreListResponse>(
    `/genre/${mediaType}/list?language=en`,
  );

  const genreMap = new Map(data.genres.map((genre) => [genre.id, genre.name]));

  genreMapCache[mediaType] = genreMap;

  return genreMap;
}

const keywordIdCache = new Map<string, number | null>();

const pendingKeywordRequests = new Map<string, Promise<number | null>>();

async function getExactTmdbKeywordId(keywordName: string) {
  const normalizedKeyword = keywordName.trim().toLowerCase();

  if (keywordIdCache.has(normalizedKeyword)) {
    return keywordIdCache.get(normalizedKeyword) ?? null;
  }

  const pendingRequest = pendingKeywordRequests.get(normalizedKeyword);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = (async () => {
    const params = new URLSearchParams({
      query: keywordName,
      page: "1",
    });

    const response = await tmdbFetch<TmdbKeywordSearchResponse>(
      `/search/keyword?${params.toString()}`,
    );

    const exactMatch = response.results.find(
      (keyword) => keyword.name.trim().toLowerCase() === normalizedKeyword,
    );

    return exactMatch?.id ?? null;
  })();

  pendingKeywordRequests.set(normalizedKeyword, request);

  try {
    const keywordId = await request;

    keywordIdCache.set(normalizedKeyword, keywordId);

    return keywordId;
  } finally {
    pendingKeywordRequests.delete(normalizedKeyword);
  }
}

export async function getExactTmdbKeywordIds(keywordNames: string[]) {
  const keywordIds = await Promise.all(keywordNames.map(getExactTmdbKeywordId));

  return keywordIds.filter(
    (keywordId): keywordId is number => keywordId !== null,
  );
}

function findGenreIdByName(
  genreMap: Map<number, string>,
  genreName: string,
): number | null {
  const normalizedGenreName = genreName.trim().toLowerCase();

  for (const [genreId, name] of genreMap.entries()) {
    if (name.toLowerCase() === normalizedGenreName) {
      return genreId;
    }
  }

  return null;
}

function buildImageUrl(
  filePath: string | null,
  size: "w500" | "original",
  fallbackUrl: string,
) {
  if (!filePath) {
    return fallbackUrl;
  }

  return `${TMDB_IMAGE_BASE_URL}/${size}${filePath}`;
}

function getYear(date: string | undefined) {
  if (!date) {
    return "Unknown";
  }

  return date.slice(0, 4);
}

function formatRating(rating: number) {
  return Number((rating || 0).toFixed(1));
}

function formatRuntime(runtime: number | null) {
  if (!runtime || runtime <= 0) {
    return "Runtime unknown";
  }

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatSeasonCount(numberOfSeasons: number) {
  if (!numberOfSeasons || numberOfSeasons <= 0) {
    return "Season count unknown";
  }

  return `${numberOfSeasons} ${numberOfSeasons === 1 ? "Season" : "Seasons"}`;
}

function mapSearchResult(
  result: TmdbSearchResult,
  genreMaps: Record<MediaType, Map<number, string>>,
): MediaItem | null {
  if (result.media_type !== "movie" && result.media_type !== "tv") {
    return null;
  }

  const isMovie = result.media_type === "movie";
  const genreMap = genreMaps[result.media_type];

  const genres = (result.genre_ids ?? [])
    .map((genreId) => genreMap.get(genreId))
    .filter((genre): genre is string => Boolean(genre));

  return {
    tmdbId: result.id,
    title: isMovie
      ? result.title || "Untitled Movie"
      : result.name || "Untitled TV Series",
    mediaType: result.media_type,
    year: getYear(isMovie ? result.release_date : result.first_air_date),
    rating: formatRating(result.vote_average),
    posterUrl: buildImageUrl(result.poster_path, "w500", POSTER_FALLBACK_URL),
    backdropUrl: buildImageUrl(
      result.backdrop_path,
      "original",
      BACKDROP_FALLBACK_URL,
    ),
    overview: result.overview || "No overview is currently available.",
    genres,
    durationLabel: isMovie ? "Movie" : "TV Series",
    status: "Unknown",
    language: result.original_language?.toUpperCase() || "Unknown",
  };
}

function mapListResult(
  result: TmdbListResult,
  mediaType: MediaType,
  genreMap: Map<number, string>,
): MediaItem {
  const isMovie = mediaType === "movie";

  const genres = result.genre_ids
    .map((genreId) => genreMap.get(genreId))
    .filter((genre): genre is string => Boolean(genre));

  return {
    tmdbId: result.id,
    title: isMovie
      ? result.title || "Untitled Movie"
      : result.name || "Untitled TV Series",
    mediaType,
    year: getYear(isMovie ? result.release_date : result.first_air_date),
    rating: formatRating(result.vote_average),
    posterUrl: buildImageUrl(result.poster_path, "w500", POSTER_FALLBACK_URL),
    backdropUrl: buildImageUrl(
      result.backdrop_path,
      "original",
      BACKDROP_FALLBACK_URL,
    ),
    overview: result.overview || "No overview is currently available.",
    genres,
    durationLabel: isMovie ? "Movie" : "TV Series",
    status: "Unknown",
    language: result.original_language?.toUpperCase() || "Unknown",
  };
}

function applySearchFilters(items: MediaItem[], filters: TmdbSearchFilters) {
  const genre = filters.genre?.trim().toLowerCase();

  const language = filters.language?.trim().toLowerCase();

  return items.filter((item) => {
    if (
      genre &&
      !item.genres.some((itemGenre) => itemGenre.toLowerCase() === genre)
    ) {
      return false;
    }

    if (language && item.language.toLowerCase() !== language) {
      return false;
    }

    if (filters.minRating !== undefined && item.rating < filters.minRating) {
      return false;
    }

    return true;
  });
}

function buildBrowsePath(
  mediaType: MediaType,
  category: BrowseCategory,
  page: number,
) {
  if (category === "trending") {
    return `/trending/${mediaType}/week?language=en-US&page=${page}`;
  }

  if (category === "current") {
    const currentEndpoint =
      mediaType === "movie" ? "now_playing" : "on_the_air";

    return `/${mediaType}/${currentEndpoint}?language=en-US&page=${page}`;
  }

  return `/${mediaType}/${category}?language=en-US&page=${page}`;
}

function mapDetailsVideos(
  videos:
    | TmdbMovieDetails['videos']
    | TmdbTvDetails['videos'],
) {
  const mappedVideos: MediaVideo[] =
    (videos?.results ?? [])
      .filter(
        (video) =>
          video.site === 'YouTube' &&
          (video.type === 'Trailer' ||
            video.type === 'Teaser'),
      )
      .map((video) => ({
        id: video.id,
        key: video.key,
        name: video.name,

        site: 'YouTube' as const,

        type: video.type as
          | 'Trailer'
          | 'Teaser',

        official: video.official,

        language:
          video.iso_639_1
            ?.toUpperCase() ||
          'Unknown',

        publishedAt:
          video.published_at ?? '',
      }))
      .sort(
        (
          firstVideo,
          secondVideo,
        ) => {
          const firstScore =
            (firstVideo.type ===
            'Trailer'
              ? 4
              : 0) +
            (firstVideo.official
              ? 2
              : 0) +
            (firstVideo.language ===
            'EN'
              ? 1
              : 0)

          const secondScore =
            (secondVideo.type ===
            'Trailer'
              ? 4
              : 0) +
            (secondVideo.official
              ? 2
              : 0) +
            (secondVideo.language ===
            'EN'
              ? 1
              : 0)

          if (
            secondScore !== firstScore
          ) {
            return (
              secondScore -
              firstScore
            )
          }

          return secondVideo.publishedAt.localeCompare(
            firstVideo.publishedAt,
          )
        },
      )

  return mappedVideos.slice(0, 3)
}

function mapMovieDetails(
  movie: TmdbMovieDetails,
): MediaDetails {
  const videos = mapDetailsVideos(
    movie.videos,
  )

  return {
    tmdbId: movie.id,
    title: movie.title,

    originalTitle:
      movie.original_title ||
      movie.title,

    mediaType: 'movie',

    year: getYear(
      movie.release_date,
    ),

    fullReleaseDate:
      movie.release_date || '',

    rating: formatRating(
      movie.vote_average,
    ),

    voteCount:
      movie.vote_count ?? 0,

    posterUrl: buildImageUrl(
      movie.poster_path,
      'w500',
      POSTER_FALLBACK_URL,
    ),

    backdropUrl: buildImageUrl(
      movie.backdrop_path,
      'original',
      BACKDROP_FALLBACK_URL,
    ),

    overview:
      movie.overview ||
      'No overview is currently available.',

    genres: movie.genres.map(
      (genre) => genre.name,
    ),

    durationLabel:
      formatRuntime(movie.runtime),

    runtimeMinutes: movie.runtime,

    numberOfSeasons: null,
    numberOfEpisodes: null,
    seasons: [],

    status:
      movie.status || 'Unknown',

    language:
      movie.original_language
        ?.toUpperCase() ||
      'Unknown',

    tagline: movie.tagline || '',

    homepageUrl:
      movie.homepage || '',

    imdbId:
      movie.external_ids?.imdb_id ||
      '',

    videos,

    primaryTrailer:
      videos[0] ?? null,
  }
}

function mapTvDetails(
  show: TmdbTvDetails,
): MediaDetails {
  const videos = mapDetailsVideos(
    show.videos,
  )

  const runtimeMinutes =
    show.episode_run_time?.find(
      (runtime) => runtime > 0,
    ) ?? null

  return {
    tmdbId: show.id,
    title: show.name,

    originalTitle:
      show.original_name ||
      show.name,

    mediaType: 'tv',

    year: getYear(
      show.first_air_date,
    ),

    fullReleaseDate:
      show.first_air_date || '',

    rating: formatRating(
      show.vote_average,
    ),

    voteCount:
      show.vote_count ?? 0,

    posterUrl: buildImageUrl(
      show.poster_path,
      'w500',
      POSTER_FALLBACK_URL,
    ),

    backdropUrl: buildImageUrl(
      show.backdrop_path,
      'original',
      BACKDROP_FALLBACK_URL,
    ),

    overview:
      show.overview ||
      'No overview is currently available.',

    genres: show.genres.map(
      (genre) => genre.name,
    ),

    durationLabel:
      formatSeasonCount(
        show.number_of_seasons,
      ),

    runtimeMinutes,

    numberOfSeasons:
      show.number_of_seasons,

    numberOfEpisodes:
      show.number_of_episodes,

    seasons: show.seasons
      .filter(
        (season) =>
          season.season_number > 0,
      )
      .map((season) => ({
        tmdbSeasonId: season.id,

        seasonNumber:
          season.season_number,

        name: season.name,

        episodeCount:
          season.episode_count,

        airDate:
          season.air_date || '',

        overview:
          season.overview || '',

        posterUrl: buildImageUrl(
          season.poster_path,
          'w500',
          POSTER_FALLBACK_URL,
        ),
      })),

    status:
      show.status || 'Unknown',

    language:
      show.original_language
        ?.toUpperCase() ||
      'Unknown',

    tagline: show.tagline || '',

    homepageUrl:
      show.homepage || '',

    imdbId:
      show.external_ids?.imdb_id ||
      '',

    videos,

    primaryTrailer:
      videos[0] ?? null,
  }
}

function mapCategorySearchCandidate(
  result: TmdbSearchResult,
  item: MediaItem,
): CategoryMediaCandidate {
  return {
    item,
    isAdult: result.adult === true,

    isVideo: result.video === true,

    hasPoster: Boolean(result.poster_path),

    originCountries: result.origin_country ?? [],
  };
}

function isCategorySearchCandidate(
  scope: Extract<SearchScope, "anime" | "k-drama">,

  candidate: CategoryMediaCandidate,
) {
  return scope === "anime"
    ? isSuitableForPublicAnime(candidate)
    : isSuitableForPublicKDrama(candidate);
}

async function searchTmdbCategoryMedia(
  query: string,

  scope: Extract<SearchScope, "anime" | "k-drama">,

  page: number,
  filters: TmdbSearchFilters,
): Promise<TmdbBrowseResult> {
  const params = new URLSearchParams({
    query,
    include_adult: "false",
    language: "en-US",
    page: String(page),
  });

  const [data, movieGenreMap, tvGenreMap] = await Promise.all([
    tmdbFetch<TmdbMultiSearchResponse>(`/search/multi?${params.toString()}`),

    getGenreMap("movie"),
    getGenreMap("tv"),
  ]);

  if (filters.genre) {
    const movieGenreId = findGenreIdByName(movieGenreMap, filters.genre);

    const tvGenreId = findGenreIdByName(tvGenreMap, filters.genre);

    if (movieGenreId === null && tvGenreId === null) {
      throw new UnknownGenreError(filters.genre);
    }
  }

  const genreMaps: Record<MediaType, Map<number, string>> = {
    movie: movieGenreMap,
    tv: tvGenreMap,
  };

  const results = data.results
    .map((result) => {
      const item = mapSearchResult(result, genreMaps);

      if (!item) {
        return null;
      }

      const candidate = mapCategorySearchCandidate(result, item);

      return isCategorySearchCandidate(scope, candidate) ? item : null;
    })
    .filter((item): item is MediaItem => item !== null);

  const filteredResults = applySearchFilters(results, filters);

  return {
    page: data.page,
    totalPages: data.total_pages,

    /*
     * TMDB does not provide a filtered
     * Anime/K-Drama total after our
     * application-level category rules.
     */
    totalResults: filteredResults.length,

    results: filteredResults,

    hasMore: filteredResults.length > 0 && data.page < data.total_pages,
  };
}

export async function searchTmdbMedia(
  query: string,
  scope: SearchScope = "all",
  page = 1,
  filters: TmdbSearchFilters = {},
): Promise<TmdbBrowseResult> {
  if (scope === "movie" || scope === "tv") {
    return getTmdbCatalog(scope, {
      search: query,
      genre: filters.genre,
      language: filters.language,
      minRating: filters.minRating,
      page,
    });
  }

  if (scope === "anime" || scope === "k-drama") {
    return searchTmdbCategoryMedia(query, scope, page, filters);
  }

  const params = new URLSearchParams({
    query,
    include_adult: "false",
    language: "en-US",
    page: String(page),
  });

  const [data, movieGenreMap, tvGenreMap] = await Promise.all([
    tmdbFetch<TmdbMultiSearchResponse>(`/search/multi?${params.toString()}`),
    getGenreMap("movie"),
    getGenreMap("tv"),
  ]);

  if (filters.genre) {
    const movieGenreId = findGenreIdByName(movieGenreMap, filters.genre);

    const tvGenreId = findGenreIdByName(tvGenreMap, filters.genre);

    if (movieGenreId === null && tvGenreId === null) {
      throw new UnknownGenreError(filters.genre);
    }
  }

  const genreMaps: Record<MediaType, Map<number, string>> = {
    movie: movieGenreMap,
    tv: tvGenreMap,
  };

  const mappedResults = data.results
    .map((item) => mapSearchResult(item, genreMaps))
    .filter((item): item is MediaItem => item !== null);

  return {
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
    results: applySearchFilters(mappedResults, filters),
  };
}

export interface TmdbHomeSourceLists {
  trendingMovies: MediaItem[];
  trendingTv: MediaItem[];
  trendingKDrama: MediaItem[];
  animeMovies: MediaItem[];
  animeTv: MediaItem[];
  kDramaTv: MediaItem[];
}

function mapPublicListResults(
  results: TmdbListResult[],
  mediaType: MediaType,
  genreMap: Map<number, string>,
) {
  return results
    .filter((result) => result.adult !== true && Boolean(result.poster_path))
    .map((result) => mapListResult(result, mediaType, genreMap));
}

export async function getTmdbHomeSourceLists(): Promise<TmdbHomeSourceLists> {
  const [movieGenreMap, tvGenreMap] = await Promise.all([
    getGenreMap("movie"),
    getGenreMap("tv"),
  ]);

  const movieAnimationGenreId = findGenreIdByName(movieGenreMap, "Animation");

  const tvAnimationGenreId = findGenreIdByName(tvGenreMap, "Animation");

  if (movieAnimationGenreId === null || tvAnimationGenreId === null) {
    throw new UnknownGenreError("Animation");
  }

  const animeMovieParams = new URLSearchParams({
    include_adult: "false",
    include_video: "false",
    language: "en-US",
    page: "1",
    sort_by: "popularity.desc",
    "vote_count.gte": "10",
    with_genres: String(movieAnimationGenreId),
    with_original_language: "ja",
  });

  const animeTvParams = new URLSearchParams({
    include_adult: "false",
    include_null_first_air_dates: "false",
    language: "en-US",
    page: "1",
    sort_by: "popularity.desc",
    "vote_count.gte": "10",
    with_genres: String(tvAnimationGenreId),
    with_original_language: "ja",
  });

  const kDramaTvParams = new URLSearchParams({
    include_adult: "false",
    include_null_first_air_dates: "false",
    language: "en-US",
    page: "1",
    sort_by: "popularity.desc",
    "vote_count.gte": "10",
    with_origin_country: "KR",
    without_genres: String(tvAnimationGenreId),
    with_original_language: "ko",
  });

  const [
    trendingMovieData,
    trendingTvData,
    animeMovieData,
    animeTvData,
    kDramaTvData,
  ] = await Promise.all([
    tmdbFetch<TmdbListResponse>("/trending/movie/week?language=en-US&page=1"),

    tmdbFetch<TmdbListResponse>("/trending/tv/week?language=en-US&page=1"),

    tmdbFetch<TmdbListResponse>(
      `/discover/movie?${animeMovieParams.toString()}`,
    ),

    tmdbFetch<TmdbListResponse>(`/discover/tv?${animeTvParams.toString()}`),

    tmdbFetch<TmdbListResponse>(`/discover/tv?${kDramaTvParams.toString()}`),
  ]);

  return {
    trendingMovies: mapPublicListResults(
      trendingMovieData.results,
      "movie",
      movieGenreMap,
    ),

    trendingTv: mapPublicListResults(trendingTvData.results, "tv", tvGenreMap),

    trendingKDrama: mapPublicListResults(
      trendingTvData.results.filter(
        (result) =>
          result.original_language === "ko" &&
          result.origin_country?.includes("KR") &&
          !result.genre_ids.includes(tvAnimationGenreId),
      ),
      "tv",
      tvGenreMap,
    ),

    animeMovies: mapPublicListResults(
      animeMovieData.results,
      "movie",
      movieGenreMap,
    ),

    animeTv: mapPublicListResults(animeTvData.results, "tv", tvGenreMap),

    kDramaTv: mapPublicListResults(kDramaTvData.results, "tv", tvGenreMap),
  };
}

export interface TmdbMovieCollectionCandidate {
  item: MediaItem;
  isAdult: boolean;
  isVideo: boolean;
  hasPoster: boolean;
  hasBackdrop: boolean;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  releaseDate: string;
}

export interface TmdbMovieCollectionSources {
  trending: TmdbMovieCollectionCandidate[];
  nowPlaying: TmdbMovieCollectionCandidate[];
  popularQuality: TmdbMovieCollectionCandidate[];
  mostVoted: TmdbMovieCollectionCandidate[];
  highlyRated: TmdbMovieCollectionCandidate[];

  actionAdventureCrimeThriller: TmdbMovieCollectionCandidate[];

  comedy: TmdbMovieCollectionCandidate[];
  dramaRomance: TmdbMovieCollectionCandidate[];
  family: TmdbMovieCollectionCandidate[];
}

function mapMovieCollectionCandidate(
  result: TmdbListResult,
  genreMap: Map<number, string>,
): TmdbMovieCollectionCandidate {
  return {
    item: mapListResult(result, "movie", genreMap),

    isAdult: result.adult === true,
    isVideo: result.video === true,
    hasPoster: Boolean(result.poster_path),
    hasBackdrop: Boolean(result.backdrop_path),

    popularity: result.popularity ?? 0,
    voteAverage: result.vote_average ?? 0,
    voteCount: result.vote_count ?? 0,
    releaseDate: result.release_date ?? "",
  };
}

type MovieCollectionSort =
  | "popularity.desc"
  | "vote_count.desc"
  | "vote_average.desc";

function createMovieDiscoverParams(
  sortBy: MovieCollectionSort,
  page: number,
  withoutGenres: string,
) {
  const isHighlyRated = sortBy === "vote_average.desc";

  const params = new URLSearchParams({
    include_adult: "false",
    include_video: "false",
    language: "en-US",
    page: String(page),
    sort_by: sortBy,

    "vote_average.gte": isHighlyRated ? "7" : "6",

    "vote_count.gte": isHighlyRated ? "800" : "200",

    "with_runtime.gte": "70",
    without_genres: withoutGenres,
  });

  return params.toString();
}

interface MovieGenreCollectionDefinition {
  genreNames: string[];
  minVoteAverage: number;
  minVoteCount: number;
}

function getRequiredMovieGenreIds(
  genreMap: Map<number, string>,
  genreNames: string[],
) {
  return genreNames.map((genreName) => {
    const genreId = findGenreIdByName(genreMap, genreName);

    if (genreId === null) {
      throw new UnknownGenreError(genreName);
    }

    return genreId;
  });
}

function createMovieGenreDiscoverParams(
  definition: MovieGenreCollectionDefinition,
  genreMap: Map<number, string>,
  withoutGenres: string,
) {
  const genreIds = getRequiredMovieGenreIds(genreMap, definition.genreNames);

  const params = new URLSearchParams({
    include_adult: "false",
    include_video: "false",
    language: "en-US",
    page: "1",
    sort_by: "popularity.desc",

    "vote_average.gte": String(definition.minVoteAverage),

    "vote_count.gte": String(definition.minVoteCount),

    "with_runtime.gte": "70",

    with_genres: genreIds.join("|"),

    without_genres: withoutGenres,
  });

  return params.toString();
}

async function getMovieGenreCollectionPage(
  definition: MovieGenreCollectionDefinition,
  genreMap: Map<number, string>,
  withoutGenres: string,
) {
  const params = createMovieGenreDiscoverParams(
    definition,
    genreMap,
    withoutGenres,
  );

  const data = await tmdbFetch<TmdbListResponse>(`/discover/movie?${params}`);

  return data.results;
}

async function getMovieDiscoverPages(
  sortBy: MovieCollectionSort,
  pageCount: number,
  withoutGenres: string,
) {
  const requests = Array.from({ length: pageCount }, (_, index) =>
    tmdbFetch<TmdbListResponse>(
      `/discover/movie?${createMovieDiscoverParams(
        sortBy,
        index + 1,
        withoutGenres,
      )}`,
    ),
  );

  const pages = await Promise.all(requests);

  return pages.flatMap((page) => page.results);
}

export async function getTmdbMovieCollectionSources(): Promise<TmdbMovieCollectionSources> {
  const genreMap = await getGenreMap("movie");

  const documentaryGenreId = findGenreIdByName(genreMap, "Documentary");

  const tvMovieGenreId = findGenreIdByName(genreMap, "TV Movie");

  if (documentaryGenreId === null || tvMovieGenreId === null) {
    throw new UnknownGenreError("Documentary or TV Movie");
  }

  const withoutGenres = `${documentaryGenreId}|${tvMovieGenreId}`;

  const [
    trendingData,
    nowPlayingData,
    popularQualityData,
    mostVotedData,
    highlyRatedData,
  ] = await Promise.all([
    tmdbFetch<TmdbListResponse>("/trending/movie/week?language=en-US&page=1"),

    tmdbFetch<TmdbListResponse>("/movie/now_playing?language=en-US&page=1"),

    getMovieDiscoverPages("popularity.desc", 3, withoutGenres),

    getMovieDiscoverPages("vote_count.desc", 2, withoutGenres),

    getMovieDiscoverPages("vote_average.desc", 2, withoutGenres),
  ]);

  const [
    actionAdventureCrimeThrillerData,
    comedyData,
    dramaRomanceData,
    familyData,
  ] = await Promise.all([
    getMovieGenreCollectionPage(
      {
        genreNames: ["Action", "Adventure", "Crime", "Thriller"],

        minVoteAverage: 6.2,
        minVoteCount: 300,
      },
      genreMap,
      withoutGenres,
    ),

    getMovieGenreCollectionPage(
      {
        genreNames: ["Comedy"],

        minVoteAverage: 6.2,
        minVoteCount: 250,
      },
      genreMap,
      withoutGenres,
    ),

    getMovieGenreCollectionPage(
      {
        genreNames: ["Drama", "Romance"],

        minVoteAverage: 6.5,
        minVoteCount: 250,
      },
      genreMap,
      withoutGenres,
    ),

    getMovieGenreCollectionPage(
      {
        genreNames: ["Family"],

        minVoteAverage: 6.2,
        minVoteCount: 150,
      },
      genreMap,
      withoutGenres,
    ),
  ]);

  function mapCandidates(results: TmdbListResult[]) {
    return results.map((result) =>
      mapMovieCollectionCandidate(result, genreMap),
    );
  }

  return {
    trending: mapCandidates(trendingData.results),

    nowPlaying: mapCandidates(nowPlayingData.results),

    popularQuality: mapCandidates(popularQualityData),

    mostVoted: mapCandidates(mostVotedData),

    highlyRated: mapCandidates(highlyRatedData),

    actionAdventureCrimeThriller: mapCandidates(
      actionAdventureCrimeThrillerData,
    ),

    comedy: mapCandidates(comedyData),

    dramaRomance: mapCandidates(dramaRomanceData),

    family: mapCandidates(familyData),
  };
}

export interface TmdbTvCollectionCandidate {
  item: MediaItem;
  isAdult: boolean;
  hasPoster: boolean;
  hasBackdrop: boolean;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  originCountries: string[];
}

export interface TmdbTvCollectionSources {
  trending: TmdbTvCollectionCandidate[];
  onTheAir: TmdbTvCollectionCandidate[];
  popularQuality: TmdbTvCollectionCandidate[];
  mostVoted: TmdbTvCollectionCandidate[];
  highlyRated: TmdbTvCollectionCandidate[];

  actionCrimeThriller: TmdbTvCollectionCandidate[];

  comedy: TmdbTvCollectionCandidate[];
  dramaRomance: TmdbTvCollectionCandidate[];

  mysteryScienceFiction: TmdbTvCollectionCandidate[];
}

function mapTvCollectionCandidate(
  result: TmdbListResult,
  genreMap: Map<number, string>,
): TmdbTvCollectionCandidate {
  return {
    item: mapListResult(result, "tv", genreMap),

    isAdult: result.adult === true,
    hasPoster: Boolean(result.poster_path),
    hasBackdrop: Boolean(result.backdrop_path),

    popularity: result.popularity ?? 0,
    voteAverage: result.vote_average ?? 0,
    voteCount: result.vote_count ?? 0,

    originCountries: result.origin_country ?? [],
  };
}

type TvCollectionSort =
  | "popularity.desc"
  | "vote_count.desc"
  | "vote_average.desc";

function createTvDiscoverParams(
  sortBy: TvCollectionSort,
  page: number,
  withoutGenres: string,
) {
  const isHighlyRated = sortBy === "vote_average.desc";

  const params = new URLSearchParams({
    include_adult: "false",

    include_null_first_air_dates: "false",

    language: "en-US",
    page: String(page),
    sort_by: sortBy,

    "vote_average.gte": isHighlyRated ? "7" : "6",

    "vote_count.gte": isHighlyRated ? "300" : "100",

    without_genres: withoutGenres,
  });

  return params.toString();
}

interface TvGenreCollectionDefinition {
  genreNames: string[];
  minVoteAverage: number;
  minVoteCount: number;
}

function getRequiredTvGenreIds(
  genreMap: Map<number, string>,
  genreNames: string[],
) {
  return genreNames.map((genreName) => {
    const genreId = findGenreIdByName(genreMap, genreName);

    if (genreId === null) {
      throw new UnknownGenreError(genreName);
    }

    return genreId;
  });
}

function createTvGenreDiscoverParams(
  definition: TvGenreCollectionDefinition,
  genreMap: Map<number, string>,
  withoutGenres: string,
) {
  const genreIds = getRequiredTvGenreIds(genreMap, definition.genreNames);

  const params = new URLSearchParams({
    include_adult: "false",

    include_null_first_air_dates: "false",

    language: "en-US",
    page: "1",
    sort_by: "popularity.desc",

    "vote_average.gte": String(definition.minVoteAverage),

    "vote_count.gte": String(definition.minVoteCount),

    with_genres: genreIds.join("|"),

    without_genres: withoutGenres,
  });

  return params.toString();
}

async function getTvGenreCollectionPage(
  definition: TvGenreCollectionDefinition,
  genreMap: Map<number, string>,
  withoutGenres: string,
) {
  const params = createTvGenreDiscoverParams(
    definition,
    genreMap,
    withoutGenres,
  );

  const data = await tmdbFetch<TmdbListResponse>(`/discover/tv?${params}`);

  return data.results;
}

async function getTvDiscoverPages(
  sortBy: TvCollectionSort,
  pageCount: number,
  withoutGenres: string,
) {
  const requests = Array.from({ length: pageCount }, (_, index) =>
    tmdbFetch<TmdbListResponse>(
      `/discover/tv?${createTvDiscoverParams(
        sortBy,
        index + 1,
        withoutGenres,
      )}`,
    ),
  );

  const pages = await Promise.all(requests);

  return pages.flatMap((page) => page.results);
}

export async function getTmdbTvCollectionSources(): Promise<TmdbTvCollectionSources> {
  const genreMap = await getGenreMap("tv");

  const excludedGenreNames = ["News", "Reality", "Talk"];

  const excludedGenreIds = excludedGenreNames.map((genreName) => {
    const genreId = findGenreIdByName(genreMap, genreName);

    if (genreId === null) {
      throw new UnknownGenreError(genreName);
    }

    return genreId;
  });

  const withoutGenres = excludedGenreIds.join("|");

  const [
    trendingData,
    onTheAirData,
    popularQualityData,
    mostVotedData,
    highlyRatedData,
  ] = await Promise.all([
    tmdbFetch<TmdbListResponse>("/trending/tv/week?language=en-US&page=1"),

    tmdbFetch<TmdbListResponse>("/tv/on_the_air?language=en-US&page=1"),

    getTvDiscoverPages("popularity.desc", 3, withoutGenres),

    getTvDiscoverPages("vote_count.desc", 2, withoutGenres),

    getTvDiscoverPages("vote_average.desc", 2, withoutGenres),
  ]);

  const [
    actionCrimeThrillerData,
    comedyData,
    dramaRomanceData,
    mysteryScienceFictionData,
  ] = await Promise.all([
    getTvGenreCollectionPage(
      {
        genreNames: ["Action & Adventure", "Crime", "Mystery"],

        minVoteAverage: 6.3,
        minVoteCount: 150,
      },

      genreMap,
      withoutGenres,
    ),

    getTvGenreCollectionPage(
      {
        genreNames: ["Comedy"],

        minVoteAverage: 6.3,
        minVoteCount: 120,
      },

      genreMap,
      withoutGenres,
    ),

    getTvGenreCollectionPage(
      {
        genreNames: ["Drama"],

        minVoteAverage: 6.5,
        minVoteCount: 150,
      },

      genreMap,
      withoutGenres,
    ),

    getTvGenreCollectionPage(
      {
        genreNames: ["Mystery", "Sci-Fi & Fantasy"],

        minVoteAverage: 6.5,
        minVoteCount: 150,
      },

      genreMap,
      withoutGenres,
    ),
  ]);

  function mapCandidates(results: TmdbListResult[]) {
    return results.map((result) => mapTvCollectionCandidate(result, genreMap));
  }

  return {
    trending: mapCandidates(trendingData.results),

    onTheAir: mapCandidates(onTheAirData.results),

    popularQuality: mapCandidates(popularQualityData),

    mostVoted: mapCandidates(mostVotedData),

    highlyRated: mapCandidates(highlyRatedData),

    actionCrimeThriller: mapCandidates(actionCrimeThrillerData),

    comedy: mapCandidates(comedyData),

    dramaRomance: mapCandidates(dramaRomanceData),

    mysteryScienceFiction: mapCandidates(mysteryScienceFictionData),
  };
}

export interface TmdbAnimeCollectionCandidate {
  item: MediaItem;
  isAdult: boolean;
  isVideo: boolean;
  hasPoster: boolean;
  hasBackdrop: boolean;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  originCountries: string[];
}

export interface TmdbAnimePrimarySources {
  trendingMovies: TmdbAnimeCollectionCandidate[];

  trendingTv: TmdbAnimeCollectionCandidate[];

  popularMovies: TmdbAnimeCollectionCandidate[];

  popularTv: TmdbAnimeCollectionCandidate[];

  mostVotedMovies: TmdbAnimeCollectionCandidate[];

  mostVotedTv: TmdbAnimeCollectionCandidate[];

  romanceKeywordMovies: TmdbAnimeCollectionCandidate[];

  romanceKeywordTv: TmdbAnimeCollectionCandidate[];

  sliceOfLifeMovies: TmdbAnimeCollectionCandidate[];

  sliceOfLifeTv: TmdbAnimeCollectionCandidate[];
}

const blockedAnimeKeywordNames = [
  "hentai",
  "ecchi",
  "adult animation",
  "pornography",
] as const;

function mapAnimeCollectionCandidate(
  result: TmdbListResult,
  mediaType: MediaType,
  genreMap: Map<number, string>,
): TmdbAnimeCollectionCandidate {
  return {
    item: mapListResult(result, mediaType, genreMap),

    isAdult: result.adult === true,
    isVideo: result.video === true,

    hasPoster: Boolean(result.poster_path),

    hasBackdrop: Boolean(result.backdrop_path),

    popularity: result.popularity ?? 0,

    voteAverage: result.vote_average ?? 0,

    voteCount: result.vote_count ?? 0,

    originCountries: result.origin_country ?? [],
  };
}

type AnimeCollectionSort = "popularity.desc" | "vote_count.desc";

interface AnimeDiscoverOptions {
  mediaType: MediaType;
  animationGenreId: number;
  blockedKeywordIds: number[];
  sortBy: AnimeCollectionSort;
  page: number;
  minVoteAverage: number;
  minVoteCount: number;
  withKeywordIds?: number[];
}

function createAnimeDiscoverParams(options: AnimeDiscoverOptions) {
  const params = new URLSearchParams({
    include_adult: "false",
    language: "en-US",

    page: String(options.page),

    sort_by: options.sortBy,

    "vote_average.gte": String(options.minVoteAverage),

    "vote_count.gte": String(options.minVoteCount),

    with_genres: String(options.animationGenreId),

    with_origin_country: "JP",

    with_original_language: "ja",
  });

  if (options.mediaType === "movie") {
    params.set("include_video", "false");

    params.set("with_runtime.gte", "40");
  } else {
    params.set("include_null_first_air_dates", "false");
  }

  if (options.blockedKeywordIds.length > 0) {
    params.set(
      "without_keywords",

      options.blockedKeywordIds.join("|"),
    );
  }

  if (options.withKeywordIds && options.withKeywordIds.length > 0) {
    params.set(
      "with_keywords",

      options.withKeywordIds.join("|"),
    );
  }

  return params.toString();
}

async function getAnimeDiscoverPages(
  mediaType: MediaType,
  animationGenreId: number,
  blockedKeywordIds: number[],
  sortBy: AnimeCollectionSort,
  pageCount: number,
  minVoteAverage: number,
  minVoteCount: number,
  withKeywordIds: number[] = [],
) {
  const requests = Array.from(
    {
      length: pageCount,
    },

    (_, index) =>
      tmdbFetch<TmdbListResponse>(
        `/discover/${mediaType}?${createAnimeDiscoverParams({
          mediaType,
          animationGenreId,
          blockedKeywordIds,
          sortBy,
          page: index + 1,
          minVoteAverage,
          minVoteCount,
          withKeywordIds,
        })}`,
      ),
  );

  const pages = await Promise.all(requests);

  return pages.flatMap((page) => page.results);
}

export async function getTmdbAnimePrimarySources(): Promise<TmdbAnimePrimarySources> {
  const [
    movieGenreMap,
    tvGenreMap,
    blockedKeywordIds,
    romanceKeywordIds,
    sliceOfLifeKeywordIds,
  ] = await Promise.all([
    getGenreMap("movie"),
    getGenreMap("tv"),

    getExactTmdbKeywordIds([...blockedAnimeKeywordNames]),

    getExactTmdbKeywordIds(["romance", "love story", "romantic comedy"]),

    getExactTmdbKeywordIds(["slice of life"]),
  ]);

  const movieAnimationGenreId = findGenreIdByName(movieGenreMap, "Animation");

  const tvAnimationGenreId = findGenreIdByName(tvGenreMap, "Animation");

  if (movieAnimationGenreId === null || tvAnimationGenreId === null) {
    throw new UnknownGenreError("Animation");
  }

  const [
    trendingMovieData,
    trendingTvData,

    popularMovieData,
    popularTvData,

    mostVotedMovieData,
    mostVotedTvData,

    romanceMovieData,
    romanceTvData,

    sliceOfLifeMovieData,
    sliceOfLifeTvData,
  ] = await Promise.all([
    tmdbFetch<TmdbListResponse>("/trending/movie/week?language=en-US&page=1"),

    tmdbFetch<TmdbListResponse>("/trending/tv/week?language=en-US&page=1"),

    getAnimeDiscoverPages(
      "movie",
      movieAnimationGenreId,
      blockedKeywordIds,
      "popularity.desc",
      3,
      6,
      20,
    ),

    getAnimeDiscoverPages(
      "tv",
      tvAnimationGenreId,
      blockedKeywordIds,
      "popularity.desc",
      3,
      6,
      20,
    ),

    getAnimeDiscoverPages(
      "movie",
      movieAnimationGenreId,
      blockedKeywordIds,
      "vote_count.desc",
      2,
      6.5,
      50,
    ),

    getAnimeDiscoverPages(
      "tv",
      tvAnimationGenreId,
      blockedKeywordIds,
      "vote_count.desc",
      2,
      6.5,
      50,
    ),

    getAnimeDiscoverPages(
      "movie",
      movieAnimationGenreId,
      blockedKeywordIds,
      "popularity.desc",
      1,
      6.3,
      20,
      romanceKeywordIds,
    ),

    getAnimeDiscoverPages(
      "tv",
      tvAnimationGenreId,
      blockedKeywordIds,
      "popularity.desc",
      1,
      6.3,
      20,
      romanceKeywordIds,
    ),

    getAnimeDiscoverPages(
      "movie",
      movieAnimationGenreId,
      blockedKeywordIds,
      "popularity.desc",
      1,
      6.2,
      10,
      sliceOfLifeKeywordIds,
    ),

    getAnimeDiscoverPages(
      "tv",
      tvAnimationGenreId,
      blockedKeywordIds,
      "popularity.desc",
      1,
      6.2,
      10,
      sliceOfLifeKeywordIds,
    ),
  ]);

  function mapMovieCandidates(results: TmdbListResult[]) {
    return results.map((result) =>
      mapAnimeCollectionCandidate(result, "movie", movieGenreMap),
    );
  }

  function mapTvCandidates(results: TmdbListResult[]) {
    return results.map((result) =>
      mapAnimeCollectionCandidate(result, "tv", tvGenreMap),
    );
  }

  return {
    trendingMovies: mapMovieCandidates(trendingMovieData.results),

    trendingTv: mapTvCandidates(trendingTvData.results),

    popularMovies: mapMovieCandidates(popularMovieData),

    popularTv: mapTvCandidates(popularTvData),

    mostVotedMovies: mapMovieCandidates(mostVotedMovieData),

    mostVotedTv: mapTvCandidates(mostVotedTvData),

    romanceKeywordMovies: mapMovieCandidates(romanceMovieData),

    romanceKeywordTv: mapTvCandidates(romanceTvData),

    sliceOfLifeMovies: mapMovieCandidates(sliceOfLifeMovieData),

    sliceOfLifeTv: mapTvCandidates(sliceOfLifeTvData),
  };
}

export interface TmdbKDramaCollectionCandidate {
  item: MediaItem;
  isAdult: boolean;
  isVideo: boolean;
  hasPoster: boolean;
  hasBackdrop: boolean;
  popularity: number;
  voteAverage: number;
  voteCount: number;
  originCountries: string[];
}

export interface TmdbKDramaPrimarySources {
  trendingMovies: TmdbKDramaCollectionCandidate[];

  trendingTv: TmdbKDramaCollectionCandidate[];

  recentMovies: TmdbKDramaCollectionCandidate[];

  currentlyAiringTv: TmdbKDramaCollectionCandidate[];

  popularMovies: TmdbKDramaCollectionCandidate[];

  popularTv: TmdbKDramaCollectionCandidate[];

  mostVotedMovies: TmdbKDramaCollectionCandidate[];

  mostVotedTv: TmdbKDramaCollectionCandidate[];

  highlyRatedMovies: TmdbKDramaCollectionCandidate[];

  highlyRatedTv: TmdbKDramaCollectionCandidate[];

  romanceKeywordMovies: TmdbKDramaCollectionCandidate[];

  romanceKeywordTv: TmdbKDramaCollectionCandidate[];

  suspenseKeywordMovies: TmdbKDramaCollectionCandidate[];

  suspenseKeywordTv: TmdbKDramaCollectionCandidate[];

  feelGoodKeywordMovies: TmdbKDramaCollectionCandidate[];

  feelGoodKeywordTv: TmdbKDramaCollectionCandidate[];
}

function mapKDramaCollectionCandidate(
  result: TmdbListResult,
  mediaType: MediaType,
  genreMap: Map<number, string>,
): TmdbKDramaCollectionCandidate {
  return {
    item: mapListResult(result, mediaType, genreMap),

    isAdult: result.adult === true,
    isVideo: result.video === true,

    hasPoster: Boolean(result.poster_path),

    hasBackdrop: Boolean(result.backdrop_path),

    popularity: result.popularity ?? 0,

    voteAverage: result.vote_average ?? 0,

    voteCount: result.vote_count ?? 0,

    originCountries: result.origin_country ?? [],
  };
}

type KDramaCollectionSort =
  | "popularity.desc"
  | "vote_count.desc"
  | "vote_average.desc"
  | "primary_release_date.desc"
  | "first_air_date.desc";

interface KDramaDiscoverOptions {
  mediaType: MediaType;
  sortBy: KDramaCollectionSort;
  page: number;
  minVoteAverage: number;
  minVoteCount: number;
  withoutGenreIds: number[];

  primaryReleaseDateGte?: string;
  airDateGte?: string;
  airDateLte?: string;
  withKeywordIds?: number[];
}

function createKDramaDiscoverParams(options: KDramaDiscoverOptions) {
  const params = new URLSearchParams({
    include_adult: "false",
    language: "en-US",

    page: String(options.page),

    sort_by: options.sortBy,

    "vote_average.gte": String(options.minVoteAverage),

    "vote_count.gte": String(options.minVoteCount),

    with_origin_country: "KR",

    with_original_language: "ko",
  });

  if (options.withoutGenreIds.length > 0) {
    params.set(
      "without_genres",

      options.withoutGenreIds.join("|"),
    );
  }

  if (options.withKeywordIds && options.withKeywordIds.length > 0) {
    params.set(
      "with_keywords",

      options.withKeywordIds.join("|"),
    );
  }

  if (options.mediaType === "movie") {
    params.set("include_video", "false");

    params.set("with_runtime.gte", "60");

    if (options.primaryReleaseDateGte) {
      params.set(
        "primary_release_date.gte",

        options.primaryReleaseDateGte,
      );
    }
  } else {
    params.set("include_null_first_air_dates", "false");

    if (options.airDateGte) {
      params.set("air_date.gte", options.airDateGte);
    }

    if (options.airDateLte) {
      params.set("air_date.lte", options.airDateLte);
    }

    if (options.airDateGte || options.airDateLte) {
      params.set("timezone", "Asia/Seoul");
    }
  }

  return params.toString();
}

async function getKDramaDiscoverPages(
  mediaType: MediaType,
  sortBy: KDramaCollectionSort,
  pageCount: number,
  minVoteAverage: number,
  minVoteCount: number,
  withoutGenreIds: number[],

  additionalFilters: Pick<
    KDramaDiscoverOptions,
    "withKeywordIds" | "primaryReleaseDateGte" | "airDateGte" | "airDateLte"
  > = {},
) {
  const requests = Array.from(
    {
      length: pageCount,
    },

    (_, index) =>
      tmdbFetch<TmdbListResponse>(
        `/discover/${mediaType}?${createKDramaDiscoverParams({
          mediaType,
          sortBy,
          page: index + 1,
          minVoteAverage,
          minVoteCount,
          withoutGenreIds,
          ...additionalFilters,
        })}`,
      ),
  );

  const pages = await Promise.all(requests);

  return pages.flatMap((page) => page.results);
}

async function getKDramaKeywordDiscoverPages(
  mediaType: MediaType,
  keywordIds: number[],
  minVoteAverage: number,
  minVoteCount: number,
  withoutGenreIds: number[],
) {
  if (keywordIds.length === 0) {
    return [];
  }

  return getKDramaDiscoverPages(
    mediaType,
    "popularity.desc",
    1,
    minVoteAverage,
    minVoteCount,
    withoutGenreIds,

    {
      withKeywordIds: keywordIds,
    },
  );
}

function getRequiredGenreIds(
  genreMap: Map<number, string>,
  genreNames: string[],
) {
  return genreNames.map((genreName) => {
    const genreId = findGenreIdByName(genreMap, genreName);

    if (genreId === null) {
      throw new UnknownGenreError(genreName);
    }

    return genreId;
  });
}

function formatTmdbDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number) {
  const result = new Date(date);

  result.setUTCDate(result.getUTCDate() + days);

  return result;
}

export async function getTmdbKDramaPrimarySources(): Promise<TmdbKDramaPrimarySources> {
  const [
    movieGenreMap,
    tvGenreMap,
    romanceKeywordIds,
    suspenseKeywordIds,
    feelGoodKeywordIds,
  ] = await Promise.all([
    getGenreMap("movie"),
    getGenreMap("tv"),

    getExactTmdbKeywordIds(["romance", "love story", "romantic comedy"]),

    getExactTmdbKeywordIds(["suspense", "psychological thriller", "thriller"]),

    getExactTmdbKeywordIds(["feel-good", "heartwarming", "friendship"]),
  ]);

  const movieExcludedGenreIds = getRequiredGenreIds(
    movieGenreMap,

    ["Animation", "Documentary", "TV Movie"],
  );

  const tvExcludedGenreIds = getRequiredGenreIds(
    tvGenreMap,

    ["Animation", "Documentary", "News", "Reality", "Talk"],
  );

  const today = new Date();

  const recentMovieCutoff = addUtcDays(today, -548);

  const airingWindowEnd = addUtcDays(today, 7);

  const [
    trendingMovieData,
    trendingTvData,

    recentMovieData,
    currentlyAiringTvData,

    popularMovieData,
    popularTvData,

    mostVotedMovieData,
    mostVotedTvData,

    highlyRatedMovieData,
    highlyRatedTvData,

    romanceKeywordMovieData,
    romanceKeywordTvData,

    suspenseKeywordMovieData,
    suspenseKeywordTvData,

    feelGoodKeywordMovieData,
    feelGoodKeywordTvData,
  ] = await Promise.all([
    tmdbFetch<TmdbListResponse>("/trending/movie/week?language=en-US&page=1"),

    tmdbFetch<TmdbListResponse>("/trending/tv/week?language=en-US&page=1"),

    getKDramaDiscoverPages(
      "movie",
      "primary_release_date.desc",
      1,
      0,
      0,
      movieExcludedGenreIds,

      {
        primaryReleaseDateGte: formatTmdbDate(recentMovieCutoff),
      },
    ),

    getKDramaDiscoverPages(
      "tv",
      "popularity.desc",
      1,
      0,
      0,
      tvExcludedGenreIds,

      {
        airDateGte: formatTmdbDate(today),

        airDateLte: formatTmdbDate(airingWindowEnd),
      },
    ),

    getKDramaDiscoverPages(
      "movie",
      "popularity.desc",
      3,
      6,
      20,
      movieExcludedGenreIds,
    ),

    getKDramaDiscoverPages(
      "tv",
      "popularity.desc",
      3,
      6,
      20,
      tvExcludedGenreIds,
    ),

    getKDramaDiscoverPages(
      "movie",
      "vote_count.desc",
      2,
      6.3,
      50,
      movieExcludedGenreIds,
    ),

    getKDramaDiscoverPages(
      "tv",
      "vote_count.desc",
      2,
      6.5,
      50,
      tvExcludedGenreIds,
    ),

    getKDramaDiscoverPages(
      "movie",
      "vote_average.desc",
      2,
      6.8,
      100,
      movieExcludedGenreIds,
    ),

    getKDramaDiscoverPages(
      "tv",
      "vote_average.desc",
      2,
      7,
      80,
      tvExcludedGenreIds,
    ),
    getKDramaKeywordDiscoverPages(
      "movie",
      romanceKeywordIds,
      6.2,
      20,
      movieExcludedGenreIds,
    ),

    getKDramaKeywordDiscoverPages(
      "tv",
      romanceKeywordIds,
      6.5,
      20,
      tvExcludedGenreIds,
    ),

    getKDramaKeywordDiscoverPages(
      "movie",
      suspenseKeywordIds,
      6.2,
      20,
      movieExcludedGenreIds,
    ),

    getKDramaKeywordDiscoverPages(
      "tv",
      suspenseKeywordIds,
      6.5,
      20,
      tvExcludedGenreIds,
    ),

    getKDramaKeywordDiscoverPages(
      "movie",
      feelGoodKeywordIds,
      6.1,
      10,
      movieExcludedGenreIds,
    ),

    getKDramaKeywordDiscoverPages(
      "tv",
      feelGoodKeywordIds,
      6.4,
      10,
      tvExcludedGenreIds,
    ),
  ]);

  function mapMovieCandidates(results: TmdbListResult[]) {
    return results.map((result) =>
      mapKDramaCollectionCandidate(result, "movie", movieGenreMap),
    );
  }

  function mapTvCandidates(results: TmdbListResult[]) {
    return results.map((result) =>
      mapKDramaCollectionCandidate(result, "tv", tvGenreMap),
    );
  }

  return {
    trendingMovies: mapMovieCandidates(trendingMovieData.results),

    trendingTv: mapTvCandidates(trendingTvData.results),

    recentMovies: mapMovieCandidates(recentMovieData),

    currentlyAiringTv: mapTvCandidates(currentlyAiringTvData),

    popularMovies: mapMovieCandidates(popularMovieData),

    popularTv: mapTvCandidates(popularTvData),

    mostVotedMovies: mapMovieCandidates(mostVotedMovieData),

    mostVotedTv: mapTvCandidates(mostVotedTvData),

    highlyRatedMovies: mapMovieCandidates(highlyRatedMovieData),

    highlyRatedTv: mapTvCandidates(highlyRatedTvData),

    romanceKeywordMovies: mapMovieCandidates(romanceKeywordMovieData),

    romanceKeywordTv: mapTvCandidates(romanceKeywordTvData),

    suspenseKeywordMovies: mapMovieCandidates(suspenseKeywordMovieData),

    suspenseKeywordTv: mapTvCandidates(suspenseKeywordTvData),

    feelGoodKeywordMovies: mapMovieCandidates(feelGoodKeywordMovieData),

    feelGoodKeywordTv: mapTvCandidates(feelGoodKeywordTvData),
  };
}

export async function getTmdbMediaDetails(
  mediaType: MediaType,
  tmdbId: number,
): Promise<MediaDetails> {
  if (mediaType === "movie") {
    const movie =
  await tmdbFetch<TmdbMovieDetails>(
    `/movie/${tmdbId}?language=en-US&append_to_response=videos,external_ids`,
  )

    return mapMovieDetails(movie);
  }

  const show =
  await tmdbFetch<TmdbTvDetails>(
    `/tv/${tmdbId}?language=en-US&append_to_response=videos,external_ids`,
  )
  
  return mapTvDetails(show);
}

export async function getTmdbBrowseList(
  mediaType: MediaType,
  category: BrowseCategory,
  page = 1,
): Promise<TmdbBrowseResult> {
  const path = buildBrowsePath(mediaType, category, page);

  const [data, genreMap] = await Promise.all([
    tmdbFetch<TmdbListResponse>(path),
    getGenreMap(mediaType),
  ]);

  return {
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
    results: data.results.map((item) =>
      mapListResult(item, mediaType, genreMap),
    ),
  };
}

export async function getTmdbCatalog(
  mediaType: MediaType,
  filters: TmdbCatalogFilters,
): Promise<TmdbBrowseResult> {
  const page = filters.page ?? 1;
  const search = filters.search?.trim();
  const genre = filters.genre?.trim();
  const language = filters.language?.trim().toLowerCase();

  const genreMap = await getGenreMap(mediaType);

  /*
   * TMDB title searching uses /search/movie or /search/tv.
   */
  if (search) {
    if (genre && findGenreIdByName(genreMap, genre) === null) {
      throw new UnknownGenreError(genre);
    }

    const searchParams = new URLSearchParams({
      query: search,
      include_adult: "false",
      language: "en-US",
      page: String(page),
    });

    const data = await tmdbFetch<TmdbListResponse>(
      `/search/${mediaType}?${searchParams.toString()}`,
    );

    let results = data.results.map((item) =>
      mapListResult(item, mediaType, genreMap),
    );

    /*
     * Search endpoints do not directly support all Discover filters,
     * so additional filters are applied to the returned search page.
     */
    if (genre) {
      results = results.filter((item) =>
        item.genres.some(
          (itemGenre) => itemGenre.toLowerCase() === genre.toLowerCase(),
        ),
      );
    }

    if (language) {
      results = results.filter(
        (item) => item.language.toLowerCase() === language,
      );
    }

    if (filters.minRating !== undefined) {
      results = results.filter((item) => item.rating >= filters.minRating!);
    }

    return {
      page: data.page,
      totalPages: data.total_pages,
      totalResults: data.total_results,
      results,
    };
  }

  /*
   * Without a title search, use TMDB Discover so filters
   * are handled by TMDB across its catalogue.
   */
  const discoverParams = new URLSearchParams({
    include_adult: "false",
    language: "en-US",
    page: String(page),
    sort_by: "popularity.desc",
  });

  if (mediaType === "movie") {
    discoverParams.set("include_video", "false");
  }

  if (genre) {
    const genreId = findGenreIdByName(genreMap, genre);

    if (genreId === null) {
      throw new UnknownGenreError(genre);
    }

    discoverParams.set("with_genres", String(genreId));
  }

  if (language) {
    discoverParams.set("with_original_language", language);
  }

  if (filters.minRating !== undefined) {
    discoverParams.set("vote_average.gte", String(filters.minRating));
  }

  const data = await tmdbFetch<TmdbListResponse>(
    `/discover/${mediaType}?${discoverParams.toString()}`,
  );

  return {
    page: data.page,
    totalPages: data.total_pages,
    totalResults: data.total_results,
    results: data.results.map((item) =>
      mapListResult(item, mediaType, genreMap),
    ),
  };
}
