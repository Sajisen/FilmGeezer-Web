import type { MediaItem } from '../types/media.js'
import {
  getTmdbMovieCollectionSources,
  type TmdbMovieCollectionCandidate,
} from './tmdb.service.js'

export interface MovieCollections {
  trendingAndNowPlaying: MediaItem[]
  essentials: MediaItem[]

  actionAdventureCrimeThriller:
    MediaItem[]

  comedy: MediaItem[]
  dramaRomance: MediaItem[]
  family: MediaItem[]
}

const CURRENT_ROW_LIMIT = 30
const ESSENTIALS_ROW_LIMIT = 20
const GENRE_ROW_LIMIT = 16

const CACHE_DURATION_MS =
  30 * 60 * 1000

const ANIMATION_GENRE = 'Animation'

const blockedDiscoveryTerms = [
  'adult film',
  'erotic film',
  'pornographic',
  'softcore',
]

function getCandidateKey(
  candidate: TmdbMovieCollectionCandidate,
) {
  return `${candidate.item.mediaType}:${candidate.item.tmdbId}`
}

function isAnime(
  candidate: TmdbMovieCollectionCandidate,
) {
  return (
    candidate.item.language === 'JA' &&
    candidate.item.genres.includes(
      ANIMATION_GENRE,
    )
  )
}

function isSuitableForPublicMovies(
  candidate: TmdbMovieCollectionCandidate,
) {
  const searchableText =
    `${candidate.item.title} ${candidate.item.overview}`.toLowerCase()

  return (
    !candidate.isAdult &&
    !candidate.isVideo &&
    candidate.hasPoster &&
    !isAnime(candidate) &&
    !blockedDiscoveryTerms.some(
      (term) =>
        searchableText.includes(term),
    )
  )
}

function interleaveCandidates(
  firstCandidates:
    TmdbMovieCollectionCandidate[],

  secondCandidates:
    TmdbMovieCollectionCandidate[],
) {
  const combinedCandidates:
    TmdbMovieCollectionCandidate[] = []

  const longestLength = Math.max(
    firstCandidates.length,
    secondCandidates.length,
  )

  for (
    let index = 0;
    index < longestLength;
    index += 1
  ) {
    const firstCandidate =
      firstCandidates[index]

    const secondCandidate =
      secondCandidates[index]

    if (firstCandidate) {
      combinedCandidates.push(
        firstCandidate,
      )
    }

    if (secondCandidate) {
      combinedCandidates.push(
        secondCandidate,
      )
    }
  }

  return combinedCandidates
}

function removeDuplicateCandidates(
  candidates:
    TmdbMovieCollectionCandidate[],
) {
  const seenKeys = new Set<string>()

  return candidates.filter(
    (candidate) => {
      const candidateKey =
        getCandidateKey(candidate)

      if (seenKeys.has(candidateKey)) {
        return false
      }

      seenKeys.add(candidateKey)
      return true
    },
  )
}

function calculateQualityScore(
  candidate: TmdbMovieCollectionCandidate,
) {
  const globalAverageRating = 6.5
  const confidenceVotes = 1500

  const voteConfidence =
    candidate.voteCount /
    (candidate.voteCount +
      confidenceVotes)

  const weightedRating =
    voteConfidence *
      candidate.voteAverage +
    (1 - voteConfidence) *
      globalAverageRating

  const popularityBoost =
    Math.log10(
      candidate.popularity + 1,
    ) * 0.35

  const voteCountBoost =
    Math.log10(
      candidate.voteCount + 1,
    ) * 0.2

  const imageBoost =
    candidate.hasBackdrop ? 0.1 : 0

  return (
    weightedRating +
    popularityBoost +
    voteCountBoost +
    imageBoost
  )
}

function countMatchingGenres(
  candidate:
    TmdbMovieCollectionCandidate,

  genres: string[],
) {
  return genres.filter((genre) =>
    candidate.item.genres.includes(
      genre,
    ),
  ).length
}

function calculateGenreScore(
  candidate:
    TmdbMovieCollectionCandidate,

  genres: string[],
) {
  const genreRelevanceBoost =
    countMatchingGenres(
      candidate,
      genres,
    ) * 0.08

  return (
    calculateQualityScore(candidate) +
    genreRelevanceBoost
  )
}

