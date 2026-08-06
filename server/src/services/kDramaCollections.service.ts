import { createStaleWhileRevalidateCache } from "../utils/staleWhileRevalidateCache.js";
import type { MediaItem } from "../types/media.js";
import {
  allocateUniqueCollectionRows,
  calculateCollectionQualityScore,
  getCollectionCandidateKey,
  interleaveCollectionCandidateGroups,
  removeDuplicateCollectionCandidates,
} from "../utils/collectionRanking.js";
import { isSuitableForPublicKDrama } from "../utils/categoryMedia.js";
import {
  getTmdbKDramaPrimarySources,
  type TmdbKDramaCollectionCandidate,
} from "./tmdb.service.js";

export interface KDramaCollections {
  trendingKDramas: MediaItem[];
  essentials: MediaItem[];
  romance: MediaItem[];
  actionCrimeThriller: MediaItem[];
  mysterySuspense: MediaItem[];
  comedyFeelGood: MediaItem[];
}

const TRENDING_ROW_LIMIT = 28;
const ESSENTIALS_RESERVOIR_LIMIT = 44;
const GENRE_RESERVOIR_LIMIT = 40;

interface MediaThreshold {
  minVoteAverage: number;
  minVoteCount: number;
}

interface KDramaGenreThresholds {
  movie: MediaThreshold;
  tv: MediaThreshold;
}

function qualityScore(candidate: TmdbKDramaCollectionCandidate) {
  const confidenceVotes = candidate.item.mediaType === "movie" ? 420 : 260;
  return calculateCollectionQualityScore(candidate, confidenceVotes, 6.5);
}

function getCandidateGenres(
  candidate: TmdbKDramaCollectionCandidate,
  movieGenres: readonly string[],
  tvGenres: readonly string[],
) {
  return candidate.item.mediaType === "movie" ? movieGenres : tvGenres;
}

function countMatchingGenres(
  candidate: TmdbKDramaCollectionCandidate,
  movieGenres: readonly string[],
  tvGenres: readonly string[],
) {
  return getCandidateGenres(candidate, movieGenres, tvGenres).filter((genre) =>
    candidate.item.genres.includes(genre),
  ).length;
}

function containsAnyTextTerm(
  candidate: TmdbKDramaCollectionCandidate,
  terms: readonly string[],
) {
  const searchableText =
    `${candidate.item.title} ${candidate.item.overview}`.toLowerCase();

  return terms.some((term) => searchableText.includes(term));
}

function meetsThreshold(
  candidate: TmdbKDramaCollectionCandidate,
  thresholds: KDramaGenreThresholds,
) {
  const threshold = thresholds[candidate.item.mediaType];

  return (
    candidate.voteAverage >= threshold.minVoteAverage &&
    candidate.voteCount >= threshold.minVoteCount
  );
}

function rankGenreCandidates(
  qualityPool: TmdbKDramaCollectionCandidate[],
  targetedCandidates: TmdbKDramaCollectionCandidate[],
  movieGenres: readonly string[],
  tvGenres: readonly string[],
  thresholds: KDramaGenreThresholds,
  options: {
    targetedBoost?: number;
    textTerms?: readonly string[];
    requireTextMatchForTv?: boolean;
  } = {},
) {
  const targetedKeys = new Set(
    targetedCandidates.map(getCollectionCandidateKey),
  );
  const textTerms = options.textTerms ?? [];

  return removeDuplicateCollectionCandidates([
    ...targetedCandidates,
    ...qualityPool,
  ])
    .filter((candidate) => {
      if (!isSuitableForPublicKDrama(candidate) || !meetsThreshold(candidate, thresholds)) {
        return false;
      }

      const matchesGenre =
        countMatchingGenres(candidate, movieGenres, tvGenres) > 0;

      if (!matchesGenre) {
        return false;
      }

      if (
        options.requireTextMatchForTv &&
        candidate.item.mediaType === "tv" &&
        !containsAnyTextTerm(candidate, textTerms)
      ) {
        return false;
      }

      return true;
    })
    .sort((first, second) => {
      function score(candidate: TmdbKDramaCollectionCandidate) {
        const targetedBoost = targetedKeys.has(
          getCollectionCandidateKey(candidate),
        )
          ? options.targetedBoost ?? 0
          : 0;
        const textBoost = containsAnyTextTerm(candidate, textTerms) ? 0.12 : 0;
        const genreBoost =
          countMatchingGenres(candidate, movieGenres, tvGenres) * 0.34;

        return qualityScore(candidate) + targetedBoost + textBoost + genreBoost;
      }

      return score(second) - score(first);
    });
}

