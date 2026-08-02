import { createStaleWhileRevalidateCache } from "../utils/staleWhileRevalidateCache.js";
import type { MediaItem } from "../types/media.js";
import {
  allocateUniqueCollectionRows,
  calculateCollectionQualityScore,
  getCollectionCandidateKey,
  interleaveCollectionCandidateGroups,
  removeDuplicateCollectionCandidates,
} from "../utils/collectionRanking.js";
import { isSuitableForPublicAnime } from "../utils/categoryMedia.js";
import {
  getTmdbAnimePrimarySources,
  type TmdbAnimeCollectionCandidate,
} from "./tmdb.service.js";

export interface AnimeCollections {
  trendingAnime: MediaItem[];
  essentials: MediaItem[];
  actionAdventureThriller: MediaItem[];
  fantasyMysteryScienceFiction: MediaItem[];
  romanceDramaComedy: MediaItem[];
  sports: MediaItem[];
}

const TRENDING_ROW_LIMIT = 24;
const ESSENTIALS_RESERVOIR_LIMIT = 44;
const GENRE_RESERVOIR_LIMIT = 40;

const ACTION_MOVIE_GENRES = ["Action", "Adventure", "Thriller"];
const ACTION_TV_GENRES = ["Action & Adventure"];
const FANTASY_MOVIE_GENRES = ["Fantasy", "Mystery", "Science Fiction"];
const FANTASY_TV_GENRES = ["Mystery", "Sci-Fi & Fantasy"];
const ROMANCE_DRAMA_COMEDY_GENRES = ["Romance", "Drama", "Comedy"];
const HEAVY_ANIME_GENRES = [
  "Action",
  "Adventure",
  "Thriller",
  "Action & Adventure",
  "Mystery",
  "Science Fiction",
  "Sci-Fi & Fantasy",
];

function qualityScore(candidate: TmdbAnimeCollectionCandidate) {
  const confidenceVotes = candidate.item.mediaType === "movie" ? 220 : 180;
  return calculateCollectionQualityScore(candidate, confidenceVotes, 6.5);
}

function getTargetGenres(
  candidate: TmdbAnimeCollectionCandidate,
  movieGenres: readonly string[],
  tvGenres: readonly string[],
) {
  return candidate.item.mediaType === "movie" ? movieGenres : tvGenres;
}

function countTargetGenres(
  candidate: TmdbAnimeCollectionCandidate,
  movieGenres: readonly string[],
  tvGenres: readonly string[],
) {
  return getTargetGenres(candidate, movieGenres, tvGenres).filter((genre) =>
    candidate.item.genres.includes(genre),
  ).length;
}

function countGenres(
  candidate: TmdbAnimeCollectionCandidate,
  genres: readonly string[],
) {
  return genres.filter((genre) => candidate.item.genres.includes(genre)).length;
}

function rankCandidates(
  candidates: TmdbAnimeCollectionCandidate[],
  predicate: (candidate: TmdbAnimeCollectionCandidate) => boolean,
  score: (candidate: TmdbAnimeCollectionCandidate) => number,
) {
  return removeDuplicateCollectionCandidates(candidates)
    .filter((candidate) => isSuitableForPublicAnime(candidate) && predicate(candidate))
    .sort((first, second) => score(second) - score(first));
}

