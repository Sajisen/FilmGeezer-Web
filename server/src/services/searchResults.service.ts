import type { MediaItem, MediaType, SearchScope } from "../types/media.js";
import {
  getTmdbCatalog,
  searchTmdbMedia,
  type TmdbBrowseResult,
} from "./tmdb.service.js";

export type GenreMatchMode = "all" | "any";

export interface SearchResultsFilters {
  genres: string[];
  genreMode: GenreMatchMode;
  language?: string;
  minRating?: number;
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
  filters: SearchResultsFilters;
}

const RESULT_PAGE_SIZE = 24;
const SOURCE_BATCH_SIZE = 4;
const MAX_SOURCE_PAGES_PER_EXPANSION = 24;
const MAX_SOURCE_PAGES_PER_POOL = 80;
const SEARCH_POOL_TTL_MS = 10 * 60 * 1000;
const MAX_SEARCH_POOLS = 80;

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

function applyApplicationFilters(
  items: MediaItem[],
  scope: SearchScope,
  filters: SearchResultsFilters,
) {
  return items.filter((item) => {
    if (scope === "movie" && item.mediaType !== "movie") {
      return false;
    }

    if (scope === "tv" && item.mediaType !== "tv") {
      return false;
    }

    if (scope === "anime" && !isPublicAnime(item)) {
      return false;
    }

    if (scope === "k-drama" && !isPublicKDrama(item)) {
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

    return true;
  });
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

async function loadDiscoveryPageForMediaType(
  mediaType: MediaType,
  sourcePage: number,
  scope: SearchScope,
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

  return getTmdbCatalog(mediaType, {
    genres: requestedGenres,
    genreMode: scope === "anime" ? "all" : filters.genreMode,
    language: fixedLanguage,
    minRating: filters.minRating,
    page: sourcePage,
  });
}

async function loadLogicalSourcePage(
  criteria: SearchCriteria,
  sourcePage: number,
): Promise<TmdbBrowseResult> {
  const { query, scope, filters } = criteria;

  if (query) {
    return searchTmdbMedia(query, scope, sourcePage);
  }

  if (scope === "movie" || scope === "tv") {
    return loadDiscoveryPageForMediaType(
      scope,
      sourcePage,
      scope,
      filters,
    );
  }

  const [moviePage, tvPage] = await Promise.all([
    loadDiscoveryPageForMediaType("movie", sourcePage, scope, filters),
    loadDiscoveryPageForMediaType("tv", sourcePage, scope, filters),
  ]);

  return {
    page: sourcePage,
    totalPages: Math.max(moviePage.totalPages, tvPage.totalPages),
    totalResults: moviePage.totalResults + tvPage.totalResults,
    results: interleaveItems(moviePage.results, tvPage.results),
    hasMore: Boolean(moviePage.hasMore || tvPage.hasMore),
  };
}

function createPoolKey(criteria: SearchCriteria) {
  return JSON.stringify({
    query: criteria.query.trim().toLowerCase(),
    scope: criteria.scope,
    genres: criteria.filters.genres.map(normalizeText).sort(),
    genreMode: criteria.filters.genreMode,
    language: criteria.filters.language?.toLowerCase() ?? "",
    minRating: criteria.filters.minRating ?? null,
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
      const filteredItems = applyApplicationFilters(
        response.results,
        criteria.scope,
        criteria.filters,
      );

      appendUniqueItems(pool, filteredItems);
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

async function ensureSearchPool(
  pool: SearchPoolState,
  criteria: SearchCriteria,
  targetItemCount: number,
) {
  while (pool.items.length < targetItemCount && !pool.exhausted) {
    if (pool.pending) {
      await pool.pending;
      continue;
    }

    const request = expandSearchPool(pool, criteria, targetItemCount);
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
  page: number,
  filters: SearchResultsFilters,
): Promise<SearchResultsPage> {
  pruneSearchPools();

  const criteria: SearchCriteria = {
    query: query.trim(),
    scope,
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
