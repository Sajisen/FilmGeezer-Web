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
  getTmdbMovieCollectionSources,
  type TmdbMovieCollectionCandidate,
} from "./tmdb.service.js";

export interface MovieCollections {
  trendingAndNowPlaying: MediaItem[];
  essentials: MediaItem[];
  actionAdventureCrimeThriller: MediaItem[];
  comedy: MediaItem[];
  drama: MediaItem[];
  family: MediaItem[];
}

const TRENDING_ROW_LIMIT = 30;
const ESSENTIALS_RESERVOIR_LIMIT = 50;
const GENRE_RESERVOIR_LIMIT = 44;

const ANIMATION_GENRE = "Animation";
const ACTION_GENRES = ["Action", "Adventure", "Crime", "Thriller"];
const DRAMA_DISTRACTOR_GENRES = [
  "Action",
  "Adventure",
  "Crime",
  "Thriller",
  "Science Fiction",
  "Horror",
  "War",
];

const blockedDiscoveryTerms = [
  "adult film",
  "erotic film",
  "pornographic",
  "softcore",
  "sexploitation",
];

function isAnime(candidate: TmdbMovieCollectionCandidate) {
  return (
    candidate.item.language === "JA" &&
    candidate.item.genres.includes(ANIMATION_GENRE)
  );
}

function isSuitableForPublicMovies(candidate: TmdbMovieCollectionCandidate) {
  const searchableText =
    `${candidate.item.title} ${candidate.item.overview}`.toLowerCase();

  return (
    !candidate.isAdult &&
    !candidate.isVideo &&
    candidate.hasPoster &&
    !isAnime(candidate) &&
    !blockedDiscoveryTerms.some((term) => searchableText.includes(term))
  );
}

function qualityScore(candidate: TmdbMovieCollectionCandidate) {
  return calculateCollectionQualityScore(candidate, 1200, 6.4);
}

function getReleaseYear(candidate: TmdbMovieCollectionCandidate) {
  const year = Number(candidate.releaseDate.slice(0, 4));
  return Number.isInteger(year) && year > 0 ? year : null;
}

function buildEraBalancedEssentials(
  rankedCandidates: TmdbMovieCollectionCandidate[],
) {
  const currentYear = new Date().getUTCFullYear();
  const recent: TmdbMovieCollectionCandidate[] = [];
  const modern: TmdbMovieCollectionCandidate[] = [];
  const contemporary: TmdbMovieCollectionCandidate[] = [];
  const classics: TmdbMovieCollectionCandidate[] = [];
  const unknown: TmdbMovieCollectionCandidate[] = [];

  for (const candidate of rankedCandidates) {
    const year = getReleaseYear(candidate);

    if (year === null) {
      unknown.push(candidate);
    } else if (year >= currentYear - 7) {
      recent.push(candidate);
    } else if (year >= currentYear - 18) {
      modern.push(candidate);
    } else if (year >= currentYear - 35) {
      contemporary.push(candidate);
    } else {
      classics.push(candidate);
    }
  }

  const eras = {
    recent: { items: recent, cursor: 0, limit: 20, used: 0 },
    modern: { items: modern, cursor: 0, limit: 15, used: 0 },
    contemporary: {
      items: contemporary,
      cursor: 0,
      limit: 10,
      used: 0,
    },
    classic: { items: classics, cursor: 0, limit: 5, used: 0 },
  };

  const schedule = [
    "recent",
    "modern",
    "recent",
    "modern",
    "contemporary",
    "recent",
    "modern",
    "classic",
    "contemporary",
    "recent",
  ] as const;

  const balanced: TmdbMovieCollectionCandidate[] = [];
  const usedKeys = new Set<string>();
  let madeProgress = true;

  while (
    balanced.length < ESSENTIALS_RESERVOIR_LIMIT &&
    madeProgress
  ) {
    madeProgress = false;

    for (const eraName of schedule) {
      const era = eras[eraName];

      if (era.used >= era.limit || era.cursor >= era.items.length) {
        continue;
      }

      const candidate = era.items[era.cursor];
      era.cursor += 1;
      era.used += 1;

      const key = getCollectionCandidateKey(candidate);

      if (usedKeys.has(key)) {
        continue;
      }

      usedKeys.add(key);
      balanced.push(candidate);
      madeProgress = true;

      if (balanced.length >= ESSENTIALS_RESERVOIR_LIMIT) {
        break;
      }
    }
  }

  for (const candidate of [...rankedCandidates, ...unknown]) {
    const key = getCollectionCandidateKey(candidate);

    if (usedKeys.has(key)) {
      continue;
    }

    usedKeys.add(key);
    balanced.push(candidate);

    if (balanced.length >= ESSENTIALS_RESERVOIR_LIMIT) {
      break;
    }
  }

  return balanced;
}

function countGenres(
  candidate: TmdbMovieCollectionCandidate,
  genres: readonly string[],
) {
  return genres.filter((genre) => candidate.item.genres.includes(genre)).length;
}

function rankCandidates(
  candidates: TmdbMovieCollectionCandidate[],
  predicate: (candidate: TmdbMovieCollectionCandidate) => boolean,
  score: (candidate: TmdbMovieCollectionCandidate) => number,
) {
  return removeDuplicateCollectionCandidates(candidates)
    .filter(
      (candidate) => isSuitableForPublicMovies(candidate) && predicate(candidate),
    )
    .sort((first, second) => score(second) - score(first));
}