function takeTrending(
  candidates: TmdbAnimeCollectionCandidate[],
  usedKeys: Set<string>,
) {
  const items: MediaItem[] = [];

  for (const candidate of removeDuplicateCollectionCandidates(candidates)) {
    const key = getCollectionCandidateKey(candidate);

    if (usedKeys.has(key) || !isSuitableForPublicAnime(candidate)) {
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


async function buildAnimeCollections(): Promise<AnimeCollections> {
  const sources = await getTmdbAnimePrimarySources();
  const usedKeys = new Set<string>();

  const trendingAnime = takeTrending(
    [
      ...interleaveCollectionCandidateGroups([
        sources.trendingTv,
        sources.trendingMovies,
      ]),
      ...interleaveCollectionCandidateGroups([
        sources.popularTv,
        sources.popularMovies,
      ]),
    ],
    usedKeys,
  );

  const qualityPool = removeDuplicateCollectionCandidates([
    ...sources.mostVotedTv,
    ...sources.popularTv,
    ...sources.mostVotedMovies,
    ...sources.popularMovies,
  ]).filter(isSuitableForPublicAnime);

  const essentialsCandidates = rankCandidates(
    qualityPool,
    (candidate) =>
      candidate.voteAverage >= 6.8 &&
      candidate.voteCount >= (candidate.item.mediaType === "movie" ? 60 : 55),
    qualityScore,
  );

  const actionCandidates = rankCandidates(
    qualityPool,
    (candidate) =>
      countTargetGenres(
        candidate,
        ACTION_MOVIE_GENRES,
        ACTION_TV_GENRES,
      ) > 0 &&
      candidate.voteAverage >= 6.2 &&
      candidate.voteCount >= 20,
    (candidate) =>
      qualityScore(candidate) +
      countTargetGenres(candidate, ACTION_MOVIE_GENRES, ACTION_TV_GENRES) *
        0.5,
  );

  const fantasyCandidates = rankCandidates(
    qualityPool,
    (candidate) =>
      countTargetGenres(
        candidate,
        FANTASY_MOVIE_GENRES,
        FANTASY_TV_GENRES,
      ) > 0 &&
      candidate.voteAverage >= 6.3 &&
      candidate.voteCount >= 20,
    (candidate) =>
      qualityScore(candidate) +
      countTargetGenres(candidate, FANTASY_MOVIE_GENRES, FANTASY_TV_GENRES) *
        0.48,
  );

  const romanceTargetKeys = new Set(
    [...sources.romanceKeywordMovies, ...sources.romanceKeywordTv].map(
      getCollectionCandidateKey,
    ),
  );
  const romanceDramaComedyCandidates = rankCandidates(
    [
      ...sources.romanceKeywordTv,
      ...sources.romanceKeywordMovies,
      ...qualityPool,
    ],
    (candidate) => {
      const matches = countGenres(candidate, ROMANCE_DRAMA_COMEDY_GENRES);
      const hasRomance = candidate.item.genres.includes("Romance");
      const hasComedy = candidate.item.genres.includes("Comedy");
      const heavyCount = countGenres(candidate, HEAVY_ANIME_GENRES);

      return (
        matches > 0 &&
        candidate.voteAverage >= 6.2 &&
        candidate.voteCount >= 15 &&
        (hasRomance ||
          (hasComedy && heavyCount <= 2) ||
          (candidate.item.genres.includes("Drama") && heavyCount <= 1))
      );
    },
    (candidate) => {
      const romanceBoost = candidate.item.genres.includes("Romance") ? 0.95 : 0;
      const comedyBoost = candidate.item.genres.includes("Comedy") ? 0.72 : 0;
      const dramaBoost = candidate.item.genres.includes("Drama") ? 0.3 : 0;
      const targetedBoost = romanceTargetKeys.has(
        getCollectionCandidateKey(candidate),
      )
        ? 0.65
        : 0;
      const heavyPenalty = countGenres(candidate, HEAVY_ANIME_GENRES) * 0.28;

      return (
        qualityScore(candidate) +
        romanceBoost +
        comedyBoost +
        dramaBoost +
        targetedBoost -
        heavyPenalty
      );
    },
  );

  const sportsTargeted = removeDuplicateCollectionCandidates([
    ...sources.sportsKeywordTv,
    ...sources.sportsKeywordMovies,
  ]);
  const sportsTargetKeys = new Set(sportsTargeted.map(getCollectionCandidateKey));
  const sportsCandidates = rankCandidates(
    sportsTargeted,
    (candidate) =>
      candidate.voteAverage >= 6.2 && candidate.voteCount >= 10,
    (candidate) =>
      qualityScore(candidate) +
      (sportsTargetKeys.has(getCollectionCandidateKey(candidate)) ? 1.2 : 0),
  );

  const rows = allocateUniqueCollectionRows(
    [
      {
        key: "essentials",
        candidates: essentialsCandidates,
        limit: ESSENTIALS_RESERVOIR_LIMIT,
      },
      {
        key: "actionAdventureThriller",
        candidates: actionCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "fantasyMysteryScienceFiction",
        candidates: fantasyCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "romanceDramaComedy",
        candidates: romanceDramaComedyCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
      {
        key: "sports",
        candidates: sportsCandidates,
        limit: GENRE_RESERVOIR_LIMIT,
      },
    ] as const,
    usedKeys,
    isSuitableForPublicAnime,
  );

  return {
    trendingAnime,
    essentials: rows.essentials,
    actionAdventureThriller: rows.actionAdventureThriller,
    fantasyMysteryScienceFiction: rows.fantasyMysteryScienceFiction,
    romanceDramaComedy: rows.romanceDramaComedy,
    sports: rows.sports,
  };
}

const collectionsCache = createStaleWhileRevalidateCache<AnimeCollections>({
  freshDurationMs: 6 * 60 * 60 * 1000,
  staleDurationMs: 24 * 60 * 60 * 1000,
  label: "anime collections",
});

export function getAnimeCollections(): Promise<AnimeCollections> {
  return collectionsCache.get(buildAnimeCollections);
}
