import { findActiveContentLinksDocument } from "./contentLinks.repository.js";
import type {
  ContentLinkMediaType,
  ContentLinksDocument,
  MovieQuality,
  PublicContentLink,
  PublicContentLinkGroup,
  PublicContentLinksResponse,
} from "./contentLinks.types.js";

interface LinkCandidate {
  id: string;
  url: string;
  isMain: boolean;
  size?: string;
}

interface MovieQualityDetails {
  url: string;
  size?: string;
}

const MOVIE_QUALITIES: MovieQuality[] = ["720p", "1080p"];
const TELEGRAM_HOSTS = new Map([
  ["t.me", "t.me"],
  ["www.t.me", "t.me"],
  ["telegram.me", "telegram.me"],
  ["www.telegram.me", "telegram.me"],
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getSafePublicId(value: unknown, fallback: string) {
  const text = getNonEmptyString(value);

  if (!text) {
    return fallback;
  }

  const sanitized = text.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  return sanitized || fallback;
}

function sanitizeTelegramUrl(value: unknown) {
  const text = getNonEmptyString(value);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);
    const normalizedHostname = TELEGRAM_HOSTS.get(url.hostname.toLowerCase());

    if (
      !normalizedHostname ||
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !url.pathname ||
      url.pathname === "/"
    ) {
      return null;
    }

    url.protocol = "https:";
    url.hostname = normalizedHostname;
    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}

function sanitizeFileSize(value: unknown) {
  const text = getNonEmptyString(value);

  if (!text) {
    return undefined;
  }

  const normalizedText = text
    .replace(/,/g, ".")
    .replace(/\s+/g, " ")
    .trim();

  const match = normalizedText.match(
    /^(\d+(?:\.\d{1,2})?)\s*(KB|MB|GB|TB|KiB|MiB|GiB|TiB)$/i,
  );

  if (!match) {
    return undefined;
  }

  const [, amount, rawUnit] = match;
  const unit = rawUnit.toUpperCase().replace("IB", "iB");

  return `${amount} ${unit}`;
}

function finalizeCandidates(candidates: LinkCandidate[]): PublicContentLink[] {
  const byUrl = new Map<string, LinkCandidate>();

  candidates.forEach((candidate) => {
    const existingCandidate = byUrl.get(candidate.url);

    if (!existingCandidate) {
      byUrl.set(candidate.url, { ...candidate });
      return;
    }

    if (candidate.isMain && !existingCandidate.isMain) {
      existingCandidate.isMain = true;
    }

    if (!existingCandidate.size && candidate.size) {
      existingCandidate.size = candidate.size;
    }
  });

  const uniqueCandidates = Array.from(byUrl.values());

  if (uniqueCandidates.length === 0) {
    return [];
  }

  const explicitMainIndex = uniqueCandidates.findIndex(
    (candidate) => candidate.isMain,
  );
  const mainIndex = explicitMainIndex >= 0 ? explicitMainIndex : 0;
  const mainCandidate = uniqueCandidates[mainIndex];
  const orderedCandidates = [
    mainCandidate,
    ...uniqueCandidates.filter((_, index) => index !== mainIndex),
  ];

  return orderedCandidates.map((candidate, index) => ({
    id: candidate.id,
    label: index === 0 ? "Main link" : `Alternative ${index}`,
    url: candidate.url,
    isMain: index === 0,
    ...(candidate.size ? { size: candidate.size } : {}),
  }));
}

function normalizeSeriesGroups(
  document: ContentLinksDocument,
): PublicContentLinkGroup[] {
  const candidates: LinkCandidate[] = [];
  const rawOptions = Array.isArray(document.link_options)
    ? document.link_options
    : [];

  rawOptions.forEach((rawOption, index) => {
    if (!isRecord(rawOption) || rawOption.active === false) {
      return;
    }

    const url = sanitizeTelegramUrl(rawOption.url ?? rawOption.link);

    if (!url) {
      return;
    }

    candidates.push({
      id: getSafePublicId(rawOption.id, `series-option-${index + 1}`),
      url,
      isMain: rawOption.is_main === true,
    });
  });

  const topLevelUrl = sanitizeTelegramUrl(document.link);

  if (topLevelUrl) {
    candidates.push({
      id: "series-legacy-main",
      url: topLevelUrl,
      isMain: true,
    });
  }

  const links = finalizeCandidates(candidates);

  return links.length > 0
    ? [
        {
          id: "series",
          label: "Series links",
          links,
        },
      ]
    : [];
}

function getMovieQualityDetails(
  links: unknown,
  quality: MovieQuality,
): MovieQualityDetails | null {
  if (!isRecord(links)) {
    return null;
  }

  const value = links[quality];

  if (typeof value === "string") {
    const url = sanitizeTelegramUrl(value);
    return url ? { url } : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const url = sanitizeTelegramUrl(value.url);

  if (!url) {
    return null;
  }

  const size = sanitizeFileSize(value.size);

  return size ? { url, size } : { url };
}

function normalizeMovieGroups(
  document: ContentLinksDocument,
): PublicContentLinkGroup[] {
  const candidatesByQuality = new Map<MovieQuality, LinkCandidate[]>(
    MOVIE_QUALITIES.map((quality) => [quality, []]),
  );

  const rawSources = Array.isArray(document.movie_sources)
    ? document.movie_sources
    : [];

  const activeSources = rawSources
    .map((source, index) => ({ source, index }))
    .filter(({ source }) => isRecord(source) && source.active !== false)
    .sort(({ source: firstSource }, { source: secondSource }) => {
      if (!isRecord(firstSource) || !isRecord(secondSource)) {
        return 0;
      }

      return (
        Number(secondSource.is_main === true) -
        Number(firstSource.is_main === true)
      );
    });

  activeSources.forEach(({ source, index }) => {
    if (!isRecord(source)) {
      return;
    }

    MOVIE_QUALITIES.forEach((quality) => {
      const details = getMovieQualityDetails(source.links, quality);

      if (!details) {
        return;
      }

      candidatesByQuality.get(quality)?.push({
        id: `${getSafePublicId(source.id, `movie-source-${index + 1}`)}-${quality}`,
        url: details.url,
        isMain: source.is_main === true,
        ...(details.size ? { size: details.size } : {}),
      });
    });
  });

  MOVIE_QUALITIES.forEach((quality) => {
    const details = getMovieQualityDetails(document.links, quality);

    if (!details) {
      return;
    }

    candidatesByQuality.get(quality)?.push({
      id: `movie-legacy-${quality}`,
      url: details.url,
      isMain: true,
      ...(details.size ? { size: details.size } : {}),
    });
  });

  return MOVIE_QUALITIES.flatMap((quality) => {
    const links = finalizeCandidates(candidatesByQuality.get(quality) ?? []);

    return links.length > 0
      ? [
          {
            id: quality,
            label: quality,
            links,
          },
        ]
      : [];
  });
}

export function normalizeContentLinksDocument(
  document: ContentLinksDocument | null,
  mediaType: ContentLinkMediaType,
  tmdbId: number,
): PublicContentLinksResponse {
  if (!document) {
    return {
      status: "success",
      available: false,
      mediaType,
      tmdbId,
      kind: null,
      groups: [],
    };
  }

  const groups =
    mediaType === "movie"
      ? normalizeMovieGroups(document)
      : normalizeSeriesGroups(document);

  return {
    status: "success",
    available: groups.length > 0,
    mediaType,
    tmdbId,
    kind: groups.length > 0 ? (mediaType === "movie" ? "movie" : "series") : null,
    groups,
  };
}

export async function getContentLinksByMedia(
  mediaType: ContentLinkMediaType,
  tmdbId: number,
) {
  const document = await findActiveContentLinksDocument(mediaType, tmdbId);

  return normalizeContentLinksDocument(document, mediaType, tmdbId);
}
