import type { MediaItem } from "../types/media.js";
import {
  getTmdbKDramaPrimarySources,
  type TmdbKDramaCollectionCandidate,
} from "./tmdb.service.js";

import {
  getCategoryCandidateKey as getCandidateKey,
  isSuitableForPublicKDrama,
} from "../utils/categoryMedia.js";

export interface KDramaCollections {
  trendingKDramas: MediaItem[];
  essentials: MediaItem[];
  romance: MediaItem[];
  actionCrimeThriller: MediaItem[];
  mysterySuspense: MediaItem[];
  comedyFeelGood: MediaItem[];
}

const TRENDING_ROW_LIMIT = 24;
const ESSENTIALS_ROW_LIMIT = 20;
const GENRE_ROW_LIMIT = 16;

const CACHE_DURATION_MS = 30 * 60 * 1000;

function interleaveCandidateGroups(
  candidateGroups: TmdbKDramaCollectionCandidate[][],
) {
  const combinedCandidates: TmdbKDramaCollectionCandidate[] = [];

  const longestLength = Math.max(
    0,

    ...candidateGroups.map((group) => group.length),
  );

  for (let index = 0; index < longestLength; index += 1) {
    for (const group of candidateGroups) {
      const candidate = group[index];

      if (candidate) {
        combinedCandidates.push(candidate);
      }
    }
  }

  return combinedCandidates;
}

