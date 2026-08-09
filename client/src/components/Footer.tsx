import { Link } from "react-router";
import ContentContainer from "./layout/ContentContainer";

const footerLinkClassName = "transition hover:text-white";

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 py-10 text-white">
      <ContentContainer>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="text-2xl font-bold">
              Film<span className="text-sky-400">Geezer</span>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              Discover movies, TV series, anime, and K-dramas in one focused
              entertainment experience.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-white">Explore</h2>

            <nav
              aria-label="Footer explore navigation"
              className="mt-4 flex flex-col gap-3 text-sm text-slate-400"
            >
              <Link to="/" className={footerLinkClassName}>
                Home
              </Link>
              <Link to="/movies" className={footerLinkClassName}>
                Movies
              </Link>
              <Link to="/tv" className={footerLinkClassName}>
                TV Series
              </Link>
              <Link to="/anime" className={footerLinkClassName}>
                Anime
              </Link>
              <Link to="/k-drama" className={footerLinkClassName}>
                K-Drama
              </Link>
            </nav>
          </div>

          <div>
            <h2 className="font-semibold text-white">FilmGeezer</h2>

            <nav
              aria-label="Footer FilmGeezer navigation"
              className="mt-4 flex flex-col gap-3 text-sm text-slate-400"
            >
              <Link to="/about" className={footerLinkClassName}>
                About
              </Link>
              <Link to="/contact" className={footerLinkClassName}>
                Contact
              </Link>
            </nav>
          </div>

          <div>
            <h2 className="font-semibold text-white">Legal</h2>

            <nav
              aria-label="Footer legal navigation"
              className="mt-4 flex flex-col gap-3 text-sm text-slate-400"
            >
              <Link to="/privacy" className={footerLinkClassName}>
                Privacy Policy
              </Link>
              <Link to="/terms" className={footerLinkClassName}>
                Terms of Use
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-sm leading-6 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} FilmGeezer Web</p>
          <p>
            Entertainment data includes TMDB. Provider availability data is
            powered by JustWatch.
          </p>
        </div>
      </ContentContainer>
    </footer>
  );
}

export default Footer;