function buildGenreCandidates(
  qualityPool:
    TmdbMovieCollectionCandidate[],

  fallbackCandidates:
    TmdbMovieCollectionCandidate[],

  genres: string[],
  minVoteAverage: number,
  minVoteCount: number,
) {
  return removeDuplicateCandidates([
    ...qualityPool.filter(
      (candidate) =>
        candidate.item.genres.some(
          (genre) =>
            genres.includes(genre),
        ),
    ),

    ...fallbackCandidates,
  ])
    .filter(
      (candidate) =>
        candidate.voteAverage >=
          minVoteAverage &&
        candidate.voteCount >=
          minVoteCount,
    )
    .sort(
      (
        firstCandidate,
        secondCandidate,
      ) =>
        calculateGenreScore(
          secondCandidate,
          genres,
        ) -
        calculateGenreScore(
          firstCandidate,
          genres,
        ),
    )
}

function takeUniqueMedia(
  candidates:
    TmdbMovieCollectionCandidate[],

  usedMediaKeys: Set<string>,
  limit: number,
) {
  const items: MediaItem[] = []

  for (const candidate of candidates) {
    const candidateKey =
      getCandidateKey(candidate)

    if (
      usedMediaKeys.has(candidateKey) ||
      !isSuitableForPublicMovies(
        candidate,
      )
    ) {
      continue
    }

    usedMediaKeys.add(candidateKey)
    items.push(candidate.item)

    if (items.length === limit) {
      break
    }
  }

  return items
}

let cachedCollections:
  | {
      expiresAt: number
      data: MovieCollections
    }
  | null = null

let pendingCollectionsRequest:
  | Promise<MovieCollections>
  | null = null

async function buildMovieCollections(): Promise<MovieCollections> {
  const sources =
    await getTmdbMovieCollectionSources()

  const usedMediaKeys =
    new Set<string>()

  const trendingAndNowPlaying =
    takeUniqueMedia(
      interleaveCandidates(
        sources.trending,
        sources.nowPlaying,
      ),
      usedMediaKeys,
      CURRENT_ROW_LIMIT,
    )

  const qualityPool =
    removeDuplicateCandidates([
      ...sources.popularQuality,
      ...sources.mostVoted,
      ...sources.highlyRated,
    ])

  const essentialsCandidates =
    qualityPool
      .filter(
        (candidate) =>
          candidate.voteCount >= 1000 &&
          candidate.voteAverage >= 6.5,
      )
      .sort(
        (
          firstCandidate,
          secondCandidate,
        ) =>
          calculateQualityScore(
            secondCandidate,
          ) -
          calculateQualityScore(
            firstCandidate,
          ),
      )

  const essentials = takeUniqueMedia(
    essentialsCandidates,
    usedMediaKeys,
    ESSENTIALS_ROW_LIMIT,
  )

  const actionAdventureCrimeThriller =
  takeUniqueMedia(
    buildGenreCandidates(
      qualityPool,

      sources
        .actionAdventureCrimeThriller,

      [
        'Action',
        'Adventure',
        'Crime',
        'Thriller',
      ],

      6.2,
      300,
    ),

    usedMediaKeys,
    GENRE_ROW_LIMIT,
  )

const comedy = takeUniqueMedia(
  buildGenreCandidates(
    qualityPool,
    sources.comedy,
    ['Comedy'],
    6.2,
    250,
  ),

  usedMediaKeys,
  GENRE_ROW_LIMIT,
)

const dramaRomance = takeUniqueMedia(
  buildGenreCandidates(
    qualityPool,
    sources.dramaRomance,
    ['Drama', 'Romance'],
    6.5,
    250,
  ),

  usedMediaKeys,
  GENRE_ROW_LIMIT,
)

const family = takeUniqueMedia(
  buildGenreCandidates(
    qualityPool,
    sources.family,
    ['Family'],
    6.2,
    150,
  ),

  usedMediaKeys,
  GENRE_ROW_LIMIT,
)

  return {
  trendingAndNowPlaying,
  essentials,
  actionAdventureCrimeThriller,
  comedy,
  dramaRomance,
  family,
}
}

export async function getMovieCollections(): Promise<MovieCollections> {
  const now = Date.now()

  if (
    cachedCollections &&
    cachedCollections.expiresAt > now
  ) {
    return cachedCollections.data
  }

  if (pendingCollectionsRequest) {
    return pendingCollectionsRequest
  }

  pendingCollectionsRequest =
    buildMovieCollections()

  try {
    const data =
      await pendingCollectionsRequest

    cachedCollections = {
      data,
      expiresAt:
        Date.now() +
        CACHE_DURATION_MS,
    }

    return data
  } finally {
    pendingCollectionsRequest = null
  }
}