function HelpPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-14 text-white sm:px-6 lg:px-8">
      <section className="max-w-4xl">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
          Help Center
        </p>

        <h1 className="text-4xl font-bold">How FilmGeezer Web works</h1>

        <p className="mt-4 max-w-2xl text-slate-300">
          This page will explain how users can search movies and TV series, view
          details, use provider links, and manage their watchlist later.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">Search Titles</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Use the search bar to find movies and TV series. FilmGeezer loads
              matching titles from TMDB and lets you open their details pages.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">View Details</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Click a card to open the details page. The details page shows the
              poster, title, rating, genres, overview, and provider links.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">Provider Links</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Provider links are currently mock data. Later, they will come from
              MongoDB using media type and TMDB ID.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-bold">Watchlist</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Watchlist support will be added after authentication. Users will
              be able to save movies and TV series to their account.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default HelpPage;
