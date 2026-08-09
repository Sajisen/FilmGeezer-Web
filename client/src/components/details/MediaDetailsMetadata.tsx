import { useMemo } from "react";

import {
  MEDIA_STRUCTURED_DATA_ID,
  PUBLIC_SITE_ORIGIN,
  SOCIAL_IMAGE_URL,
  buildCanonicalUrl,
} from "../navigation/documentMetadata";
import {
  useDocumentMetadataOverride,
  type DocumentMetadataOverride,
} from "../../features/metadata/documentMetadataContext";
import type { MediaDetails } from "../../types/media";

const MAX_DESCRIPTION_LENGTH = 158;

function normalizeDescription(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function truncateDescription(value: string): string {
  if (value.length <= MAX_DESCRIPTION_LENGTH) {
    return value;
  }

  const candidate = value.slice(0, MAX_DESCRIPTION_LENGTH - 1);
  const lastSpace = candidate.lastIndexOf(" ");
  const safeCandidate =
    lastSpace >= 100 ? candidate.slice(0, lastSpace) : candidate;

  return `${safeCandidate.trimEnd()}…`;
}

function buildDescription(media: MediaDetails): string {
  const overview = normalizeDescription(media.overview);

  if (overview) {
    return truncateDescription(overview);
  }

  const typeLabel = media.mediaType === "movie" ? "movie" : "TV series";

  return truncateDescription(
    `Explore ${media.title}, a ${typeLabel} on FilmGeezer, with title details, trailers, availability, related titles, and FilmGeezer links.`,
  );
}

function buildTitle(media: MediaDetails): string {
  const yearSuffix = media.year ? ` (${media.year})` : "";

  return `${media.title}${yearSuffix} | FilmGeezer`;
}

function buildStructuredData(
  media: MediaDetails,
  canonicalUrl: string,
  description: string,
): Record<string, unknown> {
  const sameAs = [
    media.homepageUrl,
    media.imdbId
      ? `https://www.imdb.com/title/${encodeURIComponent(media.imdbId)}/`
      : "",
  ].filter(Boolean);

  const originalTitle =
    media.originalTitle &&
    media.originalTitle.toLocaleLowerCase() !==
      media.title.toLocaleLowerCase()
      ? media.originalTitle
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": media.mediaType === "movie" ? "Movie" : "TVSeries",
    "@id": `${canonicalUrl}#title`,
    url: canonicalUrl,
    name: media.title,
    ...(originalTitle ? { alternateName: originalTitle } : {}),
    description,
    ...(media.posterUrl ? { image: media.posterUrl } : {}),
    ...(media.fullReleaseDate
      ? { datePublished: media.fullReleaseDate }
      : {}),
    ...(media.language ? { inLanguage: media.language } : {}),
    ...(media.genres.length > 0 ? { genre: media.genres } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    isPartOf: {
      "@type": "WebSite",
      "@id": `${PUBLIC_SITE_ORIGIN}/#website`,
      name: "FilmGeezer",
      url: `${PUBLIC_SITE_ORIGIN}/`,
    },
  };
}

function MediaDetailsMetadata({ media }: { media: MediaDetails }) {
  const metadata = useMemo<DocumentMetadataOverride>(() => {
    const pathname = `/media/${media.mediaType}/${media.tmdbId}`;
    const canonicalUrl = buildCanonicalUrl(pathname);
    const description = buildDescription(media);
    const imageUrl =
      media.backdropUrl || media.posterUrl || SOCIAL_IMAGE_URL;

    return {
      key: `media:${media.mediaType}:${media.tmdbId}`,
      pathname,
      title: buildTitle(media),
      description,
      indexable: true,
      canonicalPath: pathname,
      imageUrl,
      imageAlt: media.backdropUrl
        ? `Backdrop for ${media.title}`
        : media.posterUrl
          ? `Poster for ${media.title}`
          : "FilmGeezer logo",
      twitterCard:
        media.backdropUrl || media.posterUrl
          ? "summary_large_image"
          : "summary",
      structuredData: {
        id: MEDIA_STRUCTURED_DATA_ID,
        value: buildStructuredData(media, canonicalUrl, description),
      },
    };
  }, [media]);

  useDocumentMetadataOverride(metadata);

  return null;
}

export default MediaDetailsMetadata;
