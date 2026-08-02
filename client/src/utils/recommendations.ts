import type { MediaItem } from "../types/media";
import type {
  RecommendationBasis,
  RecommendationCategory,
} from "../types/recommendations";

export function createMediaIdentity(item: {
  mediaType: "movie" | "tv";
  tmdbId: number;
}) {
  return `${item.mediaType}:${item.tmdbId}`;
}

export function excludeMediaItems(
  items: MediaItem[],
  excludedItems: Array<Pick<MediaItem, "mediaType" | "tmdbId">>,
) {
  const excludedKeys = new Set(excludedItems.map(createMediaIdentity));

  return items.filter((item) => !excludedKeys.has(createMediaIdentity(item)));
}

export function getRecommendationDescription(
  basis: RecommendationBasis,
) {
  if (basis === "preferences") {
    return "Picked from the interests you chose for your FilmGeezer account.";
  }

  if (basis === "watchlist") {
    return "Inspired by the titles currently saved in your Watchlist.";
  }

  return "Picked from your interests and the titles saved in your Watchlist.";
}

export function getRecommendationCategoryForMedia(
  media: Pick<MediaItem, "mediaType" | "genres" | "language">,
): RecommendationCategory {
  const genres = media.genres.map((genre) => genre.toLowerCase());
  const language = media.language.toUpperCase();

  if (language === "JA" && genres.includes("animation")) {
    return "anime";
  }

  if (language === "KO" && !genres.includes("animation")) {
    return "kdrama";
  }

  return media.mediaType;
}
