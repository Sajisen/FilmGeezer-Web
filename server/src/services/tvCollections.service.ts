import { createStaleWhileRevalidateCache } from "../utils/staleWhileRevalidateCache.js";
import type { MediaItem } from "../types/media.js";
import {
  allocateUniqueCollectionRows,
  calculateCollectionQualityScore,
  getCollectionCandidateKey,
  interleaveCollectionCandidateGroups,
  removeDuplicateCollectionCandidates,
} from "../utils/collectionRanking.js";
import {
  getTmdbTvCollectionSources,
  type TmdbTvCollectionCandidate,
} from "./tmdb.service.js";

export interface TvCollections {
  trendingAndCurrentlyAiring: MediaItem[];
  essentials: MediaItem[];
  actionCrimeThriller: MediaItem[];
  comedyDrama: MediaItem[];
  mysteryScienceFiction: MediaItem[];
}

const TRENDING_ROW_LIMIT = 30;
const ESSENTIALS_RESERVOIR_LIMIT = 48;
const GENRE_RESERVOIR_LIMIT = 44;

const ANIMATION_GENRE = "Animation";
const BLOCKED_GENERAL_TV_GENRES = ["News", "Reality", "Talk"];
const ACTION_GENRES = ["Action & Adventure", "Crime", "Mystery"];
const HEAVY_DRAMA_GENRES = [
  "Action & Adventure",
  "Crime",
  "Mystery",
  "Sci-Fi & Fantasy",
  "War & Politics",
];

const blockedDiscoveryTerms = [
  "adult series",
  "erotic series",
  "pornographic",
  "softcore",
  "sexploitation",
];

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

function qualityScore(candidate: TmdbTvCollectionCandidate) {
  return calculateCollectionQualityScore(candidate, 650, 6.5);
}

function countGenres(
  candidate: TmdbTvCollectionCandidate,
  genres: readonly string[],
) {
  return genres.filter((genre) => candidate.item.genres.includes(genre)).length;
}

function rankCandidates(
  candidates: TmdbTvCollectionCandidate[],
  predicate: (candidate: TmdbTvCollectionCandidate) => boolean,
  score: (candidate: TmdbTvCollectionCandidate) => number,
) {
  return removeDuplicateCollectionCandidates(candidates)
    .filter((candidate) => isSuitableForPublicTv(candidate) && predicate(candidate))
    .sort((first, second) => score(second) - score(first));
}

function takeTrending(
  candidates: TmdbTvCollectionCandidate[],
  usedKeys: Set<string>,
) {
  const items: MediaItem[] = [];

  for (const candidate of removeDuplicateCollectionCandidates(candidates)) {
    const key = getCollectionCandidateKey(candidate);

    if (usedKeys.has(key) || !isSuitableForPublicTv(candidate)) {
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


async function buildTvCollections(): Promise<TvCollections> {
  const sources = await getTmdbTvCollectionSources();
  const usedKeys = new Set<string>();

  const trendingAndCurrentlyAiring = takeTrending(
    interleaveCollectionCandidateGroups([sources.trending, sources.onTheAir]),
    usedKeys,
  );

  const qualityPool = removeDuplicateCollectionCandidates([
    ...sources.popularQuality,
    ...sources.mostVoted,
    ...sources.highlyRated,
  ]);

  const essentialsCandidates = rankCandidates(
    qualityPool,
    (candidate) =>
      candidate.voteAverage >= 6.7 && candidate.voteCount >= 220,
    qualityScore,
  );

  const actionTargetKeys = new Set(
    sources.actionCrimeThriller.map(getCollectionCandidateKey),
  );
  const actionCandidates = rankCandidates(
    [...sources.actionCrimeThriller, ...qualityPool],
    (candidate) =>
      countGenres(candidate, ACTION_GENRES) > 0 &&
      candidate.voteAverage >= 6.2 &&
      candidate.voteCount >= 70,
    (candidate) =>
      qualityScore(candidate) +
      countGenres(candidate, ACTION_GENRES) * 0.38 +
      (actionTargetKeys.has(getCollectionCandidateKey(candidate)) ? 0.35 : 0),
  );

  const comedyDramaTargetKeys = new Set(
    sources.comedyDrama.map(getCollectionCandidateKey),
  );
  const comedyDramaCandidates = rankCandidates(
    [...sources.comedyDrama, ...qualityPool],
    (candidate) => {
      const hasComedy = candidate.item.genres.includes("Comedy");
      const hasDrama = candidate.item.genres.includes("Drama");
      const heavyGenreCount = countGenres(candidate, HEAVY_DRAMA_GENRES);

      return (
        candidate.voteAverage >= 6.2 &&
        candidate.voteCount >= 55 &&
        ((hasComedy && heavyGenreCount <= 2) ||
          (hasDrama && heavyGenreCount <= 1))
      );
    },
    (candidate) => {
      const comedyBoost = candidate.item.genres.includes("Comedy") ? 0.9 : 0;
      const dramaBoost = candidate.item.genres.includes("Drama") ? 0.32 : 0;
      const targetedBoost = comedyDramaTargetKeys.has(
        getCollectionCandidateKey(candidate),
      )
        ? 0.3
        : 0;
      const heavyPenalty = countGenres(candidate, HEAVY_DRAMA_GENRES) * 0.4;

      return (
        qualityScore(candidate) +
        comedyBoost +
        dramaBoost +
        targetedBoost -
        heavyPenalty
      );
    },
  );

  const mysteryTargetKeys = new Set(
    sources.mysteryScienceFiction.map(getCollectionCandidateKey),
  );
  const mysteryScienceFictionCandidates = rankCandidates(
    [...sources.mysteryScienceFiction, ...qualityPool],
    (candidate) =>
      countGenres(candidate, ["Mystery", "Sci-Fi & Fantasy"]) > 0 &&
      candidate.voteAverage >= 6.3 &&
      candidate.voteCount >= 60,
    (candidate) =>
      qualityScore(candidate) +
      countGenres(candidate, ["Mystery", "Sci-Fi & Fantasy"]) * 0.45 +
      (mysteryTargetKeys.has(getCollectionCandidateKey(candidate)) ? 0.35 : 0),
  );

  const rows = allocateUniqueCollectionRows(
    [
      {
        key: "essentials",
        candidates: essentialsCandidates,
        limit: ESSENTIALS_RESERVOIR_LIMIT,
      },
      {
        key: "actionCrimeThriller",
        candidates: actionCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "comedyDrama",
        candidates: comedyDramaCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "mysteryScienceFiction",
        candidates: mysteryScienceFictionCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
    ] as const,
    usedKeys,
    isSuitableForPublicTv,
  );

  return {
    trendingAndCurrentlyAiring,
    essentials: rows.essentials,
    actionCrimeThriller: rows.actionCrimeThriller,
    comedyDrama: rows.comedyDrama,
    mysteryScienceFiction: rows.mysteryScienceFiction,
  };
}

const collectionsCache = createStaleWhileRevalidateCache<TvCollections>({
  freshDurationMs: 6 * 60 * 60 * 1000,
  staleDurationMs: 24 * 60 * 60 * 1000,
  label: "tv collections",
});

export function getTvCollections(): Promise<TvCollections> {
  return collectionsCache.get(buildTvCollections);
}
