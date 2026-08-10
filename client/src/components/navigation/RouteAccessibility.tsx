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

import {
  dismissActiveBrowserInput,
} from "../../utils/browserInput";

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

  if (pathname === "/contact") {
    return "Contact";
  }

  if (pathname === "/notifications") {
    return "Notifications";
  }

  if (pathname === "/about") {
    return "About FilmGeezer";
  }

  if (pathname === "/privacy") {
    return "Privacy Policy";
  }

  if (pathname === "/terms") {
    return "Terms of Use";
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

    dismissActiveBrowserInput();

    let observer:
      MutationObserver | null =
      null;

    let animationFrame = 0;

    let handledReadyMain = false;

    function synchronizeMain(): boolean {
      const main =
        document.querySelector<HTMLElement>(
          "main",
        );

      if (!main) {
        return false;
      }

      main.id =
        "main-content";

      main.tabIndex = -1;

      if (
        main.dataset
          .routeLoading === "true"
      ) {
        return false;
      }

      if (handledReadyMain) {
        return true;
      }

      handledReadyMain = true;

      if (
        isFirstRenderRef.current
      ) {
        isFirstRenderRef.current =
          false;

        return true;
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

      return true;
    }

    animationFrame =
      window.requestAnimationFrame(
        () => {
          if (synchronizeMain()) {
            return;
          }

          const root =
            document.getElementById(
              "root",
            );

          if (!root) {
            return;
          }

          observer =
            new MutationObserver(
              () => {
                if (
                  synchronizeMain()
                ) {
                  observer?.disconnect();
                  observer = null;
                }
              },
            );

          observer.observe(root, {
            childList: true,
            subtree: true,
          });

          if (synchronizeMain()) {
            observer.disconnect();
            observer = null;
          }
        },
      );

    return () => {
      window.cancelAnimationFrame(
        animationFrame,
      );

      observer?.disconnect();
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
