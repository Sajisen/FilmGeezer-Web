import { Link } from "react-router";
import ContentContainer from "./layout/ContentContainer";

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 py-10 text-white">
      <ContentContainer>
        <div className="grid gap-8 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link to="/" className="text-2xl font-bold">
              Film<span className="text-sky-400">Geezer</span>
            </Link>

            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              An entertainment discovery app built as a full-stack learning
              project with React, TypeScript, Node.js, Express, and TMDB.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white">Explore</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <Link to="/" className="transition hover:text-white">
                Home
              </Link>

              <Link to="/movies" className="transition hover:text-white">
                Movies
              </Link>

              <Link to="/tv" className="transition hover:text-white">
                TV Series
              </Link>
              <Link to="/anime" className="transition hover:text-white">
                Anime
              </Link>

              <Link to="/k-drama" className="transition hover:text-white">
                K-Drama
              </Link>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white">Support</h3>

            <div className="mt-4 flex flex-col gap-3 text-sm text-slate-400">
              <Link to="/help" className="transition hover:text-white">
                Help
              </Link>

              <Link to="/contact" className="transition hover:text-white">
                Contact
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm leading-6 text-slate-500">
          <p>© {new Date().getFullYear()} FilmGeezer Web | Using TMDB APIs</p>
        </div>
      </ContentContainer>
    </footer>
  );
}

export default Footer;
