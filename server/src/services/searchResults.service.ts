import type { MediaItem, MediaType, SearchScope } from "../types/media.js";
import {
  getTmdbBrowseList,
  getTmdbCatalog,
  searchTmdbMedia,
  type TmdbBrowseResult,
  type TmdbCatalogFilters,
} from "./tmdb.service.js";

export type GenreMatchMode = "all" | "any";
export type SearchPreset = "default" | "trending" | "essentials";
export type SearchFormat = "all" | "movie" | "tv";
export type SearchSort =
  | "best-match"
  | "popularity-desc"
  | "rating-desc"
  | "release-desc"
  | "release-asc";

export interface SearchResultsFilters {
  genres: string[];
  genreMode: GenreMatchMode;
  language?: string;
  minRating?: number;
  format: SearchFormat;
  releaseYearFrom?: number;
  releaseYearTo?: number;
  sortBy: SearchSort;
  establishedOnly: boolean;
}

export interface SearchResultsPage {
  page: number;
  totalPages: number;
  totalResults: number;
  results: MediaItem[];
  hasMore: boolean;
}

interface SearchPoolState {
  expiresAt: number;
  items: MediaItem[];
  seenKeys: Set<string>;
  nextSourcePage: number;
  sourceTotalPages: number | null;
  exhausted: boolean;
  pending: Promise<void> | null;
}

interface SearchCriteria {
  query: string;
  scope: SearchScope;
  preset: SearchPreset;
  filters: SearchResultsFilters;
}

const RESULT_PAGE_SIZE = 24;
const SOURCE_BATCH_SIZE = 4;
const MAX_SOURCE_PAGES_PER_EXPANSION = 24;
const MAX_SOURCE_PAGES_PER_POOL = 80;
const MAX_SORTED_TITLE_SOURCE_PAGES = 20;
const SEARCH_POOL_TTL_MS = 10 * 60 * 1000;
const MAX_SEARCH_POOLS = 80;
const MAX_RELIABLE_FUTURE_YEAR = new Date().getUTCFullYear() + 1;

const searchPools = new Map<string, SearchPoolState>();

const MOVIE_GENRES = new Set([
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science Fiction",
  "TV Movie",
  "Thriller",
  "War",
  "Western",
]);

const TV_GENRES = new Set([
  "Action & Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Kids",
  "Mystery",
  "News",
  "Reality",
  "Sci-Fi & Fantasy",
  "Soap",
  "Talk",
  "War & Politics",
  "Western",
]);

const BLOCKED_ANIME_TERMS = [
  "hentai",
  "adult animation",
  "erotic animation",
  "pornographic animation",
];

const BLOCKED_K_DRAMA_TERMS = [
  "adult film",
  "erotic film",
  "pornographic",
  "softcore",
  "sexploitation",
];

const BLOCKED_K_DRAMA_GENRES = new Set([
  "Animation",
  "Documentary",
  "News",
  "Reality",
  "Talk",
  "TV Movie",
]);

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function hasPoster(item: MediaItem) {
  return !item.posterUrl.includes("placehold.co");
}

function isPublicAnime(item: MediaItem) {
  const searchableText = `${item.title} ${item.overview}`.toLowerCase();

  return (
    item.language === "JA" &&
    item.genres.includes("Animation") &&
    hasPoster(item) &&
    !BLOCKED_ANIME_TERMS.some((term) => searchableText.includes(term))
  );
}

function isPublicKDrama(item: MediaItem) {
  const searchableText = `${item.title} ${item.overview}`.toLowerCase();

  return (
    item.language === "KO" &&
    hasPoster(item) &&
    !item.genres.some((genre) => BLOCKED_K_DRAMA_GENRES.has(genre)) &&
    !BLOCKED_K_DRAMA_TERMS.some((term) => searchableText.includes(term))
  );
}

function matchesGenres(item: MediaItem, filters: SearchResultsFilters) {
  if (filters.genres.length === 0) {
    return true;
  }

  const itemGenres = new Set(item.genres.map(normalizeText));
  const selectedGenres = filters.genres.map(normalizeText);

  return filters.genreMode === "all"
    ? selectedGenres.every((genre) => itemGenres.has(genre))
    : selectedGenres.some((genre) => itemGenres.has(genre));
}

function getItemYear(item: MediaItem) {
  const dateYear = Number(item.releaseDate?.slice(0, 4));

  if (Number.isInteger(dateYear) && dateYear > 0) {
    return dateYear;
  }

  const displayedYear = Number(item.year);
  return Number.isInteger(displayedYear) ? displayedYear : null;
}

