import { useEffect } from "react";
import { useLocation } from "react-router";

const ADMIN_TITLES: Record<string, string> = {
  "/": "Administration | FilmGeezer",
  "/support": "Support administration | FilmGeezer",
  "/users": "User administration | FilmGeezer",
  "/content": "Content administration | FilmGeezer",
  "/audit": "Audit | FilmGeezer",
  "/settings": "Administrator security | FilmGeezer",
};

function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/u, "") || "/";
}

function ensureRobotsMeta(): HTMLMetaElement {
  let element = document.head.querySelector<HTMLMetaElement>(
    'meta[name="robots"]',
  );

  if (!element) {
    element = document.createElement("meta");
    element.name = "robots";
    document.head.append(element);
  }

  return element;
}

export default function AdminRouteMetadata() {
  const location = useLocation();

  useEffect(() => {
    const pathname = normalizePathname(location.pathname);

    document.title =
      ADMIN_TITLES[pathname] ?? "Administration | FilmGeezer";

    ensureRobotsMeta().content = "noindex, nofollow";
    document.head.querySelector('link[rel="canonical"]')?.remove();
  }, [location.pathname]);

  return null;
}