import { useState } from "react";
import { Link } from "react-router";

import WatchlistButton from "../components/WatchlistButton";
import ContentContainer from "../components/layout/ContentContainer";
import { BookmarkIcon } from "../components/navigation/NavigationIcons";
import { useAuth } from "../features/auth/authContext";
import { useWatchlist } from "../features/watchlist/watchlistContext";
import type { WatchlistItem } from "../types/watchlist";

function getMediaTypeLabel(mediaType: WatchlistItem["mediaType"]): string {
  return mediaType === "movie" ? "Movie" : "TV Series";
}

function formatExpiry(
  expiresAt: string,
  currentTime: number,
): string {
  const expiryTime = Date.parse(expiresAt);
  const remainingMilliseconds = expiryTime - currentTime;
  const remainingDays = Math.max(
    1,
    Math.ceil(remainingMilliseconds / (24 * 60 * 60 * 1000)),
  );

  return remainingDays === 1
    ? "Expires in 1 day"
    : `Expires in ${remainingDays} days`;
}

function WatchlistCard({
  item,
  currentTime,
}: {
  item: WatchlistItem;
  currentTime: number;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-sky-400/30 hover:shadow-sky-950/25 focus-within:border-sky-400/50">
      <Link
        to={`/media/${item.mediaType}/${item.tmdbId}`}
        aria-label={`View details for ${item.title}`}
        className="block focus:outline-none"
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-[linear-gradient(145deg,rgba(14,165,233,0.12),rgba(15,23,42,0.96))]">
          {item.posterUrl ? (
            <img
              src={item.posterUrl}
              alt={`Poster for ${item.title}`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex h-full items-center justify-center px-5 text-center text-sm font-semibold text-slate-400">
              Poster unavailable
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

          <span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-200 backdrop-blur-md">
            {getMediaTypeLabel(item.mediaType)}
          </span>
        </div>

        <div className="px-4 py-4">
          <h2 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-white">
            {item.title}
          </h2>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
            <span>{item.year || "Year unavailable"}</span>
            <span aria-hidden="true">•</span>
            <span>{formatExpiry(item.expiresAt, currentTime)}</span>
          </div>
        </div>
      </Link>

      <WatchlistButton
        item={item}
        className="absolute right-3 top-3 z-10"
      />
    </article>
  );
}

function WatchlistPage() {
  const auth = useAuth();
  const {
    items,
    itemCount,
    maxItems,
    expiryDays,
    storageAvailable,
    clearItems,
  } = useWatchlist();

  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [currentTime] = useState(() => Date.now());

  function handleClear() {
    if (clearItems()) {
      setIsConfirmingClear(false);
    }
  }

  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-slate-950 pb-20 pt-12 text-white sm:pt-16"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_16%_0%,rgba(14,165,233,0.18),transparent_40%),radial-gradient(circle_at_84%_8%,rgba(79,70,229,0.12),transparent_35%)]" />

      <ContentContainer className="relative max-w-[1320px]">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.78),rgba(15,23,42,0.97)_58%,rgba(15,23,42,0.9))] p-6 shadow-2xl shadow-black/25 sm:p-9 lg:p-11">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-sky-300">
                <BookmarkIcon className="h-4 w-4" />
                Your Watchlist
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                Keep the titles you want to return to.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Save movies and series while you browse, then open them again
                from one focused place.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 backdrop-blur-sm">
              <span className="text-3xl font-black text-white">
                {itemCount}
              </span>
              <span className="text-sm leading-5 text-slate-400">
                of {maxItems}
                <br />
                saved
              </span>
            </div>
          </div>
        </section>

        <section
          aria-label="Watchlist storage information"
          className={`mt-6 rounded-3xl border p-5 sm:p-6 ${
            storageAvailable
              ? "border-sky-300/15 bg-sky-400/[0.07]"
              : "border-red-300/20 bg-red-500/10"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">
                {storageAvailable ? "Saved on this browser" : "Storage unavailable"}
              </p>

              <p className="mt-2 text-sm leading-7 text-slate-300">
                {storageAvailable
                  ? `Each title stays on this browser for ${expiryDays} days. This first Watchlist phase supports up to ${maxItems} titles and synchronizes between FilmGeezer tabs in the same browser.`
                  : "FilmGeezer cannot currently access local browser storage. Check private-browsing or site-storage restrictions before trying again."}
              </p>

              {storageAvailable && (
                <p className="mt-2 text-sm leading-7 text-slate-400">
                  {auth.status === "authenticated"
                    ? "Your account is signed in, but cross-device MongoDB synchronization is the next Watchlist phase. Until then, these titles remain local to this browser."
                    : "You do not need an account for this temporary list. Account-based saving and safe guest-list merging will be connected in the next phase."}
                </p>
              )}
            </div>

            {itemCount > 0 && (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {isConfirmingClear ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingClear(false)}
                      className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleClear}
                      className="min-h-11 rounded-full bg-red-500 px-4 text-sm font-bold text-white transition hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      Clear {itemCount} {itemCount === 1 ? "title" : "titles"}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsConfirmingClear(true)}
                    className="min-h-11 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-bold text-slate-200 transition hover:border-red-300/35 hover:bg-red-500/10 hover:text-red-100 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  >
                    Clear Watchlist
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {items.length === 0 ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-white/10 bg-slate-900/55 px-6 py-14 text-center sm:px-10 sm:py-20">
            <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
              <BookmarkIcon className="h-8 w-8" />
            </span>

            <h2 className="mt-6 text-2xl font-black tracking-tight sm:text-3xl">
              Your Watchlist is ready for its first title.
            </h2>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
              Use the bookmark control on any media card or details page. Saved
              titles will appear here immediately.
            </p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/search"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                Search FilmGeezer
              </Link>

              <Link
                to="/movies"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 text-sm font-bold text-slate-100 transition hover:border-sky-300/50 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                Browse Movies
              </Link>
            </div>
          </section>
        ) : (
          <section aria-labelledby="saved-titles-heading" className="mt-9">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-300">
                Saved titles
              </p>

              <h2
                id="saved-titles-heading"
                className="mt-2 text-2xl font-black tracking-tight sm:text-3xl"
              >
                Continue exploring
              </h2>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((item) => (
                <WatchlistCard
                  key={`${item.mediaType}:${item.tmdbId}`}
                  item={item}
                  currentTime={currentTime}
                />
              ))}
            </div>
          </section>
        )}
      </ContentContainer>
    </main>
  );
}

export default WatchlistPage;
