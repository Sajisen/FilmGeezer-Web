import { useMemo, useState } from "react";
import { Link } from "react-router";

import WatchlistButton from "../components/WatchlistButton";
import {
  BookmarkIcon,
  InfoIcon,
  WarningIcon,
} from "../components/navigation/NavigationIcons";
import { useWatchlist } from "../features/watchlist/watchlistContext";
import type { WatchlistItem } from "../types/watchlist";

type WatchlistFilter = "all" | "movie" | "tv";

function getMediaTypeLabel(mediaType: WatchlistItem["mediaType"]): string {
  return mediaType === "movie" ? "Movie" : "TV Series";
}

function formatExpiry(
  expiresAt: string | null,
  currentTime: number,
): string {
  if (!expiresAt) {
    return "Saved";
  }

  const expiryTime = Date.parse(expiresAt);
  const remainingMilliseconds = expiryTime - currentTime;
  const remainingDays = Math.max(
    1,
    Math.ceil(remainingMilliseconds / (24 * 60 * 60 * 1_000)),
  );

  return remainingDays === 1 ? "1 day left" : `${remainingDays} days left`;
}

function WatchlistCard({
  item,
  currentTime,
}: {
  item: WatchlistItem;
  currentTime: number;
}) {
  return (
    <article className="group relative min-w-0 overflow-hidden rounded-[1.15rem] border border-white/10 bg-slate-900/72 shadow-lg shadow-black/20 transition duration-300 hover:-translate-y-1 hover:border-sky-300/30 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-sky-950/25 focus-within:border-sky-300/50">
      <Link
        to={`/media/${item.mediaType}/${item.tmdbId}`}
        aria-label={`View details for ${item.title}`}
        className="block rounded-[1.15rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300"
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
            <div className="flex h-full items-center justify-center px-4 text-center text-xs font-semibold text-slate-400">
              Poster unavailable
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />

          <span className="absolute bottom-2.5 left-2.5 rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-slate-200 backdrop-blur-md">
            {getMediaTypeLabel(item.mediaType)}
          </span>
        </div>

        <div className="flex min-h-[5.4rem] flex-col px-3 py-3 sm:min-h-[6rem] sm:px-3.5">
          <h2 className="line-clamp-2 text-sm font-bold leading-5 text-white sm:text-[0.95rem]">
            {item.title}
          </h2>

          <div className="mt-auto flex min-w-0 items-center gap-1.5 pt-2 text-[0.68rem] font-medium text-slate-400 sm:text-xs">
            <span className="truncate">{item.year || "Year unavailable"}</span>
            <span aria-hidden="true" className="text-slate-600">
              •
            </span>
            <span className="truncate">
              {formatExpiry(item.expiresAt, currentTime)}
            </span>
          </div>
        </div>
      </Link>

      <WatchlistButton
        item={item}
        className="absolute right-2.5 top-2.5 z-10 shadow-black/45"
      />
    </article>
  );
}

function WatchlistCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-[1.15rem] border border-white/10 bg-slate-900/55"
    >
      <div className="skeleton-placeholder aspect-[2/3]" />
      <div className="space-y-2 px-3 py-3">
        <div className="skeleton-placeholder h-4 w-4/5 rounded-full" />
        <div className="skeleton-placeholder h-3 w-3/5 rounded-full" />
      </div>
    </div>
  );
}

