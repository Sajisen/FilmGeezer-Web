import type { MediaItem } from "../types/media.js";

export interface CategoryMediaCandidate {
  item: MediaItem;
  isAdult: boolean;
  isVideo: boolean;
  hasPoster: boolean;
  originCountries: string[];
}

const ANIMATION_GENRE = "Animation";

const BLOCKED_K_DRAMA_GENRES = [
  "Animation",
  "Documentary",
  "News",
  "Reality",
  "Talk",
  "TV Movie",
];

const BLOCKED_ANIME_TERMS = [
  "hentai",
  "ecchi",
  "adult animation",
  "erotic animation",
  "pornographic animation",
  "animated pornography",
];

const BLOCKED_K_DRAMA_TERMS = [
  "adult film",
  "erotic film",
  "pornographic",
  "softcore",
  "sexploitation",
];

export function getCategoryCandidateKey(
  candidate: CategoryMediaCandidate,
) {
  return `${candidate.item.mediaType}:${candidate.item.tmdbId}`;
}

function getSearchableText(
  candidate: CategoryMediaCandidate,
) {
  return `${candidate.item.title} ${candidate.item.overview}`.toLowerCase();
}

function hasExpectedOrigin(
  candidate: CategoryMediaCandidate,
  countryCode: string,
) {
  return (
    candidate.originCountries.length === 0 ||
    candidate.originCountries.includes(
      countryCode,
    )
  );
}

export function isSuitableForPublicAnime(
  candidate: CategoryMediaCandidate,
) {
  const searchableText =
    getSearchableText(candidate);

  return (
    !candidate.isAdult &&
    !candidate.isVideo &&
    candidate.hasPoster &&
    candidate.item.language === "JA" &&
    candidate.item.genres.includes(
      ANIMATION_GENRE,
    ) &&
    hasExpectedOrigin(
      candidate,
      "JP",
    ) &&
    !BLOCKED_ANIME_TERMS.some(
      (term) =>
        searchableText.includes(term),
    )
  );
}

export function isSuitableForPublicKDrama(
  candidate: CategoryMediaCandidate,
) {
  const searchableText =
    getSearchableText(candidate);

  return (
    !candidate.isAdult &&
    !candidate.isVideo &&
    candidate.hasPoster &&
    candidate.item.language === "KO" &&
    hasExpectedOrigin(
      candidate,
      "KR",
    ) &&
    !candidate.item.genres.some(
      (genre) =>
        BLOCKED_K_DRAMA_GENRES.includes(
          genre,
        ),
    ) &&
    !BLOCKED_K_DRAMA_TERMS.some(
      (term) =>
        searchableText.includes(term),
    )
  );
}