function takeTrending(
  candidates: TmdbMovieCollectionCandidate[],
  usedKeys: Set<string>,
) {
  const items: MediaItem[] = [];

  for (const candidate of removeDuplicateCollectionCandidates(candidates)) {
    const key = getCollectionCandidateKey(candidate);

    if (usedKeys.has(key) || !isSuitableForPublicMovies(candidate)) {
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


async function buildMovieCollections(): Promise<MovieCollections> {
  const sources = await getTmdbMovieCollectionSources();
  const usedKeys = new Set<string>();

  const trendingAndNowPlaying = takeTrending(
    interleaveCollectionCandidateGroups([
      sources.trending,
      sources.nowPlaying,
    ]),
    usedKeys,
  );

  const qualityPool = removeDuplicateCollectionCandidates([
    ...sources.popularQuality,
    ...sources.mostVoted,
    ...sources.highlyRated,
  ]);

  const essentialsCandidates = buildEraBalancedEssentials(
    rankCandidates(
      qualityPool,
      (candidate) =>
        candidate.voteAverage >= 6.4 && candidate.voteCount >= 500,
      qualityScore,
    ),
  );

  const actionTargetKeys = new Set(
    sources.actionAdventureCrimeThriller.map(getCollectionCandidateKey),
  );
  const actionCandidates = rankCandidates(
    [...sources.actionAdventureCrimeThriller, ...qualityPool],
    (candidate) =>
      countGenres(candidate, ACTION_GENRES) > 0 &&
      candidate.voteAverage >= 6.1 &&
      candidate.voteCount >= 120,
    (candidate) =>
      qualityScore(candidate) +
      countGenres(candidate, ACTION_GENRES) * 0.34 +
      (actionTargetKeys.has(getCollectionCandidateKey(candidate)) ? 0.35 : 0),
  );

  const comedyTargetKeys = new Set(
    sources.comedy.map(getCollectionCandidateKey),
  );
  const comedyCandidates = rankCandidates(
    [...sources.comedy, ...qualityPool],
    (candidate) =>
      candidate.item.genres.includes("Comedy") &&
      candidate.voteAverage >= 6 &&
      candidate.voteCount >= 80,
    (candidate) =>
      qualityScore(candidate) +
      (candidate.item.genres.includes("Comedy") ? 0.55 : 0) +
      (comedyTargetKeys.has(getCollectionCandidateKey(candidate)) ? 0.3 : 0),
  );

  const dramaTargetKeys = new Set(
    sources.drama.map(getCollectionCandidateKey),
  );
  const dramaCandidates = rankCandidates(
    [...sources.drama, ...qualityPool],
    (candidate) => {
      const hasDrama = candidate.item.genres.includes("Drama");
      const competingGenres = countGenres(candidate, DRAMA_DISTRACTOR_GENRES);

      return (
        hasDrama &&
        candidate.voteAverage >= 6.2 &&
        candidate.voteCount >= 80 &&
        competingGenres <= 1
      );
    },
    (candidate) => {
      const key = getCollectionCandidateKey(candidate);
      const competingPenalty =
        countGenres(candidate, DRAMA_DISTRACTOR_GENRES) * 0.48;

      return (
        qualityScore(candidate) +
        0.55 +
        (dramaTargetKeys.has(key) ? 0.35 : 0) -
        competingPenalty
      );
    },
  );

  const familyTargetKeys = new Set(
    sources.family.map(getCollectionCandidateKey),
  );
  const familyCandidates = rankCandidates(
    [...sources.family, ...qualityPool],
    (candidate) =>
      candidate.item.genres.includes("Family") &&
      candidate.voteAverage >= 6 &&
      candidate.voteCount >= 50,
    (candidate) =>
      qualityScore(candidate) +
      (candidate.item.genres.includes("Family") ? 0.65 : 0) +
      (familyTargetKeys.has(getCollectionCandidateKey(candidate)) ? 0.3 : 0),
  );

  const rows = allocateUniqueCollectionRows(
    [
      {
        key: "essentials",
        candidates: essentialsCandidates,
        limit: ESSENTIALS_RESERVOIR_LIMIT,
      },
      {
        key: "actionAdventureCrimeThriller",
        candidates: actionCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "comedy",
        candidates: comedyCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "drama",
        candidates: dramaCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "family",
        candidates: familyCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
    ] as const,
    usedKeys,
    isSuitableForPublicMovies,
  );

  return {
    trendingAndNowPlaying,
    essentials: rows.essentials,
    actionAdventureCrimeThriller: rows.actionAdventureCrimeThriller,
    comedy: rows.comedy,
    drama: rows.drama,
    family: rows.family,
  };
}

const collectionsCache = createStaleWhileRevalidateCache<MovieCollections>({
  freshDurationMs: 6 * 60 * 60 * 1000,
  staleDurationMs: 24 * 60 * 60 * 1000,
  label: "movie collections",
});

export function getMovieCollections(): Promise<MovieCollections> {
  return collectionsCache.get(buildMovieCollections);
}
