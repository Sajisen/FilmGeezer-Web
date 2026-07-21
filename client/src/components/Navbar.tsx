import { useCallback, useEffect, useState } from "react";
import { NavLink } from "react-router";
import ContentContainer from "./layout/ContentContainer";
import MobileNavigationDrawer from "./navigation/MobileNavigationDrawer";
import { BookmarkIcon, MenuIcon, UserIcon } from "./navigation/NavigationIcons";
import { primaryNavigation } from "./navigation/NavigationItems";
import { usePlannedFeature } from "../features/plannedFeature/plannedFeatureContext";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { showPlannedFeature } = usePlannedFeature();

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  useEffect(() => {
    window.addEventListener("popstate", closeMenu);

    return () => {
      window.removeEventListener("popstate", closeMenu);
    };
  }, [closeMenu]);

  const showPlannedFeatureNotice = useCallback(
    (featureName: string) => {
      const isWatchlist = featureName === "Watchlist";

      showPlannedFeature({
        title: isWatchlist
          ? "Watchlist requires an account"
          : "Profile and login are coming next",

        message: isWatchlist
          ? "Nothing has been saved yet. Persistent watchlists will be connected after authentication is implemented."
          : "Registration, login, and profile management will be added during the authentication phase.",
      });
    },
    [showPlannedFeature],
  );

  const handleDrawerPlannedFeature = useCallback(
    (featureName: string) => {
      closeMenu();

      window.setTimeout(() => {
        showPlannedFeatureNotice(featureName);
      }, 0);
    },
    [closeMenu, showPlannedFeatureNotice],
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 text-white backdrop-blur-xl">
      <ContentContainer>
        <nav
          aria-label="Primary navigation"
          className="flex min-h-18 items-center justify-between gap-4"
        >
          <NavLink to="/" className="shrink-0 text-xl font-bold tracking-tight">
            Film<span className="text-sky-400">Geezer</span>
          </NavLink>

          <div className="hidden items-center gap-1 lg:flex">
            {primaryNavigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-sky-500/15 text-sky-300"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => showPlannedFeatureNotice("Watchlist")}
              aria-label="Open watchlist"
              title="Watchlist"
              className="hidden min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-sky-400/40 hover:bg-sky-400/10 hover:text-white sm:inline-flex"
            >
              <BookmarkIcon />
            </button>

            <button
              type="button"
              onClick={() => showPlannedFeatureNotice("Profile and login")}
              aria-label="Open profile or login"
              title="Profile or login"
              className="hidden min-h-11 min-w-11 items-center justify-center rounded-full bg-sky-500 text-white transition hover:bg-sky-400 sm:inline-flex"
            >
              <UserIcon />
            </button>

            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              aria-haspopup="dialog"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 lg:hidden"
            >
              <MenuIcon />
            </button>
          </div>
        </nav>
      </ContentContainer>

      {isMenuOpen && (
        <MobileNavigationDrawer
          onClose={closeMenu}
          onPlannedFeature={handleDrawerPlannedFeature}
        />
      )}
    </header>
  );
}

export default Navbar;
