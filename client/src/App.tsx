import { BrowserRouter, Route, Routes } from "react-router";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import BackToTopButton from "./components/navigation/BackToTopButton";
import RouteAccessibility from "./components/navigation/RouteAccessibility";
import ScrollToTop from "./components/navigation/ScrollToTop";
import AnimePage from "./pages/AnimePage";
import ApiTestPage from "./pages/ApiTestPage";
import ContactPage from "./pages/ContactPage";
import HelpPage from "./pages/HelpPage";
import HomePage from "./pages/HomePage";
import KDramaPage from "./pages/KDramaPage";
import MediaDetailsPage from "./pages/MediaDetailsPage";
import MoviesPage from "./pages/MoviesPage";
import NotFoundPage from "./pages/NotFoundPage";
import SearchPage from "./pages/SearchPage";
import TVSeriesPage from "./pages/TVSeriesPage";

function App() {
  return (
    <BrowserRouter>
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[200] -translate-y-24 rounded-full bg-sky-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-xl shadow-black/30 transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      <ScrollToTop />
      <RouteAccessibility />
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/tv" element={<TVSeriesPage />} />
        <Route path="/anime" element={<AnimePage />} />
        <Route path="/k-drama" element={<KDramaPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/media/:mediaType/:tmdbId" element={<MediaDetailsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/api-test" element={<ApiTestPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      <Footer />
      <BackToTopButton />
    </BrowserRouter>
  );
}

export default App;