function WatchlistPage() {
  const {
    items,
    itemCount,
    maxItems,
    expiryDays,
    storageMode,
    storageAvailable,
    pendingGuestCount,
    syncStatus,
    isMutationPending,
    clearItems,
    retrySync,
  } = useWatchlist();

  const [activeFilter, setActiveFilter] = useState<WatchlistFilter>("all");
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [currentTime] = useState(() => Date.now());

  const isAccountWatchlist = storageMode === "account";
  const isInitialAccountLoad =
    isAccountWatchlist && syncStatus === "loading" && items.length === 0;

  const movieCount = useMemo(
    () => items.filter((item) => item.mediaType === "movie").length,
    [items],
  );

  const tvCount = itemCount - movieCount;

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") {
      return items;
    }

    return items.filter((item) => item.mediaType === activeFilter);
  }, [activeFilter, items]);

  const capacityPercentage = Math.min(
    100,
    Math.round((itemCount / Math.max(1, maxItems)) * 100),
  );

  const showAccountError = isAccountWatchlist && syncStatus === "error";
  const showGuestStorageError = !isAccountWatchlist && !storageAvailable;
  const showGuestInformation =
    !isAccountWatchlist && storageAvailable && itemCount > 0;
  const showStatusPanel =
    showAccountError || showGuestStorageError || showGuestInformation;

  async function handleClear() {
    if (await clearItems()) {
      setIsConfirmingClear(false);
      setActiveFilter("all");
    }
  }

  const mobileSummary =
    itemCount === 0
      ? "Save movies and series for later."
      : `${itemCount} ${itemCount === 1 ? "title" : "titles"} saved.`;

  function renderFilterButtons(fullWidth = false) {
    return (
      <div
        role="group"
        aria-label="Filter saved titles"
        className={`inline-flex rounded-xl border border-white/10 bg-slate-900/70 p-1 ${
          fullWidth ? "w-full" : "w-full sm:w-auto"
        }`}
      >
        {([
          ["all", "All", itemCount],
          ["movie", "Movies", movieCount],
          ["tv", "TV Series", tvCount],
        ] as const).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveFilter(value)}
            aria-pressed={activeFilter === value}
            className={`min-h-9 flex-1 rounded-lg px-2 text-xs font-bold transition sm:px-3 ${
              activeFilter === value
                ? "bg-sky-500 text-white shadow-sm shadow-sky-950/40"
                : "text-slate-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className={value === "tv" ? "sm:hidden" : ""}>
              {value === "tv" ? "TV" : label}
            </span>
            {value === "tv" && (
              <span className="hidden sm:inline">{label}</span>
            )}{" "}
            <span className="opacity-70">{count}</span>
          </button>
        ))}
      </div>
    );
  }

  function renderDesktopClearControls() {
    return (
      <div className="flex h-10 w-[10.75rem] shrink-0 items-center justify-end gap-2">
        {isConfirmingClear ? (
          <>
            <button
              type="button"
              onClick={() => setIsConfirmingClear(false)}
              disabled={isMutationPending}
              className="h-9 min-w-[4.75rem] whitespace-nowrap rounded-full border border-white/15 px-3 text-xs font-bold text-slate-300 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => void handleClear()}
              disabled={isMutationPending}
              aria-label="Confirm clearing all saved titles"
              className="h-9 min-w-[4.75rem] whitespace-nowrap rounded-full border border-red-300/25 bg-red-400/10 px-3 text-xs font-bold text-red-200 transition hover:bg-red-400/15 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-60"
            >
              {isMutationPending ? "Clearing…" : "Clear"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsConfirmingClear(true)}
            disabled={isMutationPending}
            className="h-9 whitespace-nowrap rounded-full border border-white/12 bg-white/[0.03] px-4 text-xs font-bold text-slate-400 transition hover:border-red-300/25 hover:bg-red-400/[0.07] hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
          >
            Clear all
          </button>
        )}
      </div>
    );
  }

  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-slate-950 pb-16 pt-5 text-white sm:pb-20 sm:pt-14"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_18%_0%,rgba(14,165,233,0.16),transparent_39%),radial-gradient(circle_at_82%_4%,rgba(79,70,229,0.11),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <header className="border-b border-white/10 pb-4 sm:pb-8">
          <div className="sm:hidden">
            <div className="flex items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-[1.7rem] font-black tracking-tight">
                  Your Watchlist
                </h1>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {mobileSummary}
                </p>
              </div>

              <div className="w-[8.25rem] shrink-0 rounded-xl border border-white/10 bg-slate-900/65 px-3 py-2.5 shadow-lg shadow-black/15 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-300">
                    {itemCount}/{maxItems}
                  </span>
                  <span className="text-base font-black text-white">
                    {capacityPercentage}%
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-label="Watchlist capacity used"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={capacityPercentage}
                  className="mt-2 h-1 overflow-hidden rounded-full bg-white/10"
                >
                  <div
                    aria-hidden="true"
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-[width] duration-300"
                    style={{ width: `${capacityPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="hidden flex-row items-end justify-between gap-6 sm:flex xl:hidden">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-sky-300">
                <BookmarkIcon className="h-4 w-4" />
                Watchlist
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight">
                Saved for your next watch.
              </h1>

              <p className="mt-3 max-w-xl text-base leading-7 text-slate-400">
                Keep movies and series close without losing your place in
                FilmGeezer.
              </p>
            </div>

            <div className="w-auto min-w-[16rem] max-w-[17rem] rounded-2xl border border-white/10 bg-slate-900/65 p-4 shadow-lg shadow-black/20 backdrop-blur-sm">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Capacity
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-300">
                    {itemCount} of {maxItems} titles
                  </p>
                </div>

                <span className="text-2xl font-black text-white">
                  {capacityPercentage}%
                </span>
              </div>

              <div
                role="progressbar"
                aria-label="Watchlist capacity used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={capacityPercentage}
                className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  aria-hidden="true"
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-[width] duration-300"
                  style={{ width: `${capacityPercentage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(0,1fr)_minmax(0,36.5rem)] items-end gap-8 xl:grid">
            <div className="min-w-0 max-w-[39rem]">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-sky-300">
                <BookmarkIcon className="h-4 w-4" />
                Watchlist
              </div>

              <h1
                className={`mt-4 whitespace-nowrap font-black leading-tight tracking-tight ${
                  items.length > 0 ? "text-[2.45rem]" : "text-[2.65rem]"
                }`}
              >
                Saved for your next watch.
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
                Keep movies and series close without losing your place in
                FilmGeezer.
              </p>
            </div>

            <div
              className={`grid gap-3 ${
                items.length > 0
                  ? "grid-cols-[14.25rem_minmax(0,1fr)]"
                  : "grid-cols-[14.25rem] justify-end"
              }`}
            >
              <div
                className={`flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/65 p-4 shadow-lg shadow-black/20 backdrop-blur-sm ${
                  items.length > 0 ? "min-h-[7.75rem]" : "h-[7rem]"
                }`}
              >
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Capacity
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-300">
                      {itemCount} of {maxItems} titles
                    </p>
                  </div>

                  <span className="text-2xl font-black text-white">
                    {capacityPercentage}%
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-label="Watchlist capacity used"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={capacityPercentage}
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"
                >
                  <div
                    aria-hidden="true"
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-cyan-300 transition-[width] duration-300"
                    style={{ width: `${capacityPercentage}%` }}
                  />
                </div>
              </div>

              {items.length > 0 && (
                <div className="flex min-h-[7.75rem] min-w-0 flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/45 p-3.5 shadow-lg shadow-black/15 backdrop-blur-sm">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Saved titles
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-300">
                        {filteredItems.length} shown
                      </p>
                    </div>

                    {renderDesktopClearControls()}
                  </div>

                  <div className="mt-2.5 w-full">
                    {renderFilterButtons(true)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {showStatusPanel && (
          <section
            aria-label="Watchlist information"
            className={`mt-3 rounded-2xl border px-3.5 py-3 sm:mt-5 sm:px-5 sm:py-4 ${
              showAccountError || showGuestStorageError
                ? "border-red-300/20 bg-red-400/[0.07]"
                : "border-sky-300/15 bg-sky-400/[0.055]"
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border sm:mt-0.5 sm:h-9 sm:w-9 ${
                    showAccountError || showGuestStorageError
                      ? "border-red-300/20 bg-red-400/10 text-red-300"
                      : "border-sky-300/20 bg-sky-400/10 text-sky-300"
                  }`}
                >
                  {showAccountError || showGuestStorageError ? (
                    <WarningIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <InfoIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">
                    {showAccountError
                      ? "We couldn't refresh your Watchlist"
                      : showGuestStorageError
                        ? "Saving is turned off"
                        : "Saved on this device"}
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-400 sm:mt-1 sm:text-sm sm:leading-6">
                    {showAccountError
                      ? "Your saved titles are still shown. Check your connection, then try again."
                      : showGuestStorageError
                        ? "Allow site storage in your browser, then try saving again."
                        : `${itemCount === 1 ? "This title stays" : "These titles stay"} here for ${expiryDays} days. Sign in to keep them longer and save up to 50.`}
                  </p>
                </div>
              </div>

              {showAccountError && (
                <button
                  type="button"
                  onClick={() => void retrySync()}
                  disabled={isMutationPending}
                  className="min-h-10 shrink-0 self-start rounded-full border border-sky-300/30 bg-sky-400/10 px-4 text-sm font-bold text-sky-100 transition hover:bg-sky-400/15 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60 sm:self-auto"
                >
                  Try again
                </button>
              )}
            </div>
          </section>
        )}

        {isAccountWatchlist && pendingGuestCount > 0 && (
          <section
            aria-label="Titles waiting to be saved"
            className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/[0.07] px-3.5 py-3 sm:mt-4 sm:px-5 sm:py-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  aria-hidden="true"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-400/10 text-amber-300 sm:mt-0.5 sm:h-9 sm:w-9"
                >
                  <BookmarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>

                <div>
                  <p className="text-sm font-bold text-white">
                    {pendingGuestCount} more {pendingGuestCount === 1 ? "title is" : "titles are"} waiting
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-slate-400 sm:mt-1 sm:text-sm sm:leading-6">
                    Your account is full, so {pendingGuestCount === 1 ? "it is" : "they are"} still saved on this device. Remove {pendingGuestCount === 1 ? "a title" : "some titles"}, then try again.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void retrySync()}
                disabled={isMutationPending}
                className="min-h-10 shrink-0 self-start rounded-full border border-amber-300/30 bg-amber-400/10 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-400/15 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-60 sm:self-auto"
              >
                Save them now
              </button>
            </div>
          </section>
        )}

        {isInitialAccountLoad ? (
          <section aria-live="polite" className="mt-5 sm:mt-8 lg:mt-6">
            <p className="sr-only">Loading your Watchlist…</p>
            <div className="grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {Array.from({ length: 6 }, (_, index) => (
                <WatchlistCardSkeleton key={index} />
              ))}
            </div>
          </section>
        ) : items.length === 0 ? (
          <section className="mt-5 rounded-3xl border border-dashed border-white/10 bg-slate-900/45 px-5 py-8 text-center sm:mt-8 sm:px-10 sm:py-14 xl:mt-8 xl:px-12 xl:py-16">
            <div className="mx-auto flex max-w-xl flex-col items-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300 sm:h-14 sm:w-14 xl:h-16 xl:w-16">
                <BookmarkIcon className="h-5 w-5 sm:h-7 sm:w-7" />
              </span>

              <h2 className="mt-4 text-xl font-black tracking-tight sm:mt-5 sm:text-3xl xl:text-[2rem]">
                Start building your Watchlist.
              </h2>

              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400 sm:mt-3 sm:text-base sm:leading-7">
                Save a movie or series while browsing, and it will appear here.
              </p>

              <Link
                to="/search"
                className="mx-auto mt-6 inline-flex min-h-11 w-full max-w-[20rem] items-center justify-center rounded-full bg-sky-500 px-7 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 sm:mt-7 sm:w-auto"
              >
                Search FilmGeezer
              </Link>
            </div>
          </section>
        ) : (
          <section aria-label="Saved titles" className="mt-5 sm:mt-8 lg:mt-6">
            <div className="border-b border-white/10 pb-4 sm:flex sm:items-end sm:justify-between sm:gap-4 sm:pb-5 xl:hidden">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="hidden text-xs font-bold uppercase tracking-[0.2em] text-sky-300 sm:block">
                    Your collection
                  </p>
                  <h2 className="text-xl font-black tracking-tight sm:mt-1.5 sm:text-3xl">
                    Saved titles
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 sm:hidden">
                  {isConfirmingClear ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClear(false)}
                        disabled={isMutationPending}
                        className="min-h-9 rounded-full px-3 text-xs font-bold text-slate-400 transition hover:bg-white/5 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleClear()}
                        disabled={isMutationPending}
                        className="min-h-9 rounded-full border border-red-300/20 bg-red-400/10 px-3 text-xs font-bold text-red-200 transition hover:bg-red-400/15 focus:outline-none focus:ring-2 focus:ring-red-300 disabled:opacity-60"
                      >
                        {isMutationPending ? "Clearing…" : "Clear"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingClear(true)}
                      disabled={isMutationPending}
                      className="min-h-9 rounded-full px-3 text-xs font-bold text-slate-500 transition hover:bg-red-400/[0.07] hover:text-red-200 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:opacity-60"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 sm:mt-0 sm:justify-end">
                {renderFilterButtons()}

                <div className="hidden sm:block">
                  {renderDesktopClearControls()}
                </div>
              </div>
            </div>

            {filteredItems.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 px-5 py-8 text-center sm:mt-6 sm:py-10 xl:mt-0">
                <p className="text-base font-bold text-white">
                  No {activeFilter === "movie" ? "movies" : "TV series"} saved.
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Choose another filter or save a title while browsing.
                </p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3 min-[480px]:grid-cols-3 sm:mt-6 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:mt-0 xl:grid-cols-6">
                {filteredItems.map((item) => (
                  <WatchlistCard
                    key={`${item.mediaType}:${item.tmdbId}`}
                    item={item}
                    currentTime={currentTime}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

export default WatchlistPage;