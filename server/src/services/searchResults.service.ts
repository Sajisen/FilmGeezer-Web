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

interface CachedSearchPage {
  expiresAt: number;
  data: SearchResultsPage;
}

const DEFAULT_SOURCE_PAGES_PER_PAGE = 2;
const FILTERED_TITLE_SOURCE_PAGES_PER_PAGE = 4;
const FILTERED_DISCOVERY_SOURCE_PAGES_PER_PAGE = 3;
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 120;

const searchCache = new Map<string, CachedSearchPage>();
const pendingSearchRequests = new Map<string, Promise<SearchResultsPage>>();

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

function removeDuplicateItems(items: MediaItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.mediaType}:${item.tmdbId}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
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

async function loadSourcePages(
  loadPage: (page: number) => Promise<TmdbBrowseResult>,
  applicationPage: number,
  sourcePagesPerPage = DEFAULT_SOURCE_PAGES_PER_PAGE,
) {
  const firstSourcePage =
    (applicationPage - 1) * sourcePagesPerPage + 1;

  const firstResponse = await loadPage(firstSourcePage);
  const additionalPages = Array.from(
    { length: sourcePagesPerPage - 1 },
    (_, index) => firstSourcePage + index + 1,
  ).filter((page) => page <= firstResponse.totalPages);

  const additionalResponses = await Promise.all(
    additionalPages.map(loadPage),
  );
  const responses = [firstResponse, ...additionalResponses];
  const totalSourcePages = firstResponse.totalPages;
  const lastLoadedPage = additionalPages.at(-1) ?? firstSourcePage;

  return {
    items: responses.flatMap((response) => response.results),
    totalSourcePages,
    totalResults: firstResponse.totalResults,
    hasMore: lastLoadedPage < totalSourcePages,
  };
}

async function searchWithTitle(
  query: string,
  scope: SearchScope,
  page: number,
  filters: SearchResultsFilters,
): Promise<SearchResultsPage> {
  const hasNarrowingFilters =
    filters.genres.length > 0 ||
    Boolean(filters.language) ||
    filters.minRating !== undefined;

  const sourcePagesPerPage = hasNarrowingFilters
    ? FILTERED_TITLE_SOURCE_PAGES_PER_PAGE
    : DEFAULT_SOURCE_PAGES_PER_PAGE;

  const source = await loadSourcePages(
    (sourcePage) =>
      searchTmdbMedia(query, scope, sourcePage, {
        language: filters.language,
        minRating: filters.minRating,
      }),
    page,
    sourcePagesPerPage,
  );

  const results = removeDuplicateItems(
    applyApplicationFilters(source.items, scope, filters),
  );

  return {
    page,
    totalPages: Math.ceil(
      source.totalSourcePages / sourcePagesPerPage,
    ),
    totalResults: source.totalResults,
    results,
    hasMore: source.hasMore,
  };
}

async function discoverOneMediaType(
  mediaType: MediaType,
  page: number,
  filters: SearchResultsFilters,
  sourcePagesPerPage: number,
) {
  return loadSourcePages(
    (sourcePage) =>
      getTmdbCatalog(mediaType, {
        language: filters.language,
        minRating: filters.minRating,
        page: sourcePage,
      }),
    page,
    sourcePagesPerPage,
  );
}

async function discoverWithoutTitle(
  scope: SearchScope,
  page: number,
  filters: SearchResultsFilters,
): Promise<SearchResultsPage> {
  const sourcePagesPerPage =
    filters.genres.length > 0
      ? FILTERED_DISCOVERY_SOURCE_PAGES_PER_PAGE
      : DEFAULT_SOURCE_PAGES_PER_PAGE;

  if (scope === "movie" || scope === "tv") {
    const source = await discoverOneMediaType(
      scope,
      page,
      filters,
      sourcePagesPerPage,
    );
    const results = removeDuplicateItems(
      applyApplicationFilters(source.items, scope, filters),
    );

    return {
      page,
      totalPages: Math.ceil(
        source.totalSourcePages / sourcePagesPerPage,
      ),
      totalResults: source.totalResults,
      results,
      hasMore: source.hasMore,
    };
  }

  const fixedLanguage =
    scope === "anime" ? "ja" : scope === "k-drama" ? "ko" : filters.language;

  const scopedFilters: SearchResultsFilters = {
    ...filters,
    language: fixedLanguage,
  };

  const [movieSource, tvSource] = await Promise.all([
    discoverOneMediaType(
      "movie",
      page,
      scopedFilters,
      sourcePagesPerPage,
    ),
    discoverOneMediaType(
      "tv",
      page,
      scopedFilters,
      sourcePagesPerPage,
    ),
  ]);

  const mergedItems = interleaveItems(movieSource.items, tvSource.items);
  const results = removeDuplicateItems(
    applyApplicationFilters(mergedItems, scope, scopedFilters),
  );

  const totalSourcePages = Math.max(
    movieSource.totalSourcePages,
    tvSource.totalSourcePages,
  );

  return {
    page,
    totalPages: Math.ceil(
      totalSourcePages / sourcePagesPerPage,
    ),
    totalResults: movieSource.totalResults + tvSource.totalResults,
    results,
    hasMore: movieSource.hasMore || tvSource.hasMore,
  };
}

function createCacheKey(
  query: string,
  scope: SearchScope,
  page: number,
  filters: SearchResultsFilters,
) {
  return JSON.stringify({
    query: query.trim().toLowerCase(),
    scope,
    page,
    genres: filters.genres.map(normalizeText).sort(),
    genreMode: filters.genreMode,
    language: filters.language?.toLowerCase() ?? "",
    minRating: filters.minRating ?? null,
  });
}

function pruneCache() {
  const now = Date.now();

  for (const [key, value] of searchCache.entries()) {
    if (value.expiresAt <= now) {
      searchCache.delete(key);
    }
  }

  while (searchCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = searchCache.keys().next().value as string | undefined;

    if (!oldestKey) {
      break;
    }

    searchCache.delete(oldestKey);
  }
}

export async function getSearchResults(
  query: string,
  scope: SearchScope,
  page: number,
  filters: SearchResultsFilters,
) {
  const cacheKey = createCacheKey(query, scope, page, filters);
  const cached = searchCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const pendingRequest = pendingSearchRequests.get(cacheKey);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = (query.trim()
    ? searchWithTitle(query.trim(), scope, page, filters)
    : discoverWithoutTitle(scope, page, filters)
  ).then((data) => {
    pruneCache();
    searchCache.set(cacheKey, {
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
      data,
    });

    return data;
  });

  pendingSearchRequests.set(cacheKey, request);

  try {
    return await request;
  } finally {
    pendingSearchRequests.delete(cacheKey);
  }
}
