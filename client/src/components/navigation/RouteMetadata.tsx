import { useEffect } from "react";
import { useLocation } from "react-router";

import { readAuthRouteState } from "../../features/auth/authNavigation";

const PUBLIC_SITE_ORIGIN = "https://filmgeezer.site";
const SOCIAL_IMAGE_URL =
  "https://filmgeezer.site/filmgeezer-social-512.png";
const WEBSITE_STRUCTURED_DATA_ID =
  "filmgeezer-website-structured-data";

const DEFAULT_TITLE =
  "FilmGeezer — Movies, TV, Anime & K-Drama Discovery";
const DEFAULT_DESCRIPTION =
  "Discover movies, TV series, anime, and K-dramas with FilmGeezer.";

type RouteMetadataDefinition = {
  title: string;
  description: string;
  indexable: boolean;
};

const STATIC_PUBLIC_ROUTES: Record<string, RouteMetadataDefinition> = {
  "/": {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    indexable: true,
  },
  "/movies": {
    title: "Movies | FilmGeezer",
    description:
      "Discover trending, recommended, and curated movies on FilmGeezer.",
    indexable: true,
  },
  "/tv": {
    title: "TV Series | FilmGeezer",
    description:
      "Discover trending, recommended, and curated TV series on FilmGeezer.",
    indexable: true,
  },
  "/anime": {
    title: "Anime | FilmGeezer",
    description:
      "Discover anime movies and series, trending titles, essentials, and recommendations on FilmGeezer.",
    indexable: true,
  },
  "/k-drama": {
    title: "K-Drama | FilmGeezer",
    description:
      "Discover Korean movies and series, trending K-dramas, essentials, and recommendations on FilmGeezer.",
    indexable: true,
  },
  "/about": {
    title: "About | FilmGeezer",
    description:
      "Learn about FilmGeezer and its movie, TV, anime, and K-drama discovery experience.",
    indexable: true,
  },
  "/contact": {
    title: "Contact FilmGeezer",
    description:
      "Contact FilmGeezer Support or continue an existing signed-in support conversation.",
    indexable: true,
  },
  "/privacy": {
    title: "Privacy Policy | FilmGeezer",
    description:
      "Learn how FilmGeezer handles account information, Watchlists, preferences, profile images, support messages, and security data.",
    indexable: true,
  },
  "/terms": {
    title: "Terms of Use | FilmGeezer",
    description:
      "Read the rules for using FilmGeezer and its movie, TV, anime, and K-drama discovery features.",
    indexable: true,
  },
  "/search": {
    title: "Search | FilmGeezer",
    description:
      "Search FilmGeezer for movies, TV series, anime, and K-dramas.",
    indexable: false,
  },
  "/watchlist": {
    title: "Watchlist | FilmGeezer",
    description: "View and manage your FilmGeezer Watchlist.",
    indexable: false,
  },
  "/account": {
    title: "Account | FilmGeezer",
    description: "Manage your FilmGeezer account.",
    indexable: false,
  },
  "/notifications": {
    title: "Notifications | FilmGeezer",
    description: "View your FilmGeezer notifications.",
    indexable: false,
  },
  "/api-test": {
    title: "API Test | FilmGeezer",
    description: "FilmGeezer development API test page.",
    indexable: false,
  },
  "/login": {
    title: "Sign in | FilmGeezer",
    description: "Sign in to your FilmGeezer account.",
    indexable: false,
  },
  "/register": {
    title: "Create account | FilmGeezer",
    description: "Create your FilmGeezer account.",
    indexable: false,
  },
  "/registration-pending": {
    title: "Registration pending | FilmGeezer",
    description: "Continue your FilmGeezer registration.",
    indexable: false,
  },
  "/verify-email": {
    title: "Verify email | FilmGeezer",
    description: "Verify your FilmGeezer email address.",
    indexable: false,
  },
  "/forgot-password": {
    title: "Reset password | FilmGeezer",
    description: "Request a FilmGeezer password reset.",
    indexable: false,
  },
};

