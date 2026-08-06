import type { ObjectId } from "mongodb";

import { initializePreferencesStorage } from "../preferences/preferences.indexes.js";
import { getUserPreferences } from "../preferences/preferences.service.js";
import type {
  PreferenceGenre,
  UserPreferencesSnapshot,
} from "../preferences/preferences.types.js";
import { initializeWatchlistStorage } from "../watchlist/watchlist.indexes.js";
import { findWatchlistByUserId } from "../watchlist/watchlist.repository.js";
import type { WatchlistItemDocument } from "../watchlist/watchlist.types.js";

import type { MediaDetails, MediaItem } from "../../types/media.js";
import {
  getCategoryCandidateKey,
  isSuitableForPublicAnime,
  isSuitableForPublicKDrama,
} from "../../utils/categoryMedia.js";
import { getAnimeCollections } from "../../services/animeCollections.service.js";
import { getKDramaCollections } from "../../services/kDramaCollections.service.js";
import { getMovieCollections } from "../../services/movieCollections.service.js";
import {
  getTmdbRecommendationCandidates,
  getTmdbRecommendationProfileMedia,
  type TmdbRelatedMediaCandidate,
} from "../../services/tmdb.service.js";
import { getTvCollections } from "../../services/tvCollections.service.js";

import { RECOMMENDATION_POLICY } from "./recommendations.constants.js";
import { RecommendationsPersistenceError } from "./recommendations.errors.js";
import type {
  RecommendationBasis,
  RecommendationCategory,
  RecommendationProfileMedia,
  RecommendationResult,
} from "./recommendations.types.js";

interface RankedCandidate {
  item: MediaItem;
  score: number;
  signalScore: number;
  primaryGenre: string;
}

interface RecommendationSignalInputs {
  preferences: UserPreferencesSnapshot;
  preferenceSignalActive: boolean;
  watchlistEligible: boolean;
  watchlistItems: WatchlistItemDocument[];
  watchlistRevision: number;
}

interface RecommendationSignals extends RecommendationSignalInputs {
  preferenceSignalForCategory: boolean;
  watchlistSignalActive: boolean;
  profileMedia: RecommendationProfileMedia[];
}

interface CachedRecommendationResult {
  expiresAt: number;
  result: RecommendationResult;
}

const recommendationCache = new Map<string, CachedRecommendationResult>();
const pendingRecommendationRequests = new Map<
  string,
  Promise<RecommendationResult>
>();
const profileMediaCache = new Map<
  string,
  { expiresAt: number; items: RecommendationProfileMedia[] }
>();
const pendingProfileMediaRequests = new Map<
  string,
  Promise<RecommendationProfileMedia[]>
>();

const BLOCKED_RECOMMENDATION_TERMS = [
  "adult film",
  "adult animation",
  "erotic film",
  "erotic animation",
  "pornographic",
  "softcore",
  "hentai",
  "sexploitation",
] as const;

const GENRE_EQUIVALENTS: Record<string, readonly string[]> = {
  action: ["action", "action & adventure"],
  "action & adventure": ["action", "action & adventure", "adventure"],
  adventure: ["adventure", "action & adventure"],
  fantasy: ["fantasy", "sci-fi & fantasy"],
  "sci-fi & fantasy": ["sci-fi & fantasy", "science fiction", "fantasy"],
  "science fiction": ["science fiction", "sci-fi & fantasy"],
  war: ["war", "war & politics"],
  "war & politics": ["war", "war & politics"],
};

function createMediaKey(item: Pick<MediaItem, "mediaType" | "tmdbId">) {
  return `${item.mediaType}:${item.tmdbId}`;
}

function normalizeGenre(genre: string) {
  return genre.trim().toLowerCase();
}

function genresMatch(candidateGenre: string, preferenceGenre: string) {
  const normalizedCandidate = normalizeGenre(candidateGenre);
  const normalizedPreference = normalizeGenre(preferenceGenre);
  const equivalents = GENRE_EQUIVALENTS[normalizedPreference] ?? [normalizedPreference];

  return equivalents.includes(normalizedCandidate);
}

function candidateMatchesGenre(
  candidate: MediaItem,
  preferenceGenre: PreferenceGenre,
) {
  return candidate.genres.some((genre) =>
    genresMatch(genre, preferenceGenre),
  );
}