function takeTrending(
  candidates: TmdbKDramaCollectionCandidate[],
  usedKeys: Set<string>,
) {
  const items: MediaItem[] = [];

  for (const candidate of removeDuplicateCollectionCandidates(candidates)) {
    const key = getCollectionCandidateKey(candidate);

    if (usedKeys.has(key) || !isSuitableForPublicKDrama(candidate)) {
      continue;
    }

    usedKeys.add(key);
    items.push(candidate.item);

    if (items.length >= TRENDING_ROW_LIMIT) {
      break;
    }
  }

  return items;
}


async function buildKDramaCollections(): Promise<KDramaCollections> {
  const sources = await getTmdbKDramaPrimarySources();
  const usedKeys = new Set<string>();

  const trendingKDramas = takeTrending(
    interleaveCollectionCandidateGroups([
      sources.trendingTv,
      sources.trendingMovies,
      sources.currentlyAiringTv,
      sources.recentMovies,
    ]),
    usedKeys,
  );

  const qualityPool = removeDuplicateCollectionCandidates([
    ...sources.mostVotedTv,
    ...sources.highlyRatedTv,
    ...sources.popularTv,
    ...sources.mostVotedMovies,
    ...sources.highlyRatedMovies,
    ...sources.popularMovies,
  ]).filter(isSuitableForPublicKDrama);

  const essentialsCandidates = qualityPool
    .filter((candidate) =>
      candidate.item.mediaType === "movie"
        ? candidate.voteAverage >= 6.4 && candidate.voteCount >= 90
        : candidate.voteAverage >= 6.8 && candidate.voteCount >= 65,
    )
    .sort((first, second) => qualityScore(second) - qualityScore(first));

  const romanceCandidates = rankGenreCandidates(
    qualityPool,
    interleaveCollectionCandidateGroups([
      sources.romanceKeywordTv,
      sources.romanceKeywordMovies,
    ]),
    ["Romance"],
    ["Drama"],
    {
      movie: { minVoteAverage: 6.2, minVoteCount: 30 },
      tv: { minVoteAverage: 6.5, minVoteCount: 25 },
    },
    {
      targetedBoost: 0.75,
      textTerms: ["love", "romance", "relationship", "marriage", "wedding"],
      requireTextMatchForTv: true,
    },
  );

  const actionCrimeThrillerCandidates = rankGenreCandidates(
    qualityPool,
    [],
    ["Action", "Crime", "Thriller"],
    ["Action & Adventure", "Crime"],
    {
      movie: { minVoteAverage: 6.1, minVoteCount: 30 },
      tv: { minVoteAverage: 6.4, minVoteCount: 25 },
    },
  );

  const mysterySuspenseCandidates = rankGenreCandidates(
    qualityPool,
    interleaveCollectionCandidateGroups([
      sources.suspenseKeywordTv,
      sources.suspenseKeywordMovies,
    ]),
    ["Mystery", "Thriller"],
    ["Mystery"],
    {
      movie: { minVoteAverage: 6.2, minVoteCount: 30 },
      tv: { minVoteAverage: 6.5, minVoteCount: 25 },
    },
    {
      targetedBoost: 0.5,
      textTerms: ["mystery", "suspense", "thriller", "investigation", "secret"],
    },
  );

  const comedyFeelGoodCandidates = rankGenreCandidates(
    qualityPool,
    interleaveCollectionCandidateGroups([
      sources.feelGoodKeywordTv,
      sources.feelGoodKeywordMovies,
    ]),
    ["Comedy", "Family"],
    ["Comedy"],
    {
      movie: { minVoteAverage: 6.1, minVoteCount: 25 },
      tv: { minVoteAverage: 6.4, minVoteCount: 20 },
    },
    {
      targetedBoost: 0.45,
      textTerms: ["friendship", "heartwarming", "family", "community", "healing"],
    },
  );

  const rows = allocateUniqueCollectionRows(
    [
      {
        key: "essentials",
        candidates: essentialsCandidates,
        limit: ESSENTIALS_RESERVOIR_LIMIT,
      },
      {
        key: "romance",
        candidates: romanceCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "actionCrimeThriller",
        candidates: actionCrimeThrillerCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "mysterySuspense",
        candidates: mysterySuspenseCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "comedyFeelGood",
        candidates: comedyFeelGoodCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
    ] as const,
    usedKeys,
    isSuitableForPublicKDrama,
  );

  return {
    trendingKDramas,
    essentials: rows.essentials,
    romance: rows.romance,
    actionCrimeThriller: rows.actionCrimeThriller,
    mysterySuspense: rows.mysterySuspense,
    comedyFeelGood: rows.comedyFeelGood,
  };
}

const collectionsCache = createStaleWhileRevalidateCache<KDramaCollections>({
  freshDurationMs: 6 * 60 * 60 * 1000,
  staleDurationMs: 24 * 60 * 60 * 1000,
  label: "k drama collections",
});

export function getKDramaCollections(): Promise<KDramaCollections> {
  return collectionsCache.get(buildKDramaCollections);
}
