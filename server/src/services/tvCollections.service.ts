import type { MediaItem } from "../types/media.js";
import {
  getTmdbTvCollectionSources,
  type TmdbTvCollectionCandidate,
} from "./tmdb.service.js";

export interface TvCollections {
  trendingAndCurrentlyAiring: MediaItem[];

  essentials: MediaItem[];

  actionCrimeThriller: MediaItem[];

  comedy: MediaItem[];
  dramaRomance: MediaItem[];

  mysteryScienceFiction: MediaItem[];
}

const CURRENT_ROW_LIMIT = 30;
const ESSENTIALS_ROW_LIMIT = 20;
const GENRE_ROW_LIMIT = 16;

const CACHE_DURATION_MS = 30 * 60 * 1000;

const ANIMATION_GENRE = "Animation";

const BLOCKED_GENERAL_TV_GENRES = ["News", "Reality", "Talk"];

const blockedDiscoveryTerms = [
  "adult series",
  "erotic series",
  "pornographic",
  "softcore",
];

function getCandidateKey(candidate: TmdbTvCollectionCandidate) {
  return `${candidate.item.mediaType}:${candidate.item.tmdbId}`;
}

function isAnime(candidate: TmdbTvCollectionCandidate) {
  return (
    candidate.item.language === "JA" &&
    candidate.item.genres.includes(ANIMATION_GENRE)
  );
}

function belongsToKoreanCategory(candidate: TmdbTvCollectionCandidate) {
  return (
    candidate.item.language === "KO" &&
    candidate.originCountries.includes("KR") &&
    !candidate.item.genres.includes(ANIMATION_GENRE)
  );
}

function hasBlockedGeneralTvGenre(candidate: TmdbTvCollectionCandidate) {
  return candidate.item.genres.some((genre) =>
    BLOCKED_GENERAL_TV_GENRES.includes(genre),
  );
}

function isSuitableForPublicTv(candidate: TmdbTvCollectionCandidate) {
  const searchableText =
    `${candidate.item.title} ${candidate.item.overview}`.toLowerCase();

  return (
    !candidate.isAdult &&
    candidate.hasPoster &&
    !isAnime(candidate) &&
    !belongsToKoreanCategory(candidate) &&
    !hasBlockedGeneralTvGenre(candidate) &&
    !blockedDiscoveryTerms.some((term) => searchableText.includes(term))
  );
}

function interleaveCandidates(
  firstCandidates: TmdbTvCollectionCandidate[],

  secondCandidates: TmdbTvCollectionCandidate[],
) {
  const combinedCandidates: TmdbTvCollectionCandidate[] = [];

  const longestLength = Math.max(
    firstCandidates.length,
    secondCandidates.length,
  );

  for (let index = 0; index < longestLength; index += 1) {
    const firstCandidate = firstCandidates[index];

    const secondCandidate = secondCandidates[index];

    if (firstCandidate) {
      combinedCandidates.push(firstCandidate);
    }

    if (secondCandidate) {
      combinedCandidates.push(secondCandidate);
    }
  }

  return combinedCandidates;
}

function removeDuplicateCandidates(candidates: TmdbTvCollectionCandidate[]) {
  const seenKeys = new Set<string>();

  return candidates.filter((candidate) => {
    const candidateKey = getCandidateKey(candidate);

    if (seenKeys.has(candidateKey)) {
      return false;
    }

    seenKeys.add(candidateKey);
    return true;
  });
}

function calculateQualityScore(candidate: TmdbTvCollectionCandidate) {
  const globalAverageRating = 6.5;
  const confidenceVotes = 800;

  const voteConfidence =
    candidate.voteCount / (candidate.voteCount + confidenceVotes);

  const weightedRating =
    voteConfidence * candidate.voteAverage +
    (1 - voteConfidence) * globalAverageRating;

  const popularityBoost = Math.log10(candidate.popularity + 1) * 0.35;

  const voteCountBoost = Math.log10(candidate.voteCount + 1) * 0.2;

  const imageBoost = candidate.hasBackdrop ? 0.1 : 0;

  return weightedRating + popularityBoost + voteCountBoost + imageBoost;
}

function countMatchingGenres(
  candidate: TmdbTvCollectionCandidate,

  genres: string[],
) {
  return genres.filter((genre) => candidate.item.genres.includes(genre)).length;
}