function getMediaCategory(media: Pick<MediaDetails, "mediaType" | "genres" | "language">): RecommendationCategory {
  const normalizedGenres = media.genres.map(normalizeGenre);
  const language = media.language.toUpperCase();

  if (language === "JA" && normalizedGenres.includes("animation")) {
    return "anime";
  }

  if (language === "KO" && !normalizedGenres.includes("animation")) {
    return "kdrama";
  }

  return media.mediaType;
}

function hasSpecificPreferenceSignal(preferences: UserPreferencesSnapshot) {
  if (!preferences.personalizationEnabled) {
    return false;
  }

  return (
    preferences.preferredGenres.length > 0 ||
    preferences.hiddenGenres.length > 0 ||
    preferences.preferredLanguages.length > 0
  );
}

async function readRecommendationSignalInputs(
  userId: ObjectId,
): Promise<RecommendationSignalInputs> {
  try {
    await Promise.all([
      initializePreferencesStorage(),
      initializeWatchlistStorage(),
    ]);

    const [preferences, watchlistDocument] = await Promise.all([
      getUserPreferences(userId),
      findWatchlistByUserId(userId),
    ]);

    const watchlistItems = (watchlistDocument?.items ?? [])
      .slice()
      .sort(
        (first, second) =>
          second.addedAt.getTime() - first.addedAt.getTime(),
      );

    return {
      preferences,
      preferenceSignalActive: hasSpecificPreferenceSignal(preferences),
      watchlistEligible:
        watchlistItems.length >=
        RECOMMENDATION_POLICY.minimumWatchlistItems,
      watchlistItems,
      watchlistRevision: watchlistDocument?.revision ?? 0,
    };
  } catch (error) {
    throw new RecommendationsPersistenceError(undefined, {
      cause: error,
    });
  }
}

async function buildRecommendationSignals(
  inputs: RecommendationSignalInputs,
  category: RecommendationCategory,
  profileCacheKey: string,
): Promise<RecommendationSignals> {
  const profileMedia = inputs.watchlistEligible
    ? await getCachedWatchlistProfileMedia(
        profileCacheKey,
        inputs.watchlistItems,
      )
    : [];

  return {
    ...inputs,
    preferenceSignalForCategory:
      inputs.preferenceSignalActive &&
      inputs.preferences.preferredCategories.includes(category),
    watchlistSignalActive:
      inputs.watchlistEligible && profileMedia.length > 0,
    profileMedia,
  };
}

async function loadWatchlistProfileMedia(
  watchlistItems: WatchlistItemDocument[],
): Promise<RecommendationProfileMedia[]> {
  const itemsToResolve = watchlistItems.slice(
    0,
    RECOMMENDATION_POLICY.maximumWatchlistProfileItems,
  );

  const resolved = await Promise.allSettled(
    itemsToResolve.map((item) =>
      getTmdbRecommendationProfileMedia(item.mediaType, item.tmdbId),
    ),
  );

  return resolved.flatMap((result, index) => {
    if (result.status !== "fulfilled") {
      return [];
    }

    const media = result.value;

    return [
      {
        tmdbId: media.tmdbId,
        mediaType: media.mediaType,
        genres: media.genres,
        language: media.language,
        category: getMediaCategory(media),
        recencyWeight: Math.max(0.5, 1 - index * 0.07),
      },
    ];
  });
}

function pruneProfileMediaCache(now: number) {
  for (const [key, value] of profileMediaCache.entries()) {
    if (value.expiresAt <= now) {
      profileMediaCache.delete(key);
    }
  }

  while (
    profileMediaCache.size >= RECOMMENDATION_POLICY.maximumCacheEntries
  ) {
    const firstKey = profileMediaCache.keys().next().value as
      | string
      | undefined;

    if (!firstKey) {
      break;
    }

    profileMediaCache.delete(firstKey);
  }
}

async function getCachedWatchlistProfileMedia(
  cacheKey: string,
  watchlistItems: WatchlistItemDocument[],
): Promise<RecommendationProfileMedia[]> {
  const now = Date.now();
  const cached = profileMediaCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.items;
  }

  const pending = pendingProfileMediaRequests.get(cacheKey);

  if (pending) {
    return pending;
  }

  const request = loadWatchlistProfileMedia(watchlistItems);
  pendingProfileMediaRequests.set(cacheKey, request);

  try {
    const items = await request;
    pruneProfileMediaCache(now);
    profileMediaCache.set(cacheKey, {
      expiresAt: now + RECOMMENDATION_POLICY.cacheDurationMilliseconds,
      items,
    });

    return items;
  } finally {
    pendingProfileMediaRequests.delete(cacheKey);
  }
}