function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/u, "") || "/";
}

function getRouteMetadata(pathname: string): RouteMetadataDefinition {
  const normalizedPathname = normalizePathname(pathname);
  const staticMetadata = STATIC_PUBLIC_ROUTES[normalizedPathname];

  if (staticMetadata) {
    return staticMetadata;
  }

  if (/^\/reset-password\/[^/]+$/u.test(normalizedPathname)) {
    return {
      title: "Choose a new password | FilmGeezer",
      description: "Complete your FilmGeezer password reset.",
      indexable: false,
    };
  }

  if (/^\/media\/(?:movie|tv)\/\d+$/u.test(normalizedPathname)) {
    return {
      title: "Title details | FilmGeezer",
      description:
        "Explore title details, trailers, episodes, availability, and recommendations on FilmGeezer.",
      indexable: true,
    };
  }

  return {
    title: "Page not found | FilmGeezer",
    description: DEFAULT_DESCRIPTION,
    indexable: false,
  };
}

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

function buildCanonicalUrl(pathname: string): string {
  return new URL(normalizePathname(pathname), PUBLIC_SITE_ORIGIN).toString();
}

function syncWebsiteStructuredData(enabled: boolean): void {
  const existing = document.getElementById(WEBSITE_STRUCTURED_DATA_ID);

  if (!enabled) {
    existing?.remove();
    return;
  }

  const script =
    existing instanceof HTMLScriptElement
      ? existing
      : document.createElement("script");

  script.id = WEBSITE_STRUCTURED_DATA_ID;
  script.type = "application/ld+json";
  script.text = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${PUBLIC_SITE_ORIGIN}/#website`,
    url: `${PUBLIC_SITE_ORIGIN}/`,
    name: "FilmGeezer",
    alternateName: ["Film Geezer", "filmgeezer.site"],
    description: DEFAULT_DESCRIPTION,
    inLanguage: "en",
  });

  if (!existing) {
    document.head.append(script);
  }
}

export default function RouteMetadata() {
  const location = useLocation();
  const authRouteState = readAuthRouteState(location.state);

  const effectivePathname =
    authRouteState.backgroundLocation?.pathname ?? location.pathname;

  useEffect(() => {
    const normalizedPathname = normalizePathname(effectivePathname);
    const metadata = getRouteMetadata(normalizedPathname);
    const canonicalUrl = metadata.indexable
      ? buildCanonicalUrl(normalizedPathname)
      : null;

    document.title = metadata.title;

    upsertMetaByName("description", metadata.description);
    upsertMetaByName(
      "robots",
      metadata.indexable
        ? "index, follow, max-image-preview:large"
        : "noindex, nofollow",
    );

    upsertMetaByProperty("og:type", "website");
    upsertMetaByProperty("og:site_name", "FilmGeezer");
    upsertMetaByProperty("og:title", metadata.title);
    upsertMetaByProperty("og:description", metadata.description);
    upsertMetaByProperty(
      "og:url",
      canonicalUrl ?? `${PUBLIC_SITE_ORIGIN}/`,
    );
    upsertMetaByProperty("og:image", SOCIAL_IMAGE_URL);
    upsertMetaByProperty("og:image:width", "512");
    upsertMetaByProperty("og:image:height", "512");
    upsertMetaByProperty("og:image:alt", "FilmGeezer logo");

    upsertMetaByName("twitter:card", "summary");
    upsertMetaByName("twitter:title", metadata.title);
    upsertMetaByName("twitter:description", metadata.description);
    upsertMetaByName("twitter:image", SOCIAL_IMAGE_URL);

    upsertCanonical(canonicalUrl);
    syncWebsiteStructuredData(normalizedPathname === "/");
  }, [effectivePathname]);

  return null;
}