function getEffectiveReleaseYearTo(filters: SearchResultsFilters) {
  if (filters.sortBy !== "release-desc") {
    return filters.releaseYearTo;
  }

  return filters.releaseYearTo === undefined
    ? MAX_RELIABLE_FUTURE_YEAR
    : Math.min(filters.releaseYearTo, MAX_RELIABLE_FUTURE_YEAR);
}

function getEstablishedVoteThreshold(
  item: MediaItem,
  scope: SearchScope,
) {
  if (scope === "anime") {
    return item.mediaType === "movie" ? 50 : 40;
  }

  if (scope === "k-drama") {
    return item.mediaType === "movie" ? 50 : 30;
  }

  return item.mediaType === "movie" ? 200 : 100;
}

function applyApplicationFilters(
  items: MediaItem[],
  scope: SearchScope,
  filters: SearchResultsFilters,
) {
  const effectiveReleaseYearTo = getEffectiveReleaseYearTo(filters);

  return items.filter((item) => {
    if (scope === "movie") {
      if (
        item.mediaType !== "movie" ||
        isPublicAnime(item) ||
        isPublicKDrama(item)
      ) {
        return false;
      }
    }

    if (scope === "tv") {
      if (
        item.mediaType !== "tv" ||
        isPublicAnime(item) ||
        isPublicKDrama(item)
      ) {
        return false;
      }
    }

    if (scope === "anime" && !isPublicAnime(item)) {
      return false;
    }

    if (scope === "k-drama" && !isPublicKDrama(item)) {
      return false;
    }

    if (filters.format !== "all" && item.mediaType !== filters.format) {
      return false;
    }

    if (!matchesGenres(item, filters)) {
      return false;
    }

    if (
      filters.language &&
      item.language.toLowerCase() !== filters.language.toLowerCase()
    ) {
      return false;
    }

    if (
      filters.minRating !== undefined &&
      item.rating < filters.minRating
    ) {
      return false;
    }

    const itemYear = getItemYear(item);

    if (
      filters.releaseYearFrom !== undefined &&
      (itemYear === null || itemYear < filters.releaseYearFrom)
    ) {
      return false;
    }

    if (
      effectiveReleaseYearTo !== undefined &&
      (itemYear === null || itemYear > effectiveReleaseYearTo)
    ) {
      return false;
    }

    if (filters.sortBy === "release-desc" && !hasPoster(item)) {
      return false;
    }

    if (
      filters.establishedOnly &&
      (item.voteCount ?? 0) < getEstablishedVoteThreshold(item, scope)
    ) {
      return false;
    }

    return true;
  });
}

function compareItems(
  firstItem: MediaItem,
  secondItem: MediaItem,
  sortBy: SearchSort,
) {
  if (sortBy === "popularity-desc") {
    return (secondItem.popularity ?? 0) - (firstItem.popularity ?? 0);
  }

  if (sortBy === "rating-desc") {
    const ratingDifference = secondItem.rating - firstItem.rating;

    return ratingDifference !== 0
      ? ratingDifference
      : (secondItem.voteCount ?? 0) - (firstItem.voteCount ?? 0);
  }

  if (sortBy === "release-desc" || sortBy === "release-asc") {
    const firstTime = firstItem.releaseDate
      ? Date.parse(firstItem.releaseDate)
      : Number.NaN;
    const secondTime = secondItem.releaseDate
      ? Date.parse(secondItem.releaseDate)
      : Number.NaN;

    if (Number.isNaN(firstTime) && Number.isNaN(secondTime)) {
      return 0;
    }

    if (Number.isNaN(firstTime)) {
      return 1;
    }

    if (Number.isNaN(secondTime)) {
      return -1;
    }

    return sortBy === "release-desc"
      ? secondTime - firstTime
      : firstTime - secondTime;
  }

  return 0;
}

function sortItems(items: MediaItem[], sortBy: SearchSort) {
  return sortBy === "best-match"
    ? items
    : [...items].sort((firstItem, secondItem) =>
        compareItems(firstItem, secondItem, sortBy),
      );
}

function interleaveItems(firstItems: MediaItem[], secondItems: MediaItem[]) {
  const items: MediaItem[] = [];
  const maximumLength = Math.max(firstItems.length, secondItems.length);

  for (let index = 0; index < maximumLength; index += 1) {
    if (firstItems[index]) {
      items.push(firstItems[index]);
    }

    if (secondItems[index]) {
      items.push(secondItems[index]);
    }
  }

  return items;
}

