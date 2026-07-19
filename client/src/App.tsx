import { BrowserRouter, Route, Routes } from "react-router";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./pages/HomePage";
import MoviesPage from "./pages/MoviesPage";
import TVSeriesPage from "./pages/TVSeriesPage";
import SearchPage from "./pages/SearchPage";
import MediaDetailsPage from "./pages/MediaDetailsPage";
import ContactPage from "./pages/ContactPage";
import HelpPage from "./pages/HelpPage";
import ApiTestPage from "./pages/ApiTestPage";
import NotFoundPage from "./pages/NotFoundPage";
import AnimePage from "./pages/AnimePage";
import KDramaPage from "./pages/KDramaPage";
import ScrollToTop from './components/navigation/ScrollToTop'

function App() {
  return (
    <BrowserRouter>
    <ScrollToTop />
      <Navbar />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/tv" element={<TVSeriesPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/media/:mediaType/:tmdbId" element={<MediaDetailsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/anime" element={<AnimePage />} />
        <Route path="/k-drama" element={<KDramaPage />} />

        <Route path="/api-test" element={<ApiTestPage />} />
        <Route path="*" element={<NotFoundPage />} />
        
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
