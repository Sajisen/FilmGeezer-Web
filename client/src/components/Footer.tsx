import { Link } from "react-router";

const footerLinkClassName =
  "text-sm text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-[1600px] px-5 py-10 sm:px-7 sm:py-11 lg:px-10 xl:px-14">
        <div className="grid gap-y-10 md:grid-cols-2 md:gap-x-12 lg:grid-cols-[minmax(300px,1.45fr)_repeat(3,minmax(140px,0.7fr))] lg:gap-x-14 xl:gap-x-20 2xl:gap-x-24">
          <div className="max-w-[360px]">
            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <img
                src="/filmgeezer-logo-v1.webp"
                alt=""
                className="h-9 w-9 rounded-lg object-cover"
              />
              <span className="text-xl font-black tracking-tight">
                Film<span className="text-sky-400">Geezer</span>
              </span>
            </Link>

            <p className="mt-4 text-sm leading-6 text-slate-400">
              Find movies, TV series, anime, and K-dramas without turning
              discovery into clutter.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-200">Explore</h2>
            <nav
              aria-label="Footer explore navigation"
              className="mt-4 flex flex-col items-start gap-3"
            >
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
            <h2 className="text-sm font-bold text-slate-200">FilmGeezer</h2>
            <nav
              aria-label="Footer FilmGeezer navigation"
              className="mt-4 flex flex-col items-start gap-3"
            >
              <Link to="/about" className={footerLinkClassName}>
                About
              </Link>
              <Link to="/contact" className={footerLinkClassName}>
                Contact & Support
              </Link>
              <Link to="/watchlist" className={footerLinkClassName}>
                Watchlist
              </Link>
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-200">Legal</h2>
            <nav
              aria-label="Footer legal navigation"
              className="mt-4 flex flex-col items-start gap-3"
            >
              <Link to="/privacy" className={footerLinkClassName}>
                Privacy
              </Link>
              <Link to="/terms" className={footerLinkClassName}>
                Terms
              </Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 border-t border-white/[0.08] pt-5">
          <div className="grid gap-3 text-xs leading-5 text-slate-500 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-x-7">
            <p>© {new Date().getFullYear()} FilmGeezer</p>

            <p className="md:text-center">
              Created by{" "}
              <span className="font-medium text-slate-400">
                Sajitha | Sajisen
              </span>
            </p>

            <p className="md:text-right">
              Movie & TV information uses TMDB. Streaming availability is
              powered by JustWatch.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
