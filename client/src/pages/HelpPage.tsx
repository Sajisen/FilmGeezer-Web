import { Link } from "react-router";

import ContentContainer from "../components/layout/ContentContainer";

interface HelpTopic {
  number: string;
  title: string;
  description: string;
}

const HELP_TOPICS: HelpTopic[] = [
  {
    number: "01",
    title: "Explore by category",
    description:
      "Browse dedicated Movie, TV Series, Anime, and K-Drama pages without mixing every type of entertainment into one feed.",
  },
  {
    number: "02",
    title: "Search and refine",
    description:
      "Search for a title or use FilmGeezer filters to narrow results by media type, genre, release year, and sorting preference.",
  },
  {
    number: "03",
    title: "Open the full details",
    description:
      "Select a card to see its overview, rating, genres, trailers, legal watch availability, characters, recommendations, and TV episode information when available.",
  },
  {
    number: "04",
    title: "Use FilmGeezer links",
    description:
      "When FilmGeezer links are available for a title, the details page loads them securely through the FilmGeezer API using its media type and TMDB ID.",
  },
];

function HelpPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-slate-950 py-14 text-white sm:py-18"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.16),transparent_38%),radial-gradient(circle_at_82%_8%,rgba(79,70,229,0.12),transparent_34%)]" />

      <ContentContainer className="relative max-w-[1100px]">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.76),rgba(15,23,42,0.96)_56%,rgba(15,23,42,0.88))] p-6 shadow-2xl shadow-black/25 sm:p-9 lg:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.26em] text-sky-300">
            FilmGeezer Help
          </p>

          <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            Find your way around FilmGeezer.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
            Discover titles, understand what each details page offers, and learn
            how your FilmGeezer account keeps important security controls in one
            place.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/search"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-bold text-white shadow-lg shadow-sky-950/35 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Search FilmGeezer
            </Link>

            <Link
              to="/about"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-bold text-slate-100 transition hover:border-sky-300/60 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              About FilmGeezer
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="help-browse-heading"
          className="mt-8"
        >
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Getting started
            </p>

            <h2
              id="help-browse-heading"
              className="mt-3 text-2xl font-black tracking-tight sm:text-3xl"
            >
              From discovery to the details page
            </h2>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {HELP_TOPICS.map((topic) => (
              <article
                key={topic.number}
                className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-xl shadow-black/10"
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="inline-flex h-11 min-w-11 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sm font-black text-sky-300"
                  >
                    {topic.number}
                  </span>

                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {topic.title}
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      {topic.description}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
              Your account
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight">
              Profile and security controls
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-400">
              After signing in, open your profile menu and select Profile or
              Settings. The account page lets you update your display name,
              change your password or email address, review active devices, end
              another device session, sign out, or deactivate your account.
            </p>

            <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-slate-300">
              Sensitive actions ask you to confirm your current password again.
              This protects your account even when a signed-in device is left
              unattended.
            </p>
          </article>

          <article className="rounded-3xl border border-sky-300/15 bg-[linear-gradient(145deg,rgba(14,165,233,0.12),rgba(15,23,42,0.82)_60%)] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
              Coming next
            </p>

            <h2 className="mt-3 text-2xl font-black tracking-tight">
              Persistent Watchlists
            </h2>

            <p className="mt-4 text-sm leading-7 text-slate-300">
              Watchlist saving is not connected yet. It is the next major
              FilmGeezer feature and will support both temporary guest saving and
              permanent account-based saving across devices.
            </p>

            <p className="mt-4 text-sm leading-7 text-slate-400">
              Until that feature is released, selecting a Watchlist button shows
              a notice and does not save the title.
            </p>
          </article>
        </section>
      </ContentContainer>
    </main>
  );
}

export default HelpPage;