function removeDuplicateCandidates(
  candidates: TmdbKDramaCollectionCandidate[],
) {
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

function calculateKDramaQualityScore(candidate: TmdbKDramaCollectionCandidate) {
  const globalAverageRating = 6.5;

  const confidenceVotes = candidate.item.mediaType === "movie" ? 500 : 300;

  const voteConfidence =
    candidate.voteCount / (candidate.voteCount + confidenceVotes);

  const weightedRating =
    voteConfidence * candidate.voteAverage +
    (1 - voteConfidence) * globalAverageRating;

  const popularityBoost = Math.log10(candidate.popularity + 1) * 0.32;

  const voteCountBoost = Math.log10(candidate.voteCount + 1) * 0.18;

  const imageBoost = candidate.hasBackdrop ? 0.1 : 0;

  return weightedRating + popularityBoost + voteCountBoost + imageBoost;
}

function meetsEssentialsThreshold(candidate: TmdbKDramaCollectionCandidate) {
  if (candidate.item.mediaType === "movie") {
    return candidate.voteAverage >= 6.5 && candidate.voteCount >= 150;
  }

  return candidate.voteAverage >= 7 && candidate.voteCount >= 100;
}

interface MediaThreshold {
  minVoteAverage: number;
  minVoteCount: number;
}

interface KDramaGenreThresholds {
  movie: MediaThreshold;
  tv: MediaThreshold;
}

function getCandidateGenres(
  candidate: TmdbKDramaCollectionCandidate,

  movieGenres: string[],
  tvGenres: string[],
) {
  return candidate.item.mediaType === "movie" ? movieGenres : tvGenres;
}

function countMatchingGenres(
  candidate: TmdbKDramaCollectionCandidate,

  movieGenres: string[],
  tvGenres: string[],
) {
  const targetGenres = getCandidateGenres(candidate, movieGenres, tvGenres);

  return targetGenres.filter((genre) => candidate.item.genres.includes(genre))
    .length;
}

function getCandidateSearchText(candidate: TmdbKDramaCollectionCandidate) {
  return `${candidate.item.title} ${candidate.item.overview}`.toLowerCase();
}

function containsAnyTextTerm(
  candidate: TmdbKDramaCollectionCandidate,

  terms: string[],
) {
  const searchableText = getCandidateSearchText(candidate);

  return terms.some((term) => searchableText.includes(term));
}

function meetsGenreThreshold(
  candidate: TmdbKDramaCollectionCandidate,

  thresholds: KDramaGenreThresholds,
) {
  const threshold = thresholds[candidate.item.mediaType];

  return (
    candidate.voteAverage >= threshold.minVoteAverage &&
    candidate.voteCount >= threshold.minVoteCount
  );
}

function calculateGenreScore(
  candidate: TmdbKDramaCollectionCandidate,

  movieGenres: string[],
  tvGenres: string[],

  targetedCandidateKeys: Set<string>,

  targetedBoost: number,
  textTerms: string[],
) {
  const genreRelevanceBoost =
    countMatchingGenres(candidate, movieGenres, tvGenres) * 0.08;

  const keywordTargetBoost = targetedCandidateKeys.has(
    getCandidateKey(candidate),
  )
    ? targetedBoost
    : 0;

  const textRelevanceBoost = containsAnyTextTerm(candidate, textTerms)
    ? 0.06
    : 0;

  return (
    calculateKDramaQualityScore(candidate) +
    genreRelevanceBoost +
    keywordTargetBoost +
    textRelevanceBoost
  );
}

function buildGenreCandidates(
  qualityPool: TmdbKDramaCollectionCandidate[],

  targetedCandidates: TmdbKDramaCollectionCandidate[],

  movieGenres: string[],
  tvGenres: string[],

  thresholds: KDramaGenreThresholds,

  targetedBoost = 0,
  textTerms: string[] = [],

  requireTextMatchForTv = false,
) {
  const targetedCandidateKeys = new Set(
    targetedCandidates.map(getCandidateKey),
  );

  const genreCandidates = qualityPool.filter((candidate) => {
    const targetGenres = getCandidateGenres(candidate, movieGenres, tvGenres);

    const matchesGenre = targetGenres.some((genre) =>
      candidate.item.genres.includes(genre),
    );

    if (!matchesGenre) {
      return false;
    }

    if (requireTextMatchForTv && candidate.item.mediaType === "tv") {
      return containsAnyTextTerm(candidate, textTerms);
    }

    return true;
  });

  return removeDuplicateCandidates([...targetedCandidates, ...genreCandidates])
    .filter(
      (candidate) =>
        isSuitableForPublicKDrama(candidate) &&
        meetsGenreThreshold(candidate, thresholds),
    )
    .sort(
      (firstCandidate, secondCandidate) =>
        calculateGenreScore(
          secondCandidate,
          movieGenres,
          tvGenres,
          targetedCandidateKeys,
          targetedBoost,
          textTerms,
        ) -
        calculateGenreScore(
          firstCandidate,
          movieGenres,
          tvGenres,
          targetedCandidateKeys,
          targetedBoost,
          textTerms,
        ),
    );
}

function takeUniqueMedia(
  candidates: TmdbKDramaCollectionCandidate[],

  usedMediaKeys: Set<string>,
  limit: number,
) {
  const items: MediaItem[] = [];

  for (const candidate of candidates) {
    const candidateKey = getCandidateKey(candidate);

    if (
      usedMediaKeys.has(candidateKey) ||
      !isSuitableForPublicKDrama(candidate)
    ) {
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
  data: KDramaCollections;
} | null = null;

let pendingCollectionsRequest: Promise<KDramaCollections> | null = null;

async function buildKDramaCollections(): Promise<KDramaCollections> {
  const sources = await getTmdbKDramaPrimarySources();

  const usedMediaKeys = new Set<string>();

  const trendingCandidates = removeDuplicateCandidates(
    interleaveCandidateGroups([
      sources.trendingTv.filter(isSuitableForPublicKDrama),

      sources.trendingMovies.filter(isSuitableForPublicKDrama),

      sources.currentlyAiringTv,

      sources.recentMovies,
    ]),
  );

  const trendingKDramas = takeUniqueMedia(
    trendingCandidates,
    usedMediaKeys,
    TRENDING_ROW_LIMIT,
  );

  const qualityPool = removeDuplicateCandidates([
    ...sources.mostVotedTv,
    ...sources.highlyRatedTv,
    ...sources.popularTv,

    ...sources.mostVotedMovies,
    ...sources.highlyRatedMovies,
    ...sources.popularMovies,
  ]);

  const essentialsCandidates = qualityPool
    .filter(
      (candidate) =>
        isSuitableForPublicKDrama(candidate) &&
        meetsEssentialsThreshold(candidate),
    )
    .sort(
      (firstCandidate, secondCandidate) =>
        calculateKDramaQualityScore(secondCandidate) -
        calculateKDramaQualityScore(firstCandidate),
    );

  const essentials = takeUniqueMedia(
    essentialsCandidates,
    usedMediaKeys,
    ESSENTIALS_ROW_LIMIT,
  );

  const romanceTargetedCandidates = interleaveCandidateGroups([
    sources.romanceKeywordTv,
    sources.romanceKeywordMovies,
  ]);

  const romance = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,
      romanceTargetedCandidates,

      ["Romance"],
      ["Drama"],

      {
        movie: {
          minVoteAverage: 6.3,
          minVoteCount: 50,
        },

        tv: {
          minVoteAverage: 6.7,
          minVoteCount: 40,
        },
      },

      0.45,

      ["love", "romance", "relationship", "marriage", "wedding"],

      true,
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  const actionCrimeThriller = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,
      [],

      ["Action", "Crime", "Thriller"],

      ["Action & Adventure", "Crime"],

      {
        movie: {
          minVoteAverage: 6.2,
          minVoteCount: 50,
        },

        tv: {
          minVoteAverage: 6.5,
          minVoteCount: 40,
        },
      },
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  const suspenseTargetedCandidates = interleaveCandidateGroups([
    sources.suspenseKeywordTv,
    sources.suspenseKeywordMovies,
  ]);

  const mysterySuspense = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,
      suspenseTargetedCandidates,

      ["Mystery", "Thriller"],

      ["Mystery"],

      {
        movie: {
          minVoteAverage: 6.3,
          minVoteCount: 50,
        },

        tv: {
          minVoteAverage: 6.6,
          minVoteCount: 40,
        },
      },

      0.3,

      ["mystery", "suspense", "thriller", "investigation"],
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  const feelGoodTargetedCandidates = interleaveCandidateGroups([
    sources.feelGoodKeywordTv,
    sources.feelGoodKeywordMovies,
  ]);

  const comedyFeelGood = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,
      feelGoodTargetedCandidates,

      ["Comedy"],
      ["Comedy"],

      {
        movie: {
          minVoteAverage: 6.2,
          minVoteCount: 40,
        },

        tv: {
          minVoteAverage: 6.5,
          minVoteCount: 30,
        },
      },

      0.25,

      ["friendship", "heartwarming", "family", "community"],
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  return {
    trendingKDramas,
    essentials,
    romance,
    actionCrimeThriller,
    mysterySuspense,
    comedyFeelGood,
  };
}

export async function getKDramaCollections(): Promise<KDramaCollections> {
  const now = Date.now();

  if (cachedCollections && cachedCollections.expiresAt > now) {
    return cachedCollections.data;
  }

  if (pendingCollectionsRequest) {
    return pendingCollectionsRequest;
  }

  pendingCollectionsRequest = buildKDramaCollections();

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
