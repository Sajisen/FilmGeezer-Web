import {
  lazy,
} from "react";
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
} from "react-router";

import Footer from "./components/Footer";
import Navbar from "./components/Navbar";

import BackToTopButton from "./components/navigation/BackToTopButton";
import RouteAccessibility from "./components/navigation/RouteAccessibility";
import RouteContentBoundary from "./components/navigation/RouteContentBoundary";
import {
  PublicRouteErrorState,
  PublicRouteLoadingState,
} from "./components/navigation/PublicRouteState";
import ScrollToTop from "./components/navigation/ScrollToTop";

import {
  AuthProvider,
} from "./features/auth/AuthProvider";

import AuthRoute from "./features/auth/AuthRoute";

import {
  WatchlistProvider,
} from "./features/watchlist/WatchlistProvider";

import {
  NotificationProvider,
} from "./features/notifications/NotificationProvider";

import {
  isAuthRoutePath,
  readAuthRouteState,
} from "./features/auth/authNavigation";

import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";

const AboutPage = lazy(
  () => import("./pages/AboutPage"),
);
const AccountPage = lazy(
  () => import("./pages/AccountPage"),
);
const AnimePage = lazy(
  () => import("./pages/AnimePage"),
);
const ApiTestPage = lazy(
  () => import("./pages/ApiTestPage"),
);
const ContactPage = lazy(
  () => import("./pages/ContactPage"),
);
const KDramaPage = lazy(
  () => import("./pages/KDramaPage"),
);
const MediaDetailsPage = lazy(
  () =>
    import("./pages/MediaDetailsPage"),
);
const MoviesPage = lazy(
  () => import("./pages/MoviesPage"),
);
const NotificationsPage = lazy(
  () =>
    import("./pages/NotificationsPage"),
);
const SearchPage = lazy(
  () => import("./pages/SearchPage"),
);
const TVSeriesPage = lazy(
  () => import("./pages/TVSeriesPage"),
);
const WatchlistPage = lazy(
  () => import("./pages/WatchlistPage"),
);

function ApplicationRoutes() {
  const location =
    useLocation();

  const authRouteState =
    readAuthRouteState(
      location.state,
    );

  const backgroundLocation =
    authRouteState
      .backgroundLocation;

  const isDirectAuthRoute =
    isAuthRoutePath(
      location.pathname,
    ) &&
    !backgroundLocation;

  const routeBoundaryKey =
    backgroundLocation
      ? `${backgroundLocation.pathname}${backgroundLocation.search}`
      : `${location.pathname}${location.search}`;

  return (
    <>
      {!isDirectAuthRoute && (
        <>
          <a
            href="#main-content"
            className="fixed left-4 top-3 z-[200] -translate-y-24 rounded-full bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-xl shadow-black/30 transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white"
          >
            Skip to main content
          </a>

          <ScrollToTop />
          <RouteAccessibility />
          <Navbar />
        </>
      )}

      <RouteContentBoundary
        resetKey={routeBoundaryKey}
        loadingFallback={
          <PublicRouteLoadingState />
        }
        errorFallback={
          <PublicRouteErrorState />
        }
      >
        <Routes
          location={
            backgroundLocation ??
            location
          }
        >
          <Route
            path="/"
            element={<HomePage />}
          />

          <Route
            path="/movies"
            element={
              <MoviesPage />
            }
          />

          <Route
            path="/tv"
            element={
              <TVSeriesPage />
            }
          />

          <Route
            path="/anime"
            element={
              <AnimePage />
            }
          />

          <Route
            path="/k-drama"
            element={
              <KDramaPage />
            }
          />

          <Route
            path="/search"
            element={
              <SearchPage />
            }
          />

          <Route
            path="/media/:mediaType/:tmdbId"
            element={
              <MediaDetailsPage />
            }
          />

          <Route
            path="/watchlist"
            element={
              <WatchlistPage />
            }
          />

          <Route
            path="/account"
            element={
              <AccountPage />
            }
          />

          <Route
            path="/contact"
            element={
              <ContactPage />
            }
          />

          <Route
            path="/notifications"
            element={
              <NotificationsPage />
            }
          />

          <Route
            path="/about"
            element={
              <AboutPage />
            }
          />

          <Route
            path="/api-test"
            element={
              <ApiTestPage />
            }
          />

          <Route
            path="/login"
            element={
              <AuthRoute mode="login" />
            }
          />

          <Route
            path="/register"
            element={
              <AuthRoute mode="register" />
            }
          />

          <Route
            path="/registration-pending"
            element={
              <AuthRoute mode="registration-pending" />
            }
          />

          <Route
            path="/verify-email"
            element={
              <AuthRoute mode="verify-email" />
            }
          />

          <Route
            path="/forgot-password"
            element={
              <AuthRoute mode="forgot-password" />
            }
          />

          <Route
            path="/reset-password/:challengeId"
            element={
              <AuthRoute mode="reset-password" />
            }
          />

          <Route
            path="*"
            element={
              <NotFoundPage />
            }
          />
        </Routes>
      </RouteContentBoundary>

      {!isDirectAuthRoute && (
        <>
          <Footer />
          <BackToTopButton />
        </>
      )}

      {backgroundLocation && (
        <Routes>
          <Route
            path="/login"
            element={
              <AuthRoute mode="login" />
            }
          />

          <Route
            path="/register"
            element={
              <AuthRoute mode="register" />
            }
          />

          <Route
            path="/registration-pending"
            element={
              <AuthRoute mode="registration-pending" />
            }
          />

          <Route
            path="/verify-email"
            element={
              <AuthRoute mode="verify-email" />
            }
          />

          <Route
            path="/forgot-password"
            element={
              <AuthRoute mode="forgot-password" />
            }
          />

          <Route
            path="/reset-password/:challengeId"
            element={
              <AuthRoute mode="reset-password" />
            }
          />
        </Routes>
      )}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <WatchlistProvider>
            <ApplicationRoutes />
          </WatchlistProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;