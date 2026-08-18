import { useEffect } from "react";
import { useLocation } from "react-router";

import { readAuthRouteState } from "../../features/auth/authNavigation";
import {
  useDocumentMetadataContext,
  type DocumentMetadataOverride,
  type DocumentStructuredData,
} from "../../features/metadata/documentMetadataState";
import {
  applyDocumentMetadata,
  DEFAULT_DOCUMENT_DESCRIPTION,
  DEFAULT_DOCUMENT_TITLE,
  PUBLIC_SITE_ORIGIN,
  SOCIAL_IMAGE_URL,
  WEBSITE_STRUCTURED_DATA_ID,
  syncManagedStructuredData,
} from "./documentMetadata";

type RouteMetadataDefinition = {
  title: string;
  description: string;
  indexable: boolean;
};

const STATIC_PUBLIC_ROUTES: Record<string, RouteMetadataDefinition> = {
  "/": {
    title: DEFAULT_DOCUMENT_TITLE,
    description: DEFAULT_DOCUMENT_DESCRIPTION,
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
    description: DEFAULT_DOCUMENT_DESCRIPTION,
    indexable: false,
  };
}

function createWebsiteStructuredData(): DocumentStructuredData {
  return {
    id: WEBSITE_STRUCTURED_DATA_ID,
    value: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${PUBLIC_SITE_ORIGIN}/#website`,
      url: `${PUBLIC_SITE_ORIGIN}/`,
      name: "FilmGeezer",
      alternateName: ["Film Geezer", "filmgeezer.site"],
      description: DEFAULT_DOCUMENT_DESCRIPTION,
      inLanguage: "en",
    },
  };
}

function overrideMatchesPath(
  metadataOverride: DocumentMetadataOverride | null,
  pathname: string,
): metadataOverride is DocumentMetadataOverride {
  return metadataOverride?.pathname === pathname;
}

export default function RouteMetadata() {
  const location = useLocation();
  const authRouteState = readAuthRouteState(location.state);
  const { metadataOverride } = useDocumentMetadataContext();

  const effectivePathname =
    authRouteState.backgroundLocation?.pathname ?? location.pathname;

  useEffect(() => {
    const normalizedPathname = normalizePathname(effectivePathname);
    const routeMetadata = getRouteMetadata(normalizedPathname);
    const matchingOverride = overrideMatchesPath(
      metadataOverride,
      normalizedPathname,
    )
      ? metadataOverride
      : null;

    const title = matchingOverride?.title ?? routeMetadata.title;
    const description =
      matchingOverride?.description ?? routeMetadata.description;
    const indexable =
      matchingOverride?.indexable ?? routeMetadata.indexable;
    const canonicalPath =
      matchingOverride?.canonicalPath ??
      (routeMetadata.indexable ? normalizedPathname : null);

    applyDocumentMetadata({
      title,
      description,
      indexable,
      canonicalPath,
      imageUrl: matchingOverride?.imageUrl ?? SOCIAL_IMAGE_URL,
      imageAlt: matchingOverride?.imageAlt ?? "FilmGeezer logo",
      imageWidth: matchingOverride?.imageWidth ?? 512,
      imageHeight: matchingOverride?.imageHeight ?? 512,
      openGraphType: matchingOverride?.openGraphType ?? "website",
      twitterCard: matchingOverride?.twitterCard ?? "summary",
    });

    const structuredData: DocumentStructuredData[] = [];

    if (matchingOverride?.structuredData) {
      structuredData.push(matchingOverride.structuredData);
    } else if (normalizedPathname === "/") {
      structuredData.push(createWebsiteStructuredData());
    }

    syncManagedStructuredData(structuredData);
  }, [effectivePathname, metadataOverride]);

  return null;
}
