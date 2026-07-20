import type {
  FeaturedCharacter,
  FeaturedCharacters,
  FeaturedCharacterPresentation,
} from "../types/featuredCharacter.js";
import type {
  MediaDetails,
  MediaType,
} from "../types/media.js";
import {
  getTmdbFeaturedCreditCandidates,
  getTmdbMediaDetails,
} from "./tmdb.service.js";
import {
  getAniListFeaturedCharacters,
} from "./anilist.service.js";

const CACHE_DURATION_MS =
  24 * 60 * 60 * 1000;

interface CachedCharacters {
  expiresAt: number;
  data: FeaturedCharacters;
}

const characterCache =
  new Map<
    string,
    CachedCharacters
  >();

const pendingRequests =
  new Map<
    string,
    Promise<FeaturedCharacters>
  >();

function getPresentation(
  details: MediaDetails,
): FeaturedCharacterPresentation {
  const isAnimation =
    details.genres.includes(
      "Animation",
    );

  if (
    isAnimation &&
    details.language === "JA"
  ) {
    return "anime";
  }

  return isAnimation
    ? "animation"
    : "live-action";
}

function mapTmdbCharacters(
  details: MediaDetails,
  presentation:
    FeaturedCharacterPresentation,
  candidates:
    Awaited<
      ReturnType<
        typeof getTmdbFeaturedCreditCandidates
      >
    >,
): FeaturedCharacters {
  const usedCharacters =
    new Set<string>();

  const items: FeaturedCharacter[] =
    [];

  for (const candidate of candidates) {
    const characterKey =
      candidate.characterName
        .trim()
        .toLocaleLowerCase();

    if (
      usedCharacters.has(
        characterKey,
      )
    ) {
      continue;
    }

    usedCharacters.add(
      characterKey,
    );

    items.push({
      id:
        `tmdb:${candidate.personId}:` +
        characterKey,

      characterName:
        candidate.characterName,

      alternateName: "",

      /*
       * Voice performers are hidden
       * for Anime and animation.
       */
      performerName:
        presentation ===
        "live-action"
          ? candidate.performerName
          : "",

      /*
       * TMDB profile images represent
       * performers, not animated
       * characters. Do not use them
       * for animation.
       */
      imageUrl:
        presentation ===
        "live-action"
          ? candidate.profileUrl
          : "",

      role: "Featured",
      sourceUrl: "",
    });

    if (items.length >= 12) {
      break;
    }
  }

  return {
    presentation,
    source: "TMDB",
    matchedTitle: details.title,

    sourceNote:
      presentation ===
      "live-action"
        ? "Character roles and performer credits from TMDB."
        : "Character roles from TMDB. Voice-performer profiles are intentionally not shown.",

    items,
  };
}

async function buildFeaturedCharacters(
  mediaType: MediaType,
  tmdbId: number,
) {
  const [details, candidates] =
    await Promise.all([
      getTmdbMediaDetails(
        mediaType,
        tmdbId,
      ),

      getTmdbFeaturedCreditCandidates(
        mediaType,
        tmdbId,
      ),
    ]);

  const presentation =
    getPresentation(details);

  if (presentation === "anime") {
    try {
      const aniListResult =
        await getAniListFeaturedCharacters(
          details,
        );

      if (aniListResult) {
        return {
          presentation,
          source:
            "AniList" as const,

          matchedTitle:
            aniListResult.matchedTitle,

          sourceNote:
            "Character names and artwork from AniList. Voice actors are not displayed.",

          items:
            aniListResult.items,
        };
      }
    } catch (error) {
      /*
       * AniList is an enhancement.
       * Fall back to TMDB character
       * role names if it is unavailable
       * or rate limited.
       */
      console.warn(
        "AniList character lookup failed:",
        error,
      );
    }
  }

  return mapTmdbCharacters(
    details,
    presentation,
    candidates,
  );
}

export async function getFeaturedCharacters(
  mediaType: MediaType,
  tmdbId: number,
) {
  const cacheKey =
    `${mediaType}:${tmdbId}`;

  const now = Date.now();

  const cached =
    characterCache.get(
      cacheKey,
    );

  if (
    cached &&
    cached.expiresAt > now
  ) {
    return cached.data;
  }

  const pending =
    pendingRequests.get(
      cacheKey,
    );

  if (pending) {
    return pending;
  }

  const request =
    buildFeaturedCharacters(
      mediaType,
      tmdbId,
    );

  pendingRequests.set(
    cacheKey,
    request,
  );

  try {
    const data = await request;

    characterCache.set(
      cacheKey,
      {
        data,

        expiresAt:
          Date.now() +
          CACHE_DURATION_MS,
      },
    );

    return data;
  } finally {
    pendingRequests.delete(
      cacheKey,
    );
  }
}