function getCompatibleGenres(
  mediaType: MediaType,
  genres: string[],
  mode: GenreMatchMode,
): string[] | null {
  if (genres.length === 0) {
    return [];
  }

  const allowedGenres = mediaType === "movie" ? MOVIE_GENRES : TV_GENRES;
  const compatibleGenres = genres.filter((genre) => allowedGenres.has(genre));

  if (mode === "all" && compatibleGenres.length !== genres.length) {
    return null;
  }

  if (mode === "any" && compatibleGenres.length === 0) {
    return null;
  }

  return compatibleGenres;
}

function createEmptySourcePage(page: number): TmdbBrowseResult {
  return {
    page,
    totalPages: 0,
    totalResults: 0,
    results: [],
    hasMore: false,
  };
}

function getDiscoverSort(
  mediaType: MediaType,
  sortBy: SearchSort,
): TmdbCatalogFilters["sortBy"] {
  if (sortBy === "rating-desc") {
    return "vote_average.desc";
  }

  if (sortBy === "release-desc") {
    return mediaType === "movie"
      ? "primary_release_date.desc"
      : "first_air_date.desc";
  }

  if (sortBy === "release-asc") {
    return mediaType === "movie"
      ? "primary_release_date.asc"
      : "first_air_date.asc";
  }

  return "popularity.desc";
}

function getDiscoveryVoteThreshold(
  mediaType: MediaType,
  scope: SearchScope,
  filters: SearchResultsFilters,
) {
  if (filters.establishedOnly) {
    if (scope === "anime") {
      return mediaType === "movie" ? 50 : 40;
    }

    if (scope === "k-drama") {
      return mediaType === "movie" ? 50 : 30;
    }

    return mediaType === "movie" ? 200 : 100;
  }

  if (filters.sortBy === "rating-desc") {
    return mediaType === "movie" ? 25 : 15;
  }

  return undefined;
}

async function loadDiscoveryPageForMediaType(
  mediaType: MediaType,
  sourcePage: number,
  scope: SearchScope,
  preset: SearchPreset,
  filters: SearchResultsFilters,
) {
  const fixedLanguage =
    scope === "anime"
      ? "ja"
      : scope === "k-drama"
        ? "ko"
        : filters.language;

  const requestedGenres =
    scope === "anime"
      ? ["Animation"]
      : getCompatibleGenres(mediaType, filters.genres, filters.genreMode);

  if (requestedGenres === null) {
    return createEmptySourcePage(sourcePage);
  }

  const essentialsMinimumRating =
    scope === "anime"
      ? 7
      : scope === "k-drama"
        ? 6.8
        : mediaType === "movie"
          ? 6.5
          : 6.8;

  const essentialsMinimumVotes =
    scope === "anime"
      ? mediaType === "movie"
        ? 80
        : 100
      : scope === "k-drama"
        ? mediaType === "movie"
          ? 120
          : 80
        : mediaType === "movie"
          ? 500
          : 250;

  return getTmdbCatalog(mediaType, {
    genres: requestedGenres,
    genreMode: scope === "anime" ? "all" : filters.genreMode,
    language: fixedLanguage,
    minRating:
      filters.minRating ??
      (preset === "essentials" ? essentialsMinimumRating : undefined),
    minVoteCount:
      preset === "essentials"
        ? essentialsMinimumVotes
        : getDiscoveryVoteThreshold(mediaType, scope, filters),
    sortBy:
      preset === "essentials"
        ? "vote_count.desc"
        : getDiscoverSort(mediaType, filters.sortBy),
    releaseYearFrom: filters.releaseYearFrom,
    releaseYearTo: getEffectiveReleaseYearTo(filters),
    page: sourcePage,
  });
}

async function loadTrendingPageForMediaType(
  mediaType: MediaType,
  sourcePage: number,
) {
  return getTmdbBrowseList(mediaType, "trending", sourcePage);
}

function getRequestedMediaTypes(criteria: SearchCriteria): MediaType[] {
  const { scope, filters } = criteria;

  if (scope === "movie" || scope === "tv") {
    return [scope];
  }

  if (filters.format === "movie" || filters.format === "tv") {
    return [filters.format];
  }

  return ["movie", "tv"];
}