function getRecommendationBasis(signals: RecommendationSignals): RecommendationBasis | null {
  if (
    signals.preferenceSignalForCategory &&
    signals.watchlistSignalActive
  ) {
    return "combined";
  }

  if (signals.preferenceSignalForCategory) {
    return "preferences";
  }

  if (signals.watchlistSignalActive) {
    return "watchlist";
  }

  return null;
}

async function getCuratedCategoryPool(category: RecommendationCategory): Promise<{
  trendingKeys: Set<string>;
  items: MediaItem[];
}> {
  if (category === "movie") {
    const collections = await getMovieCollections();

    return {
      trendingKeys: new Set(collections.trendingAndNowPlaying.map(createMediaKey)),
      items: [
        ...collections.essentials,
        ...collections.actionAdventureCrimeThriller,
        ...collections.comedy,
        ...collections.drama,
        ...collections.family,
      ],
    };
  }

  if (category === "tv") {
    const collections = await getTvCollections();

    return {
      trendingKeys: new Set(
        collections.trendingAndCurrentlyAiring.map(createMediaKey),
      ),
      items: [
        ...collections.essentials,
        ...collections.actionCrimeThriller,
        ...collections.comedyDrama,
        ...collections.mysteryScienceFiction,
      ],
    };
  }

  if (category === "anime") {
    const collections = await getAnimeCollections();

    return {
      trendingKeys: new Set(collections.trendingAnime.map(createMediaKey)),
      items: [
        ...collections.essentials,
        ...collections.actionAdventureThriller,
        ...collections.fantasyMysteryScienceFiction,
        ...collections.romanceDramaComedy,
        ...collections.sports,
      ],
    };
  }

  const collections = await getKDramaCollections();

  return {
    trendingKeys: new Set(collections.trendingKDramas.map(createMediaKey)),
    items: [
      ...collections.essentials,
      ...collections.romance,
      ...collections.actionCrimeThriller,
      ...collections.mysterySuspense,
      ...collections.comedyFeelGood,
    ],
  };
}

function isRelatedCandidateInCategory(
  candidate: TmdbRelatedMediaCandidate,
  category: RecommendationCategory,
) {
  if (
    candidate.isAdult ||
    candidate.isVideo ||
    !candidate.hasPoster
  ) {
    return false;
  }

  if (category === "anime") {
    return isSuitableForPublicAnime(candidate);
  }

  if (category === "kdrama") {
    return isSuitableForPublicKDrama(candidate);
  }

  if (candidate.item.mediaType !== category) {
    return false;
  }

  return (
    !isSuitableForPublicAnime(candidate) &&
    !isSuitableForPublicKDrama(candidate)
  );
}

async function getWatchlistSeedCandidates(
  category: RecommendationCategory,
  profileMedia: RecommendationProfileMedia[],
): Promise<TmdbRelatedMediaCandidate[]> {
  const matchingSeeds = profileMedia
    .filter((media) => media.category === category)
    .slice(0, RECOMMENDATION_POLICY.maximumRelatedSeedsPerCategory);

  if (matchingSeeds.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    matchingSeeds.map((seed) =>
      getTmdbRecommendationCandidates(seed.mediaType, seed.tmdbId),
    ),
  );

  return results.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value.filter((candidate) =>
          isRelatedCandidateInCategory(candidate, category),
        )
      : [],
  );
}

function hasBlockedRecommendationText(item: MediaItem) {
  const searchableText = `${item.title} ${item.overview}`.toLowerCase();

  return BLOCKED_RECOMMENDATION_TERMS.some((term) =>
    searchableText.includes(term),
  );
}

function calculateQualityScore(item: MediaItem) {
  const voteCount = item.voteCount ?? 0;
  const popularity = item.popularity ?? 0;
  const confidenceTarget = item.mediaType === "movie" ? 500 : 300;
  const voteConfidence = voteCount / (voteCount + confidenceTarget);
  const weightedRating =
    voteConfidence * item.rating + (1 - voteConfidence) * 6.2;

  return (
    weightedRating +
    Math.log10(voteCount + 1) * 0.22 +
    Math.log10(popularity + 1) * 0.2
  );
}

