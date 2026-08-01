import ContentContainer from "../components/layout/ContentContainer";

function AboutPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-slate-950 py-14 text-white sm:py-18"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_15%_0%,rgba(14,165,233,0.14),transparent_38%),radial-gradient(circle_at_85%_10%,rgba(79,70,229,0.10),transparent_34%)]" />

      <ContentContainer className="relative max-w-[1100px]">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.72),rgba(15,23,42,0.94)_55%,rgba(15,23,42,0.86))] p-6 shadow-2xl shadow-black/25 sm:p-9 lg:p-12">
          <div className="flex items-center gap-3">
            <img
              src="/filmgeezer-logo7.png"
              alt=""
              className="h-11 w-11 rounded-xl object-cover shadow-lg shadow-sky-950/35"
            />
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-300">
              About FilmGeezer
            </p>
          </div>

          <h1 className="mt-7 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            One place to discover what to watch next.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            FilmGeezer brings movies, TV series, anime, and K-dramas together in a focused, cinematic browsing experience.
          </p>
        </section>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="font-bold text-white">
              Discover
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Explore trending titles and curated categories without mixing every type of entertainment into one feed.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="font-bold text-white">
              Understand
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Open a title to see the details, trailers, episodes, and available FilmGeezer links that matter before you watch.
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
            <h2 className="font-bold text-white">
              Keep your place
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              FilmGeezer accounts securely preserve your identity today and will support personal Watchlists across devices next.
            </p>
          </article>
        </div>
      </ContentContainer>
    </main>
  );
}

export default AboutPage;