async function loadLogicalSourcePage(
  criteria: SearchCriteria,
  sourcePage: number,
): Promise<TmdbBrowseResult> {
  const { query, scope, preset, filters } = criteria;

  if (query) {
    const searchScope =
      scope === "all" && filters.format !== "all" ? filters.format : scope;

    const response = await searchTmdbMedia(query, searchScope, sourcePage);

    return {
      ...response,
      results: sortItems(
        applyApplicationFilters(response.results, scope, filters),
        filters.sortBy,
      ),
    };
  }

  async function loadPage(mediaType: MediaType) {
    return preset === "trending"
      ? loadTrendingPageForMediaType(mediaType, sourcePage)
      : loadDiscoveryPageForMediaType(
          mediaType,
          sourcePage,
          scope,
          preset,
          filters,
        );
  }

  const mediaTypes = getRequestedMediaTypes(criteria);

  if (mediaTypes.length === 1) {
    const response = await loadPage(mediaTypes[0]);

    return {
      ...response,
      results: applyApplicationFilters(response.results, scope, filters),
    };
  }

  const [moviePage, tvPage] = await Promise.all([
    loadPage("movie"),
    loadPage("tv"),
  ]);

  const mixedResults = sortItems(
    interleaveItems(moviePage.results, tvPage.results),
    filters.sortBy,
  );

  return {
    page: sourcePage,
    totalPages: Math.max(moviePage.totalPages, tvPage.totalPages),
    totalResults: moviePage.totalResults + tvPage.totalResults,
    results: applyApplicationFilters(mixedResults, scope, filters),
    hasMore: Boolean(moviePage.hasMore || tvPage.hasMore),
  };
}

function createPoolKey(criteria: SearchCriteria) {
  return JSON.stringify({
    query: criteria.query.trim().toLowerCase(),
    scope: criteria.scope,
    preset: criteria.preset,
    genres: criteria.filters.genres.map(normalizeText).sort(),
    genreMode: criteria.filters.genreMode,
    language: criteria.filters.language?.toLowerCase() ?? "",
    minRating: criteria.filters.minRating ?? null,
    format: criteria.filters.format,
    releaseYearFrom: criteria.filters.releaseYearFrom ?? null,
    releaseYearTo: criteria.filters.releaseYearTo ?? null,
    sortBy: criteria.filters.sortBy,
    establishedOnly: criteria.filters.establishedOnly,
  });
}

function createSearchPool(): SearchPoolState {
  return {
    expiresAt: Date.now() + SEARCH_POOL_TTL_MS,
    items: [],
    seenKeys: new Set<string>(),
    nextSourcePage: 1,
    sourceTotalPages: null,
    exhausted: false,
    pending: null,
  };
}

function pruneSearchPools() {
  const now = Date.now();

  for (const [key, pool] of searchPools.entries()) {
    if (pool.expiresAt <= now && !pool.pending) {
      searchPools.delete(key);
    }
  }

  while (searchPools.size > MAX_SEARCH_POOLS) {
    const oldestKey = searchPools.keys().next().value as string | undefined;

    if (!oldestKey) {
      break;
    }

    searchPools.delete(oldestKey);
  }
}

function appendUniqueItems(pool: SearchPoolState, items: MediaItem[]) {
  items.forEach((item) => {
    const key = `${item.mediaType}:${item.tmdbId}`;

    if (pool.seenKeys.has(key)) {
      return;
    }

    pool.seenKeys.add(key);
    pool.items.push(item);
  });
}

async function expandSearchPool(
  pool: SearchPoolState,
  criteria: SearchCriteria,
  targetItemCount: number,
) {
  let scannedPages = 0;

  while (
    pool.items.length < targetItemCount &&
    !pool.exhausted &&
    scannedPages < MAX_SOURCE_PAGES_PER_EXPANSION
  ) {
    const knownLastPage = Math.min(
      pool.sourceTotalPages ?? MAX_SOURCE_PAGES_PER_POOL,
      MAX_SOURCE_PAGES_PER_POOL,
    );

    if (pool.nextSourcePage > knownLastPage) {
      pool.exhausted = true;
      break;
    }

    const remainingExpansionPages =
      MAX_SOURCE_PAGES_PER_EXPANSION - scannedPages;

    const batchSize = Math.min(
      SOURCE_BATCH_SIZE,
      remainingExpansionPages,
      knownLastPage - pool.nextSourcePage + 1,
    );

    const pages = Array.from(
      { length: batchSize },
      (_, index) => pool.nextSourcePage + index,
    );

    const responses = await Promise.all(
      pages.map((page) => loadLogicalSourcePage(criteria, page)),
    );

    responses.forEach((response) => {
      pool.sourceTotalPages = Math.min(
        response.totalPages,
        MAX_SOURCE_PAGES_PER_POOL,
      );
      appendUniqueItems(pool, response.results);
    });

    scannedPages += pages.length;
    pool.nextSourcePage = pages[pages.length - 1] + 1;

    const lastAvailablePage = Math.min(
      pool.sourceTotalPages ?? MAX_SOURCE_PAGES_PER_POOL,
      MAX_SOURCE_PAGES_PER_POOL,
    );

    if (pool.nextSourcePage > lastAvailablePage) {
      pool.exhausted = true;
    }
  }

  pool.expiresAt = Date.now() + SEARCH_POOL_TTL_MS;
}

