import type { MediaItem } from "../types/media.js";
import { getTmdbHomeSourceLists } from "./tmdb.service.js";

export interface HomeCollections {
  trendingMovies: MediaItem[];
  trendingTv: MediaItem[];
  trendingAnime: MediaItem[];
  trendingKDrama: MediaItem[];
}

const HOME_ROW_LIMIT = 20;
const HOME_CACHE_DURATION_MS = 10 * 60 * 1000;

const ANIMATION_GENRE = "Animation";

const blockedDiscoveryTerms = [
  "adult animation",
  "erotic animation",
  "ecchi",
  "hentai",
  "pornographic",
];

function getMediaKey(item: MediaItem) {
  return `${item.mediaType}:${item.tmdbId}`;
}

function isAnime(item: MediaItem) {
  return item.language === "JA" && item.genres.includes(ANIMATION_GENRE);
}

function isSuitableForPublicDiscovery(item: MediaItem) {
  const searchableText = `${item.title} ${item.overview}`.toLowerCase();

  return !blockedDiscoveryTerms.some((term) => searchableText.includes(term));
}

function interleaveMedia(firstItems: MediaItem[], secondItems: MediaItem[]) {
  const combinedItems: MediaItem[] = [];

  const longestLength = Math.max(firstItems.length, secondItems.length);

  for (let index = 0; index < longestLength; index += 1) {
    const firstItem = firstItems[index];
    const secondItem = secondItems[index];

    if (firstItem) {
      combinedItems.push(firstItem);
    }

    if (secondItem) {
      combinedItems.push(secondItem);
    }
  }

  return combinedItems;
}

function takeUniqueMedia(items: MediaItem[], usedMediaKeys: Set<string>) {
  const uniqueItems: MediaItem[] = [];

  for (const item of items) {
    const mediaKey = getMediaKey(item);

    if (usedMediaKeys.has(mediaKey) || !isSuitableForPublicDiscovery(item)) {
      continue;
    }

    usedMediaKeys.add(mediaKey);
    uniqueItems.push(item);

    if (uniqueItems.length === HOME_ROW_LIMIT) {
      break;
    }
  }

  return uniqueItems;
}

let cachedCollections: {
  expiresAt: number;
  data: HomeCollections;
} | null = null;

let pendingCollectionsRequest: Promise<HomeCollections> | null = null;

async function buildHomeCollections(): Promise<HomeCollections> {
  const sourceLists = await getTmdbHomeSourceLists();

  const usedMediaKeys = new Set<string>();

  const animeTrendingItems = interleaveMedia(
    sourceLists.trendingTv.filter(isAnime),
    sourceLists.trendingMovies.filter(isAnime),
  );

  const animeFallbackItems = interleaveMedia(
    sourceLists.animeTv,
    sourceLists.animeMovies,
  );

  const trendingMovies = takeUniqueMedia(
    sourceLists.trendingMovies.filter((item) => !isAnime(item)),
    usedMediaKeys,
  );

  const trendingTv = takeUniqueMedia(
    sourceLists.trendingTv.filter(
      (item) => !isAnime(item) && item.language !== "KO",
    ),
    usedMediaKeys,
  );

  const trendingAnime = takeUniqueMedia(
    [...animeTrendingItems, ...animeFallbackItems],
    usedMediaKeys,
  );

  const trendingKDrama = takeUniqueMedia(
    [...sourceLists.trendingKDrama, ...sourceLists.kDramaTv],
    usedMediaKeys,
  );

  return {
    trendingMovies,
    trendingTv,
    trendingAnime,
    trendingKDrama,
  };
}

export async function getHomeCollections(): Promise<HomeCollections> {
  const now = Date.now();

  if (cachedCollections && cachedCollections.expiresAt > now) {
    return cachedCollections.data;
  }

  if (pendingCollectionsRequest) {
    return pendingCollectionsRequest;
  }

  pendingCollectionsRequest = buildHomeCollections();

  try {
    const data = await pendingCollectionsRequest;

    cachedCollections = {
      data,
      expiresAt: Date.now() + HOME_CACHE_DURATION_MS,
    };

    return data;
  } finally {
    pendingCollectionsRequest = null;
  }
}
