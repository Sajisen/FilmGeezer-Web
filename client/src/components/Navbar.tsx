import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router";

import ContentContainer from "./layout/ContentContainer";

import MobileNavigationDrawer from "./navigation/MobileNavigationDrawer";

import {
  BookmarkIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "./navigation/NavigationIcons";

import {
  primaryNavigation,
} from "./navigation/NavigationItems";

import ProfileMenu from "./navigation/ProfileMenu";

import {
  useAuth,
} from "../features/auth/authContext";

import {
  createAuthRouteState,
} from "../features/auth/authNavigation";

import {
  useWatchlist,
} from "../features/watchlist/watchlistContext";

import {
  dismissActiveBrowserInput,
} from "../utils/browserInput";

import {
  createProfileInitials,
} from "../utils/profileImage";

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  const auth = useAuth();
  const { itemCount } = useWatchlist();
  const location = useLocation();
  const navigate = useNavigate();

  const openMenu =
    useCallback(() => {
      dismissActiveBrowserInput();
      setIsMenuOpen(true);
    }, []);

  const closeMenu =
    useCallback(() => {
      setIsMenuOpen(false);
    }, []);

  useEffect(() => {
    window.addEventListener(
      "popstate",
      closeMenu,
    );

    return () => {
      window.removeEventListener(
        "popstate",
        closeMenu,
      );
    };
  }, [closeMenu]);

  const openAuthentication =
    useCallback(() => {
      dismissActiveBrowserInput();

      navigate(
        "/login",
        {
          state:
            createAuthRouteState(
              location,
            ),
        },
      );
    }, [
      location,
      navigate,
    ]);

  const openAccount =
    useCallback(() => {
      if (
        auth.status ===
        "authenticated"
      ) {
        navigate("/account?section=profile");
        return;
      }

      openAuthentication();
    }, [
      auth.status,
      navigate,
      openAuthentication,
    ]);

  const openWatchlist =
    useCallback(() => {
      navigate("/watchlist");
    }, [navigate]);

  const accountInitials =
    auth.user
      ? createProfileInitials(
          auth.user.displayName,
        )
      : null;

  const watchlistLabel =
    itemCount === 0
      ? "Open Watchlist"
      : `Open Watchlist, ${itemCount} saved ${itemCount === 1 ? "title" : "titles"}`;

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 text-white backdrop-blur-xl">
      <ContentContainer>
        <nav
          aria-label="Primary navigation"
          className="grid min-h-18 grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4 lg:grid-cols-[1fr_auto_1fr]"
        >
          <NavLink
            to="/"
            aria-label="FilmGeezer home"
            className="inline-flex shrink-0 items-center gap-2.5 justify-self-start rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <img
              src="/filmgeezer-logo7.png"
              alt=""
              className="h-8 w-8 rounded-xl object-cover shadow-lg shadow-sky-950/35 sm:h-9 sm:w-9"
            />

            <span className="text-xl font-black tracking-tight">
              Film
              <span className="text-sky-400">
                Geezer
              </span>
            </span>
          </NavLink>

          <div className="hidden items-center justify-self-center gap-1 lg:flex">
            {primaryNavigation.map(
              (item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({
                    isActive,
                  }) =>
                    `rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? "bg-sky-500/15 text-sky-300"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </div>

          <div className="flex items-center justify-self-end gap-2">
            <NavLink
              to="/search"
              aria-label="Search FilmGeezer"
              title="Search FilmGeezer"
              className={({
                isActive,
              }) =>
                `group inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 lg:w-11 xl:w-48 xl:justify-start ${
                  isActive
                    ? "border-sky-400/40 bg-sky-500/15 text-sky-200"
                    : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-sky-400/30 hover:bg-white/[0.08] hover:text-white"
                }`
              }
            >
              <SearchIcon className="h-5 w-5 shrink-0" />

              <span className="hidden min-w-0 truncate xl:inline">
                Search FilmGeezer
              </span>
            </NavLink>

            <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.035] p-1 shadow-sm shadow-black/20 sm:flex">
              <NavLink
                to="/watchlist"
                aria-label={watchlistLabel}
                title="Watchlist"
                className={({ isActive }) =>
                  `relative grid h-10 w-10 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                    isActive
                      ? "bg-sky-400 text-slate-950 [&_path]:fill-current"
                      : "text-slate-300 hover:bg-sky-400/10 hover:text-sky-200"
                  }`
                }
              >
                <BookmarkIcon />

                {itemCount > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-slate-950 bg-sky-400 px-1 text-[0.62rem] font-black leading-none text-slate-950"
                  >
                    {itemCount}
                  </span>
                )}
              </NavLink>

              {auth.status ===
              "loading" ? (
                <span
                  aria-label="Checking account status"
                  role="status"
                  className="h-10 w-10 animate-pulse rounded-full bg-white/5 motion-reduce:animate-none"
                />
              ) : auth.status ===
                  "authenticated" ? (
                <ProfileMenu />
              ) : (
                <button
                  type="button"
                  onClick={openAuthentication}
                  aria-label="Sign in or create an account"
                  title="Sign in or create an account"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-sky-500 px-3.5 text-sm font-semibold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 xl:px-4"
                >
                  <UserIcon />

                  <span className="hidden xl:inline">
                    Sign in
                  </span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={openMenu}
              aria-label="Open navigation menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              aria-haspopup="dialog"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/[0.045] text-slate-100 transition hover:border-sky-400/25 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 lg:hidden"
            >
              <MenuIcon />
            </button>
          </div>
        </nav>
      </ContentContainer>

      {isMenuOpen && (
        <MobileNavigationDrawer
          onClose={closeMenu}
          onWatchlist={
            openWatchlist
          }
          onAccountAction={
            openAccount
          }
          accountLabel={
            auth.status ===
            "authenticated"
              ? "Profile"
              : "Sign in"
          }
          accountInitials={
            accountInitials
          }
          accountProfileImagePath={
            auth.user?.profileImagePath ?? null
          }
        />
      )}
    </header>
  );
}

export default Navbar;
