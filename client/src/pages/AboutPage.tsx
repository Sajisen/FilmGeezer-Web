import ContentContainer from "../components/layout/ContentContainer";

const TMDB_LOGO_URL =
  "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

function AboutPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-slate-950 py-12 text-white sm:py-14"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_15%_0%,rgba(14,165,233,0.14),transparent_38%),radial-gradient(circle_at_85%_10%,rgba(79,70,229,0.10),transparent_34%)]" />

      <ContentContainer className="relative max-w-[1180px]">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.72),rgba(15,23,42,0.94)_55%,rgba(15,23,42,0.86))] p-6 shadow-2xl shadow-black/25 sm:p-9 lg:p-11">
          <div className="flex items-center gap-3">
            <img
              src="/filmgeezer-logo-v1.webp"
              alt=""
              className="h-10 w-10 rounded-xl object-cover shadow-lg shadow-sky-950/35"
            />
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300 sm:text-sm">
              About FilmGeezer
            </p>
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            One place to discover what to watch next.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            FilmGeezer brings movies, TV series, anime, and K-dramas together
            in a focused, cinematic browsing experience.
          </p>
        </section>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-slate-900/65 p-5 sm:p-6">
            <h2 className="font-bold text-white">Discover</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Explore trending titles and curated categories without mixing
              every kind of entertainment into one feed.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/65 p-5 sm:p-6">
            <h2 className="font-bold text-white">Understand</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Open a title to see details, trailers, episodes, provider
              availability, and available FilmGeezer links before you watch.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/65 p-5 sm:p-6">
            <h2 className="font-bold text-white">Keep your place</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Save titles to your Watchlist as a guest or sign in to keep a
              larger Watchlist available across your devices.
            </p>
          </article>
        </div>

        <section className="mt-5 rounded-[1.75rem] border border-white/10 bg-slate-900/60 p-5 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">
            Where the information comes from
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="https://www.themoviedb.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-lg bg-white px-3 py-2 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  aria-label="Open The Movie Database website"
                >
                  <img
                    src={TMDB_LOGO_URL}
                    alt="TMDB"
                    className="h-4 w-auto sm:h-[1.125rem]"
                  />
                </a>

                <span className="text-sm text-slate-400">
                  Movie & TV data
                </span>
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                This product uses the TMDB API but is not endorsed or certified
                by TMDB.
              </p>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                FilmGeezer uses TMDB for movie and TV information, artwork, and
                related discovery data.
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-sm leading-6 text-slate-400">
                Streaming-provider availability shown through TMDB is powered
                by <span className="font-semibold text-slate-200">JustWatch</span>.
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Selected anime character information may be supplemented by
                <span className="font-semibold text-slate-200"> AniList</span>.
              </p>
            </div>
          </div>
        </section>
      </ContentContainer>
    </main>
  );
}

export default AboutPage;
