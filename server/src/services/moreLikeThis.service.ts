import type { MediaDetails, MediaItem, MediaType } from "../types/media.js";
import {
  isSuitableForPublicAnime,
  isSuitableForPublicKDrama,
} from "../utils/categoryMedia.js";
import {
  getTmdbMediaDetails,
  getTmdbRelatedMediaCandidates,
  type TmdbRelatedMediaCandidate,
} from "./tmdb.service.js";

type RelatedCategory = "anime" | "k-drama" | "general";

const MORE_LIKE_THIS_LIMIT = 20;
const CACHE_DURATION_MS = 30 * 60 * 1000;

const BLOCKED_GENERAL_TERMS = [
  "adult film",
  "adult animation",
  "erotic film",
  "erotic animation",
  "pornographic",
  "softcore",
  "hentai",
  "sexploitation",
];

interface CachedMoreLikeThis {
  expiresAt: number;
  items: MediaItem[];
}

const cache = new Map<string, CachedMoreLikeThis>();
const pendingRequests = new Map<string, Promise<MediaItem[]>>();

function getCacheKey(mediaType: MediaType, tmdbId: number) {
  return `${mediaType}:${tmdbId}`;
}

function getRelatedCategory(media: MediaDetails): RelatedCategory {
  const genres = media.genres.map((genre) => genre.toLowerCase());

  if (media.language === "JA" && genres.includes("animation")) {
    return "anime";
  }

  if (media.language === "KO" && !genres.includes("animation")) {
    return "k-drama";
  }

  return "general";
}

function hasBlockedGeneralText(candidate: TmdbRelatedMediaCandidate) {
  const searchableText =
    `${candidate.item.title} ${candidate.item.overview}`.toLowerCase();

  return BLOCKED_GENERAL_TERMS.some((term) => searchableText.includes(term));
}

function isSuitableCandidate(
  candidate: TmdbRelatedMediaCandidate,
  currentMedia: MediaDetails,
  category: RelatedCategory,
) {
  if (
    candidate.item.tmdbId === currentMedia.tmdbId ||
    candidate.item.mediaType !== currentMedia.mediaType ||
    candidate.isAdult ||
    candidate.isVideo ||
    !candidate.hasPoster ||
    hasBlockedGeneralText(candidate)
  ) {
    return false;
  }

  if (category === "anime") {
    return isSuitableForPublicAnime(candidate);
  }

  if (category === "k-drama") {
    return isSuitableForPublicKDrama(candidate);
  }

  return (
    !isSuitableForPublicAnime(candidate) &&
    !isSuitableForPublicKDrama(candidate)
  );
}

function getPreferredVoteThreshold(
  category: RelatedCategory,
  mediaType: MediaType,
) {
  if (category === "anime" || category === "k-drama") {
    return mediaType === "movie" ? 30 : 20;
  }

  return mediaType === "movie" ? 80 : 50;
}

function calculateQualityScore(
  candidate: TmdbRelatedMediaCandidate,
  currentMedia: MediaDetails,
) {
  const confidenceVotes =
    currentMedia.mediaType === "movie" ? 500 : 300;
  const globalAverageRating = 6.3;

  const voteConfidence =
    candidate.voteCount / (candidate.voteCount + confidenceVotes);

  const weightedRating =
    voteConfidence * candidate.voteAverage +
    (1 - voteConfidence) * globalAverageRating;

  const sharedGenreCount = candidate.item.genres.filter((genre) =>
    currentMedia.genres.includes(genre),
  ).length;

  const sourceBoost = candidate.source === "recommendations" ? 0.55 : 0.2;
  const genreBoost = Math.min(sharedGenreCount, 3) * 0.16;
  const languageBoost =
    candidate.item.language === currentMedia.language ? 0.18 : 0;
  const popularityBoost = Math.log10(candidate.popularity + 1) * 0.28;
  const voteCountBoost = Math.log10(candidate.voteCount + 1) * 0.16;
  const imageBoost = candidate.hasBackdrop ? 0.08 : 0;
  const sourceOrderPenalty = candidate.sourceOrder * 0.002;

  return (
    weightedRating +
    sourceBoost +
    genreBoost +
    languageBoost +
    popularityBoost +
    voteCountBoost +
    imageBoost -
    sourceOrderPenalty
  );
}

function removeDuplicateCandidates(
  candidates: TmdbRelatedMediaCandidate[],
  currentMedia: MediaDetails,
) {
  const sortedCandidates = [...candidates].sort(
    (firstCandidate, secondCandidate) =>
      calculateQualityScore(secondCandidate, currentMedia) -
      calculateQualityScore(firstCandidate, currentMedia),
  );

  const seenKeys = new Set<string>();

  return sortedCandidates.filter((candidate) => {
    const key = `${candidate.item.mediaType}:${candidate.item.tmdbId}`;

    if (seenKeys.has(key)) {
      return false;
    }

    seenKeys.add(key);
    return true;
  });
}

function selectMoreLikeThisItems(
  candidates: TmdbRelatedMediaCandidate[],
  currentMedia: MediaDetails,
) {
  const category = getRelatedCategory(currentMedia);
  const preferredVoteThreshold = getPreferredVoteThreshold(
    category,
    currentMedia.mediaType,
  );

  const suitableCandidates = removeDuplicateCandidates(
    candidates.filter((candidate) =>
      isSuitableCandidate(candidate, currentMedia, category),
    ),
    currentMedia,
  );

  const preferredCandidates = suitableCandidates.filter(
    (candidate) =>
      candidate.voteAverage >= 5.8 &&
      candidate.voteCount >= preferredVoteThreshold,
  );

  const preferredKeys = new Set(
    preferredCandidates.map(
      (candidate) => `${candidate.item.mediaType}:${candidate.item.tmdbId}`,
    ),
  );

  const fallbackCandidates = suitableCandidates.filter((candidate) => {
    const key = `${candidate.item.mediaType}:${candidate.item.tmdbId}`;

    return (
      !preferredKeys.has(key) &&
      candidate.voteAverage >= 5 &&
      candidate.voteCount >= 5
    );
  });

  return [...preferredCandidates, ...fallbackCandidates]
    .slice(0, MORE_LIKE_THIS_LIMIT)
    .map((candidate) => candidate.item);
}

async function buildMoreLikeThis(
  mediaType: MediaType,
  tmdbId: number,
): Promise<MediaItem[]> {
  const [currentMedia, candidates] = await Promise.all([
    getTmdbMediaDetails(mediaType, tmdbId),
    getTmdbRelatedMediaCandidates(mediaType, tmdbId),
  ]);

  return selectMoreLikeThisItems(candidates, currentMedia);
}

export async function getMoreLikeThis(
  mediaType: MediaType,
  tmdbId: number,
): Promise<MediaItem[]> {
  const cacheKey = getCacheKey(mediaType, tmdbId);
  const cachedResult = cache.get(cacheKey);
  const now = Date.now();

  if (cachedResult && cachedResult.expiresAt > now) {
    return cachedResult.items;
  }

  const pendingRequest = pendingRequests.get(cacheKey);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = buildMoreLikeThis(mediaType, tmdbId);
  pendingRequests.set(cacheKey, request);

  try {
    const items = await request;

    cache.set(cacheKey, {
      expiresAt: now + CACHE_DURATION_MS,
      items,
    });

    return items;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}