function calculateGenreScore(
  candidate: TmdbTvCollectionCandidate,

  genres: string[],
) {
  const genreRelevanceBoost = countMatchingGenres(candidate, genres) * 0.08;

  return calculateQualityScore(candidate) + genreRelevanceBoost;
}

function buildGenreCandidates(
  qualityPool: TmdbTvCollectionCandidate[],

  fallbackCandidates: TmdbTvCollectionCandidate[],

  genres: string[],
  minVoteAverage: number,
  minVoteCount: number,
) {
  return removeDuplicateCandidates([
    ...qualityPool.filter((candidate) =>
      candidate.item.genres.some((genre) => genres.includes(genre)),
    ),

    ...fallbackCandidates,
  ])
    .filter(
      (candidate) =>
        candidate.voteAverage >= minVoteAverage &&
        candidate.voteCount >= minVoteCount,
    )
    .sort(
      (firstCandidate, secondCandidate) =>
        calculateGenreScore(secondCandidate, genres) -
        calculateGenreScore(firstCandidate, genres),
    );
}

function takeUniqueMedia(
  candidates: TmdbTvCollectionCandidate[],

  usedMediaKeys: Set<string>,
  limit: number,
) {
  const items: MediaItem[] = [];

  for (const candidate of candidates) {
    const candidateKey = getCandidateKey(candidate);

    if (usedMediaKeys.has(candidateKey) || !isSuitableForPublicTv(candidate)) {
      continue;
    }

    usedMediaKeys.add(candidateKey);
    items.push(candidate.item);

    if (items.length === limit) {
      break;
    }
  }

  return items;
}

let cachedCollections: {
  expiresAt: number;
  data: TvCollections;
} | null = null;

let pendingCollectionsRequest: Promise<TvCollections> | null = null;

async function buildTvCollections(): Promise<TvCollections> {
  const sources = await getTmdbTvCollectionSources();

  const usedMediaKeys = new Set<string>();

  const trendingAndCurrentlyAiring = takeUniqueMedia(
    interleaveCandidates(sources.trending, sources.onTheAir),

    usedMediaKeys,
    CURRENT_ROW_LIMIT,
  );

  const qualityPool = removeDuplicateCandidates([
    ...sources.popularQuality,
    ...sources.mostVoted,
    ...sources.highlyRated,
  ]);

  const essentialsCandidates = qualityPool
    .filter(
      (candidate) => candidate.voteCount >= 500 && candidate.voteAverage >= 6.8,
    )
    .sort(
      (firstCandidate, secondCandidate) =>
        calculateQualityScore(secondCandidate) -
        calculateQualityScore(firstCandidate),
    );

  const essentials = takeUniqueMedia(
    essentialsCandidates,
    usedMediaKeys,
    ESSENTIALS_ROW_LIMIT,
  );

  const actionCrimeThriller = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,

      sources.actionCrimeThriller,

      ["Action & Adventure", "Crime", "Mystery"],

      6.3,
      150,
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  const comedy = takeUniqueMedia(
    buildGenreCandidates(qualityPool, sources.comedy, ["Comedy"], 6.3, 120),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  const dramaRomance = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,
      sources.dramaRomance,
      ["Drama"],
      6.5,
      150,
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  const mysteryScienceFiction = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,

      sources.mysteryScienceFiction,

      ["Mystery", "Sci-Fi & Fantasy"],

      6.5,
      150,
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  return {
    trendingAndCurrentlyAiring,
    essentials,
    actionCrimeThriller,
    comedy,
    dramaRomance,
    mysteryScienceFiction,
  };
}

export async function getTvCollections(): Promise<TvCollections> {
  const now = Date.now();

  if (cachedCollections && cachedCollections.expiresAt > now) {
    return cachedCollections.data;
  }

  if (pendingCollectionsRequest) {
    return pendingCollectionsRequest;
  }

  pendingCollectionsRequest = buildTvCollections();

  try {
    const data = await pendingCollectionsRequest;

    cachedCollections = {
      data,
      expiresAt: Date.now() + CACHE_DURATION_MS,
    };

    return data;
  } finally {
    pendingCollectionsRequest = null;
  }
}