function buildWatchlistAffinity(profileMedia: RecommendationProfileMedia[]) {
  const genreWeights = new Map<string, number>();
  const languageWeights = new Map<string, number>();

  for (const media of profileMedia) {
    for (const genre of media.genres) {
      const key = normalizeGenre(genre);
      genreWeights.set(
        key,
        (genreWeights.get(key) ?? 0) + media.recencyWeight,
      );
    }

    const language = media.language.toLowerCase();
    languageWeights.set(
      language,
      (languageWeights.get(language) ?? 0) + media.recencyWeight,
    );
  }

  return { genreWeights, languageWeights };
}

function calculatePreferenceScore(
  item: MediaItem,
  preferences: UserPreferencesSnapshot,
  enabledForCategory: boolean,
) {
  if (!enabledForCategory) {
    return 0;
  }

  const preferredGenreMatches = preferences.preferredGenres.filter((genre) =>
    candidateMatchesGenre(item, genre),
  ).length;

  const hiddenGenreMatches = preferences.hiddenGenres.filter((genre) =>
    candidateMatchesGenre(item, genre),
  ).length;

  const languageMatch = preferences.preferredLanguages.some(
    (language) => language === item.language.toLowerCase(),
  );

  return (
    preferredGenreMatches * 3.2 +
    (languageMatch ? 2.4 : 0) -
    hiddenGenreMatches * 3.5
  );
}

function calculateWatchlistScore(
  item: MediaItem,
  affinity: ReturnType<typeof buildWatchlistAffinity>,
  enabled: boolean,
) {
  if (!enabled) {
    return 0;
  }

  const genreScore = item.genres.reduce(
    (score, genre) => score + (affinity.genreWeights.get(normalizeGenre(genre)) ?? 0),
    0,
  );

  const languageScore =
    affinity.languageWeights.get(item.language.toLowerCase()) ?? 0;

  return Math.min(genreScore, 5) * 0.42 + Math.min(languageScore, 3) * 0.34;
}

function buildSeedBoosts(candidates: TmdbRelatedMediaCandidate[]) {
  const boosts = new Map<string, number>();
  const candidateItems = new Map<string, MediaItem>();

  for (const candidate of candidates) {
    const key = getCategoryCandidateKey(candidate);
    const orderBoost = Math.max(0.2, 1.25 - candidate.sourceOrder * 0.035);
    const nextBoost = (boosts.get(key) ?? 0) + orderBoost;

    boosts.set(key, Math.min(nextBoost, 3.2));
    candidateItems.set(key, candidate.item);
  }

  return { boosts, candidateItems };
}

function selectDiverseCandidates(candidates: RankedCandidate[]) {
  const remaining = [...candidates];
  const selected: MediaItem[] = [];
  const primaryGenreCounts = new Map<string, number>();
  const languageCounts = new Map<string, number>();

  while (
    remaining.length > 0 &&
    selected.length < RECOMMENDATION_POLICY.maximumResults
  ) {
    let bestIndex = 0;
    let bestAdjustedScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < remaining.length; index += 1) {
      const candidate = remaining[index];
      const genrePenalty =
        (primaryGenreCounts.get(candidate.primaryGenre) ?? 0) * 0.16;
      const languagePenalty =
        (languageCounts.get(candidate.item.language) ?? 0) * 0.035;
      const adjustedScore = candidate.score - genrePenalty - languagePenalty;

      if (adjustedScore > bestAdjustedScore) {
        bestAdjustedScore = adjustedScore;
        bestIndex = index;
      }
    }

    const [selectedCandidate] = remaining.splice(bestIndex, 1);
    selected.push(selectedCandidate.item);
    primaryGenreCounts.set(
      selectedCandidate.primaryGenre,
      (primaryGenreCounts.get(selectedCandidate.primaryGenre) ?? 0) + 1,
    );
    languageCounts.set(
      selectedCandidate.item.language,
      (languageCounts.get(selectedCandidate.item.language) ?? 0) + 1,
    );
  }

  return selected;
}

function pruneRecommendationCache(now: number) {
  for (const [key, value] of recommendationCache.entries()) {
    if (value.expiresAt <= now) {
      recommendationCache.delete(key);
    }
  }

  while (
    recommendationCache.size >= RECOMMENDATION_POLICY.maximumCacheEntries
  ) {
    const firstKey = recommendationCache.keys().next().value as string | undefined;

    if (!firstKey) {
      break;
    }

    recommendationCache.delete(firstKey);
  }
}

