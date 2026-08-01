import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
} from "react-router";

import {
  readAuthRouteState,
} from "../../features/auth/authNavigation";

function getFallbackAnnouncement(
  pathname: string,
) {
  if (pathname === "/") {
    return "Home";
  }

  if (pathname === "/movies") {
    return "Movies";
  }

  if (pathname === "/tv") {
    return "TV Series";
  }

  if (pathname === "/anime") {
    return "Anime";
  }

  if (pathname === "/k-drama") {
    return "K-Drama";
  }

  if (pathname === "/search") {
    return "Search";
  }

  if (
    pathname.startsWith(
      "/media/",
    )
  ) {
    return "Media details";
  }

  if (pathname === "/watchlist") {
    return "Watchlist";
  }

  if (pathname === "/account") {
    return "FilmGeezer account";
  }

  if (pathname === "/help") {
    return "Help";
  }

  if (pathname === "/contact") {
    return "Contact";
  }

  if (pathname === "/about") {
    return "About FilmGeezer";
  }

  return "FilmGeezer page";
}

function RouteAccessibility() {
  const location =
    useLocation();

  const isFirstRenderRef =
    useRef(true);

  const [
    announcement,
    setAnnouncement,
  ] = useState("");

  useEffect(() => {
    const authRouteState =
      readAuthRouteState(
        location.state,
      );

    if (
      authRouteState
        .backgroundLocation
    ) {
      return;
    }

    const animationFrame =
      window.requestAnimationFrame(
        () => {
          const main =
            document.querySelector<HTMLElement>(
              "main",
            );

          if (!main) {
            return;
          }

          main.id =
            "main-content";

          main.tabIndex = -1;

          if (
            isFirstRenderRef.current
          ) {
            isFirstRenderRef.current =
              false;

            return;
          }

          main.focus({
            preventScroll: true,
          });

          const pageHeading =
            main.querySelector<HTMLElement>(
              "h1",
            );

          const headingText =
            pageHeading
              ?.textContent
              ?.trim();

          setAnnouncement(
            headingText ||
              getFallbackAnnouncement(
                location.pathname,
              ),
          );
        },
      );

    return () => {
      window.cancelAnimationFrame(
        animationFrame,
      );
    };
  }, [
    location.pathname,
    location.state,
  ]);

  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </span>
  );
}

export default RouteAccessibility;