import { isLowConfidenceAnimationOnly } from "../utils/categoryMedia.js";
import { createStaleWhileRevalidateCache } from "../utils/staleWhileRevalidateCache.js";
import type { MediaItem } from "../types/media.js";
import { getTmdbHomeSourceLists } from "./tmdb.service.js";

export interface HomeCollections {
  trendingMovies: MediaItem[];
  trendingTv: MediaItem[];
  trendingAnime: MediaItem[];
  trendingKDrama: MediaItem[];
}

const HOME_ROW_LIMIT = 20;

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
  return (
    item.language === "JA" &&
    item.genres.includes(ANIMATION_GENRE) &&
    !isLowConfidenceAnimationOnly(item)
  );
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

const collectionsCache = createStaleWhileRevalidateCache<HomeCollections>({
  freshDurationMs: 2 * 60 * 60 * 1000,
  staleDurationMs: 12 * 60 * 60 * 1000,
  label: "home collections",
});

export function getHomeCollections(): Promise<HomeCollections> {
  return collectionsCache.get(buildHomeCollections);
}