async function buildRecommendations(
  category: RecommendationCategory,
  signals: RecommendationSignals,
): Promise<RecommendationResult> {
  const basis = getRecommendationBasis(signals);

  if (!basis) {
    return {
      available: false,
      basis: null,
      minimumResults: RECOMMENDATION_POLICY.minimumResults,
      results: [],
    };
  }

  const [{ trendingKeys, items: curatedItems }, seedCandidates] =
    await Promise.all([
      getCuratedCategoryPool(category),
      signals.watchlistSignalActive
        ? getWatchlistSeedCandidates(category, signals.profileMedia)
        : Promise.resolve([]),
    ]);

  const watchlistKeys = new Set(signals.watchlistItems.map(createMediaKey));
  const affinity = buildWatchlistAffinity(signals.profileMedia);
  const { boosts: seedBoosts, candidateItems: seedItems } =
    buildSeedBoosts(seedCandidates);

  const candidateItems = new Map<string, MediaItem>();

  for (const item of curatedItems) {
    candidateItems.set(createMediaKey(item), item);
  }

  for (const [key, item] of seedItems.entries()) {
    candidateItems.set(key, item);
  }

  const hasPositivePreferenceTargets =
    signals.preferences.preferredGenres.length > 0 ||
    signals.preferences.preferredLanguages.length > 0;

  const ranked = Array.from(candidateItems.entries())
    .filter(([key, item]) => {
      if (trendingKeys.has(key) || watchlistKeys.has(key)) {
        return false;
      }

      return (
        item.posterUrl.length > 0 &&
        !hasBlockedRecommendationText(item) &&
        item.rating >= 5 &&
        (item.voteCount ?? 0) >= (item.mediaType === "movie" ? 10 : 5)
      );
    })
    .map(([key, item]): RankedCandidate => {
      const preferenceScore = calculatePreferenceScore(
        item,
        signals.preferences,
        signals.preferenceSignalForCategory,
      );
      const watchlistScore = calculateWatchlistScore(
        item,
        affinity,
        signals.watchlistSignalActive,
      );
      const seedScore = seedBoosts.get(key) ?? 0;

      return {
        item,
        primaryGenre: normalizeGenre(item.genres[0] ?? "other"),
        signalScore: preferenceScore + watchlistScore + seedScore,
        score:
          calculateQualityScore(item) +
          preferenceScore +
          watchlistScore +
          seedScore,
      };
    })
    .filter((candidate) => {
      if (basis === "preferences") {
        return hasPositivePreferenceTargets
          ? candidate.signalScore > 0
          : candidate.signalScore >= 0;
      }

      return candidate.signalScore > 0;
    })
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return createMediaKey(first.item).localeCompare(createMediaKey(second.item));
    });

  const results = selectDiverseCandidates(ranked);

  if (results.length < RECOMMENDATION_POLICY.minimumResults) {
    return {
      available: false,
      basis,
      minimumResults: RECOMMENDATION_POLICY.minimumResults,
      results: [],
    };
  }

  return {
    available: true,
    basis,
    minimumResults: RECOMMENDATION_POLICY.minimumResults,
    results,
  };
}

export async function getPersonalRecommendations(
  userId: ObjectId,
  category: RecommendationCategory,
): Promise<RecommendationResult> {
  const inputs = await readRecommendationSignalInputs(userId);
  const profileCacheKey = [
    userId.toHexString(),
    inputs.watchlistRevision,
  ].join(":");
  const cacheKey = [
    userId.toHexString(),
    category,
    inputs.preferences.revision,
    inputs.watchlistRevision,
  ].join(":");
  const now = Date.now();
  const cached = recommendationCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.result;
  }

  const pending = pendingRecommendationRequests.get(cacheKey);

  if (pending) {
    return pending;
  }

  const request = buildRecommendationSignals(
    inputs,
    category,
    profileCacheKey,
  ).then((signals) => buildRecommendations(category, signals));
  pendingRecommendationRequests.set(cacheKey, request);

  try {
    const result = await request;
    pruneRecommendationCache(now);
    recommendationCache.set(cacheKey, {
      expiresAt: now + RECOMMENDATION_POLICY.cacheDurationMilliseconds,
      result,
    });

    return result;
  } finally {
    pendingRecommendationRequests.delete(cacheKey);
  }
}
