import {
  useEffect,
} from "react";

import {
  useLocation,
} from "react-router";

import {
  readAuthRouteState,
} from "../../features/auth/authNavigation";

function ScrollToTop() {
  const location =
    useLocation();

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

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  }, [
    location.pathname,
    location.state,
  ]);

  return null;
}

export default ScrollToTop;