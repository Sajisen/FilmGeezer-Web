import type { DocumentStructuredData } from "../../features/metadata/documentMetadataContext";

export const PUBLIC_SITE_ORIGIN = "https://filmgeezer.site";
export const SOCIAL_IMAGE_URL =
  "https://filmgeezer.site/filmgeezer-social-512.png";

export const WEBSITE_STRUCTURED_DATA_ID =
  "filmgeezer-website-structured-data";
export const MEDIA_STRUCTURED_DATA_ID =
  "filmgeezer-media-structured-data";

export const DEFAULT_DOCUMENT_TITLE =
  "FilmGeezer — Movies, TV, Anime & K-Drama Discovery";
export const DEFAULT_DOCUMENT_DESCRIPTION =
  "Discover movies, TV series, anime, and K-dramas with FilmGeezer.";

type ApplyDocumentMetadataInput = {
  title: string;
  description: string;
  indexable: boolean;
  canonicalPath: string | null;
  imageUrl?: string;
  imageAlt?: string;
  twitterCard?: "summary" | "summary_large_image";
};

function upsertMetaByName(name: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  );

  if (!element) {
    element = document.createElement("meta");
    element.name = name;
    document.head.append(element);
  }

  element.content = content;
}

function upsertMetaByProperty(property: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(
    `meta[property="${property}"]`,
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.append(element);
  }

  element.content = content;
}

function upsertCanonical(href: string | null): void {
  let element = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );

  if (!href) {
    element?.remove();
    return;
  }

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.append(element);
  }

  element.href = href;
}

export function buildCanonicalUrl(pathname: string): string {
  return new URL(pathname, PUBLIC_SITE_ORIGIN).toString();
}

export function applyDocumentMetadata({
  title,
  description,
  indexable,
  canonicalPath,
  imageUrl = SOCIAL_IMAGE_URL,
  imageAlt = "FilmGeezer logo",
  twitterCard = "summary",
}: ApplyDocumentMetadataInput): void {
  const canonicalUrl = canonicalPath
    ? buildCanonicalUrl(canonicalPath)
    : null;

  document.title = title;

  upsertMetaByName("description", description);
  upsertMetaByName(
    "robots",
    indexable
      ? "index, follow, max-image-preview:large"
      : "noindex, nofollow",
  );

  upsertMetaByProperty("og:type", "website");
  upsertMetaByProperty("og:site_name", "FilmGeezer");
  upsertMetaByProperty("og:title", title);
  upsertMetaByProperty("og:description", description);
  upsertMetaByProperty(
    "og:url",
    canonicalUrl ?? `${PUBLIC_SITE_ORIGIN}/`,
  );
  upsertMetaByProperty("og:image", imageUrl);
  upsertMetaByProperty("og:image:alt", imageAlt);

  upsertMetaByName("twitter:card", twitterCard);
  upsertMetaByName("twitter:title", title);
  upsertMetaByName("twitter:description", description);
  upsertMetaByName("twitter:image", imageUrl);

  upsertCanonical(canonicalUrl);
}

function upsertStructuredData(
  structuredData: DocumentStructuredData,
): void {
  let script = document.getElementById(structuredData.id);

  if (!(script instanceof HTMLScriptElement)) {
    script?.remove();

    script = document.createElement("script");
    script.id = structuredData.id;
    script.type = "application/ld+json";
    document.head.append(script);
  }

  script.text = JSON.stringify(structuredData.value);
}

export function syncManagedStructuredData(
  structuredData: readonly DocumentStructuredData[],
): void {
  const nextIds = new Set(
    structuredData.map((entry) => entry.id),
  );

  for (const managedId of [
    WEBSITE_STRUCTURED_DATA_ID,
    MEDIA_STRUCTURED_DATA_ID,
  ]) {
    if (!nextIds.has(managedId)) {
      document.getElementById(managedId)?.remove();
    }
  }

  structuredData.forEach(upsertStructuredData);
}
