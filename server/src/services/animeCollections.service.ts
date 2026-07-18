import type { MediaItem } from "../types/media.js";
import {
  getTmdbAnimePrimarySources,
  type TmdbAnimeCollectionCandidate,
} from "./tmdb.service.js";

import {
  getCategoryCandidateKey as getCandidateKey,
  isSuitableForPublicAnime,
} from "../utils/categoryMedia.js";

export interface AnimeCollections {
  trendingAnime: MediaItem[];
  essentials: MediaItem[];

  actionAdventureThriller: MediaItem[];

  fantasyMysteryScienceFiction: MediaItem[];

  romanceDrama: MediaItem[];

  comedySliceOfLife: MediaItem[];
}

const TRENDING_ROW_LIMIT = 20;
const ESSENTIALS_ROW_LIMIT = 20;
const GENRE_ROW_LIMIT = 16;

const CACHE_DURATION_MS = 30 * 60 * 1000;

function interleaveCandidates(
  firstCandidates: TmdbAnimeCollectionCandidate[],

  secondCandidates: TmdbAnimeCollectionCandidate[],
) {
  const combinedCandidates: TmdbAnimeCollectionCandidate[] = [];

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

function removeDuplicateCandidates(candidates: TmdbAnimeCollectionCandidate[]) {
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

function calculateAnimeQualityScore(candidate: TmdbAnimeCollectionCandidate) {
  const globalAverageRating = 6.5;
  const confidenceVotes = 300;

  const voteConfidence =
    candidate.voteCount / (candidate.voteCount + confidenceVotes);

  const weightedRating =
    voteConfidence * candidate.voteAverage +
    (1 - voteConfidence) * globalAverageRating;

  const popularityBoost = Math.log10(candidate.popularity + 1) * 0.3;

  const voteCountBoost = Math.log10(candidate.voteCount + 1) * 0.18;

  const imageBoost = candidate.hasBackdrop ? 0.1 : 0;

  return weightedRating + popularityBoost + voteCountBoost + imageBoost;
}

function rankCandidates(
  candidates: TmdbAnimeCollectionCandidate[],

  minVoteAverage: number,
  minVoteCount: number,
) {
  return removeDuplicateCandidates(candidates)
    .filter(
      (candidate) =>
        isSuitableForPublicAnime(candidate) &&
        candidate.voteAverage >= minVoteAverage &&
        candidate.voteCount >= minVoteCount,
    )
    .sort(
      (firstCandidate, secondCandidate) =>
        calculateAnimeQualityScore(secondCandidate) -
        calculateAnimeQualityScore(firstCandidate),
    );
}

function getCandidateGenres(
  candidate: TmdbAnimeCollectionCandidate,

  movieGenres: string[],
  tvGenres: string[],
) {
  return candidate.item.mediaType === "movie" ? movieGenres : tvGenres;
}

function countMatchingGenres(
  candidate: TmdbAnimeCollectionCandidate,

  movieGenres: string[],
  tvGenres: string[],
) {
  const targetGenres = getCandidateGenres(candidate, movieGenres, tvGenres);

  return targetGenres.filter((genre) => candidate.item.genres.includes(genre))
    .length;
}

function calculateGenreScore(
  candidate: TmdbAnimeCollectionCandidate,

  movieGenres: string[],
  tvGenres: string[],

  targetedCandidateKeys: Set<string>,

  targetedBoost: number,
) {
  const genreRelevanceBoost =
    countMatchingGenres(candidate, movieGenres, tvGenres) * 0.08;

  const keywordTargetBoost = targetedCandidateKeys.has(
    getCandidateKey(candidate),
  )
    ? targetedBoost
    : 0;

  return (
    calculateAnimeQualityScore(candidate) +
    genreRelevanceBoost +
    keywordTargetBoost
  );
}

function buildGenreCandidates(
  qualityPool: TmdbAnimeCollectionCandidate[],

  targetedCandidates: TmdbAnimeCollectionCandidate[],

  movieGenres: string[],
  tvGenres: string[],

  minVoteAverage: number,
  minVoteCount: number,

  targetedBoost = 0,
) {
  const targetedCandidateKeys = new Set(
    targetedCandidates.map(getCandidateKey),
  );

  const genreCandidates = qualityPool.filter((candidate) => {
    const targetGenres = getCandidateGenres(candidate, movieGenres, tvGenres);

    return targetGenres.some((genre) => candidate.item.genres.includes(genre));
  });

  return removeDuplicateCandidates([...targetedCandidates, ...genreCandidates])
    .filter(
      (candidate) =>
        isSuitableForPublicAnime(candidate) &&
        candidate.voteAverage >= minVoteAverage &&
        candidate.voteCount >= minVoteCount,
    )
    .sort(
      (firstCandidate, secondCandidate) =>
        calculateGenreScore(
          secondCandidate,
          movieGenres,
          tvGenres,
          targetedCandidateKeys,
          targetedBoost,
        ) -
        calculateGenreScore(
          firstCandidate,
          movieGenres,
          tvGenres,
          targetedCandidateKeys,
          targetedBoost,
        ),
    );
}

function takeUniqueMedia(
  candidates: TmdbAnimeCollectionCandidate[],

  usedMediaKeys: Set<string>,
  limit: number,
) {
  const items: MediaItem[] = [];

  for (const candidate of candidates) {
    const candidateKey = getCandidateKey(candidate);

    if (
      usedMediaKeys.has(candidateKey) ||
      !isSuitableForPublicAnime(candidate)
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
  data: AnimeCollections;
} | null = null;

let pendingCollectionsRequest: Promise<AnimeCollections> | null = null;

async function buildAnimeCollections(): Promise<AnimeCollections> {
  const sources = await getTmdbAnimePrimarySources();

  const usedMediaKeys = new Set<string>();

  const popularMixed = interleaveCandidates(
    sources.popularTv,
    sources.popularMovies,
  );

  const trendingCandidates = [
    ...interleaveCandidates(
      sources.trendingTv.filter(isSuitableForPublicAnime),

      sources.trendingMovies.filter(isSuitableForPublicAnime),
    ),

    ...popularMixed,
  ];

  const trendingAnime = takeUniqueMedia(
    removeDuplicateCandidates(trendingCandidates),

    usedMediaKeys,
    TRENDING_ROW_LIMIT,
  );

  const qualityPool = removeDuplicateCandidates([
    ...sources.mostVotedTv,
    ...sources.popularTv,

    ...sources.mostVotedMovies,
    ...sources.popularMovies,
  ]).filter(isSuitableForPublicAnime);

  const essentialsCandidates = rankCandidates(qualityPool, 7, 100);

  const essentials = takeUniqueMedia(
    essentialsCandidates,
    usedMediaKeys,
    ESSENTIALS_ROW_LIMIT,
  );

  const actionAdventureThriller = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,
      [],

      ["Action", "Adventure", "Thriller"],

      ["Action & Adventure"],

      6.3,
      30,
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  const fantasyMysteryScienceFiction = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,
      [],

      ["Fantasy", "Mystery", "Science Fiction"],

      ["Mystery", "Sci-Fi & Fantasy"],

      6.5,
      30,
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  const romanceTargetedCandidates = interleaveCandidates(
    sources.romanceKeywordTv,
    sources.romanceKeywordMovies,
  );

  const romanceDrama = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,
      romanceTargetedCandidates,

      ["Romance", "Drama"],

      ["Drama"],

      6.5,
      20,

      0.3,
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  const sliceOfLifeTargetedCandidates = interleaveCandidates(
    sources.sliceOfLifeTv,
    sources.sliceOfLifeMovies,
  );

  const comedySliceOfLife = takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,
      sliceOfLifeTargetedCandidates,

      ["Comedy"],
      ["Comedy"],

      6.3,
      20,

      0.25,
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  );

  return {
    trendingAnime,
    essentials,
    actionAdventureThriller,
    fantasyMysteryScienceFiction,
    romanceDrama,
    comedySliceOfLife,
  };
}

export async function getAnimeCollections(): Promise<AnimeCollections> {
  const now = Date.now();

  if (cachedCollections && cachedCollections.expiresAt > now) {
    return cachedCollections.data;
  }

  if (pendingCollectionsRequest) {
    return pendingCollectionsRequest;
  }

  pendingCollectionsRequest = buildAnimeCollections();

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