async function buildStableSortedTitlePool(
  pool: SearchPoolState,
  criteria: SearchCriteria,
) {
  while (!pool.exhausted) {
    const knownLastPage = Math.min(
      pool.sourceTotalPages ?? MAX_SORTED_TITLE_SOURCE_PAGES,
      MAX_SORTED_TITLE_SOURCE_PAGES,
    );

    if (pool.nextSourcePage > knownLastPage) {
      pool.exhausted = true;
      break;
    }

    const batchSize = Math.min(
      SOURCE_BATCH_SIZE,
      knownLastPage - pool.nextSourcePage + 1,
    );
    const pages = Array.from(
      { length: batchSize },
      (_, index) => pool.nextSourcePage + index,
    );
    const responses = await Promise.all(
      pages.map((page) => loadLogicalSourcePage(criteria, page)),
    );

    responses.forEach((response) => {
      pool.sourceTotalPages = Math.min(
        response.totalPages,
        MAX_SORTED_TITLE_SOURCE_PAGES,
      );
      appendUniqueItems(pool, response.results);
    });

    pool.nextSourcePage = pages[pages.length - 1] + 1;

    if (
      pool.nextSourcePage >
      Math.min(
        pool.sourceTotalPages ?? MAX_SORTED_TITLE_SOURCE_PAGES,
        MAX_SORTED_TITLE_SOURCE_PAGES,
      )
    ) {
      pool.exhausted = true;
    }
  }

  pool.items = sortItems(pool.items, criteria.filters.sortBy);
  pool.expiresAt = Date.now() + SEARCH_POOL_TTL_MS;
}

async function ensureSearchPool(
  pool: SearchPoolState,
  criteria: SearchCriteria,
  targetItemCount: number,
) {
  const needsStableTitleSort =
    Boolean(criteria.query) && criteria.filters.sortBy !== "best-match";

  while (pool.items.length < targetItemCount && !pool.exhausted) {
    if (pool.pending) {
      await pool.pending;
      continue;
    }

    const request = needsStableTitleSort
      ? buildStableSortedTitlePool(pool, criteria)
      : expandSearchPool(pool, criteria, targetItemCount);
    pool.pending = request;

    try {
      await request;
    } finally {
      pool.pending = null;
    }

    if (pool.items.length < targetItemCount && !pool.exhausted) {
      break;
    }
  }
}

export async function getSearchResults(
  query: string,
  scope: SearchScope,
  preset: SearchPreset,
  page: number,
  filters: SearchResultsFilters,
): Promise<SearchResultsPage> {
  pruneSearchPools();

  const criteria: SearchCriteria = {
    query: query.trim(),
    scope,
    preset,
    filters,
  };

  const poolKey = createPoolKey(criteria);
  const existingPool = searchPools.get(poolKey);
  const pool =
    existingPool && existingPool.expiresAt > Date.now()
      ? existingPool
      : createSearchPool();

  if (pool !== existingPool) {
    searchPools.set(poolKey, pool);
  }

  const startIndex = (page - 1) * RESULT_PAGE_SIZE;
  const endIndex = startIndex + RESULT_PAGE_SIZE;

  await ensureSearchPool(pool, criteria, endIndex);

  const results = pool.items.slice(startIndex, endIndex);
  const hasMore = endIndex < pool.items.length || !pool.exhausted;

  const totalPages = pool.exhausted
    ? Math.max(1, Math.ceil(pool.items.length / RESULT_PAGE_SIZE))
    : Math.max(page + 1, Math.ceil(pool.items.length / RESULT_PAGE_SIZE) + 1);

  return {
    page,
    totalPages,
    totalResults: pool.items.length,
    results,
    hasMore,
  };
}
