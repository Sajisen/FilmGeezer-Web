import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useSeasonDetails } from "../../hooks/useSeasonDetails";
import type { MediaSeasonSummary } from "../../types/media";
import EpisodeDetailsPanel from "./EpisodeDetailsPanel";
import {
  getEpisodeRatingVisual,
  hasEpisodeRating,
} from "../../utils/episodeRating";

interface SeasonEpisodeRowProps {
  tmdbId: number;
  seasonSummary: MediaSeasonSummary;
  activeEpisodeKey: string | null;
  onEpisodeChange: (episodeKey: string | null) => void;
}

interface ArrowIconProps {
  direction: "left" | "right";
}

function ArrowIcon({ direction }: ArrowIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none">
      <path
        d={direction === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function getPreferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function formatVotes(voteCount: number) {
  return new Intl.NumberFormat("en-US").format(voteCount);
}

function SeasonRowSkeleton({ cellCount }: { cellCount: number }) {
  return (
    <div role="status" className="flex gap-1.5 overflow-hidden sm:gap-2">
      <span className="sr-only">Loading season episodes</span>

      {Array.from({
        length: Math.min(Math.max(cellCount, 5), 12),
      }).map((_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="skeleton-placeholder h-14 w-14 min-w-14 rounded-lg sm:h-[3.75rem] sm:w-[3.75rem] sm:min-w-[3.75rem]"
        />
      ))}
    </div>
  );
}

function SeasonEpisodeRow({
  tmdbId,
  seasonSummary,
  activeEpisodeKey,
  onEpisodeChange,
}: SeasonEpisodeRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const railRef = useRef<HTMLDivElement>(null);

  const railId = useId();
  const instructionsId = useId();
  const detailsPanelId = useId();

  const [shouldLoad, setShouldLoad] = useState(
    () =>
      typeof window === "undefined" ||
      !("IntersectionObserver" in window),
  );

  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (shouldLoad) {
      return;
    }

    const row = rowRef.current;

    if (!row || !("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "250px 0px",
      },
    );

    observer.observe(row);

    return () => {
      observer.disconnect();
    };
  }, [shouldLoad]);

  const { season, isLoading, errorMessage, retry } = useSeasonDetails(
    tmdbId,
    seasonSummary.seasonNumber,
    shouldLoad,
  );

  const episodeSignature =
    season?.episodes.map((episode) => episode.tmdbEpisodeId).join("|") ?? "";

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const threshold = 4;

    const maximumScrollLeft = rail.scrollWidth - rail.clientWidth;

    setCanScrollLeft(rail.scrollLeft > threshold);

    setCanScrollRight(maximumScrollLeft - rail.scrollLeft > threshold);
  }, []);

  useEffect(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);

    resizeObserver.observe(rail);

    return () => {
      resizeObserver.disconnect();
    };
  }, [episodeSignature, updateScrollState]);

  function scrollByPage(direction: "left" | "right") {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      left:
        direction === "left"
          ? -rail.clientWidth * 0.82
          : rail.clientWidth * 0.82,

      behavior: getPreferredScrollBehavior(),
    });
  }

  function handleRailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByPage("left");
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByPage("right");
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();

      railRef.current?.scrollTo({
        left: 0,

        behavior: getPreferredScrollBehavior(),
      });

      return;
    }

    if (event.key === "End") {
      event.preventDefault();

      railRef.current?.scrollTo({
        left: railRef.current.scrollWidth,

        behavior: getPreferredScrollBehavior(),
      });
    }
  }

  const selectedEpisode =
    season?.episodes.find(
      (episode) =>
        `${seasonSummary.seasonNumber}:${episode.tmdbEpisodeId}` ===
        activeEpisodeKey,
    ) ?? null;

  return (
    <div
      ref={rowRef}
      className="border-t border-white/10 py-4 first:border-t-0"
    >
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <header className="flex w-14 shrink-0 flex-col items-center justify-center self-stretch text-center sm:w-16">
          <h3 className="text-lg font-black leading-none text-white sm:text-xl">
            S{seasonSummary.seasonNumber}
          </h3>

          <p className="mt-1.5 whitespace-nowrap text-[0.65rem] text-slate-500">
            {seasonSummary.episodeCount} eps
          </p>
        </header>

        <div className="min-w-0 flex-1">
          {!shouldLoad || isLoading ? (
            <SeasonRowSkeleton cellCount={seasonSummary.episodeCount} />
          ) : null}

          {!isLoading && errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3"
            >
              <p className="text-sm text-red-100">{errorMessage}</p>

              <button
                type="button"
                onClick={retry}
                className="mt-2 text-sm font-semibold text-red-100 underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !errorMessage && season && (
            <>
              <p id={instructionsId} className="sr-only">
                Use the left and right arrow keys to browse Season{" "}
                {seasonSummary.seasonNumber} episodes when the row is focused.
              </p>

              <div
                id={railId}
                ref={railRef}
                tabIndex={0}
                aria-label={`Season ${seasonSummary.seasonNumber} episode ratings`}
                aria-describedby={instructionsId}
                onScroll={updateScrollState}
                onKeyDown={handleRailKeyDown}
                className="media-row-scrollbar flex snap-x snap-proximity gap-1.5 overflow-x-auto overscroll-x-contain py-1.5 pr-3 focus-visible:rounded-xl sm:gap-2 sm:pr-4"
              >
                {season.episodes.map((episode) => {
                  const episodeKey = `${seasonSummary.seasonNumber}:${episode.tmdbEpisodeId}`;

                  const isSelected = activeEpisodeKey === episodeKey;

                  const hasRating = hasEpisodeRating(
                    episode.rating,
                    episode.voteCount,
                  );

                  const ratingVisual = getEpisodeRatingVisual(
                    episode.rating,
                    episode.voteCount,
                  );

                  return (
                    <button
                      key={episode.tmdbEpisodeId}
                      type="button"
                      title={`${episode.name}${
                        hasRating
                          ? ` — ${episode.rating.toFixed(1)} from ${formatVotes(
                              episode.voteCount,
                            )} votes`
                          : " — Not rated"
                      }`}
                      aria-expanded={isSelected}
                      aria-controls={isSelected ? detailsPanelId : undefined}
                      aria-label={`Season ${seasonSummary.seasonNumber}, Episode ${episode.episodeNumber}, ${episode.name}, ${ratingVisual.description}`}
                      onClick={() =>
                        onEpisodeChange(isSelected ? null : episodeKey)
                      }
                      className={`flex h-14 w-14 min-w-14 snap-start flex-col items-center justify-center rounded-lg border text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 sm:h-[3.75rem] sm:w-[3.75rem] sm:min-w-[3.75rem] ${
                        ratingVisual.className
                      } ${isSelected ? "ring-2 ring-inset ring-white" : ""}`}
                    >
                      <span className="text-[0.55rem] font-bold uppercase tracking-[0.12em] opacity-75">
                        E{String(episode.episodeNumber).padStart(2, "0")}
                      </span>

                      <span className="mt-1 text-base font-black leading-none sm:text-lg">
                        {hasRating ? episode.rating.toFixed(1) : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="media-row-desktop-control shrink-0 gap-1.5">
          <button
            type="button"
            aria-label={`Scroll Season ${seasonSummary.seasonNumber} episodes left`}
            aria-controls={railId}
            disabled={!canScrollLeft}
            onClick={() => scrollByPage("left")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-slate-950/75 text-white transition hover:border-sky-300/50 hover:bg-sky-500 disabled:cursor-default disabled:border-white/5 disabled:text-slate-700"
          >
            <ArrowIcon direction="left" />
          </button>

          <button
            type="button"
            aria-label={`Scroll Season ${seasonSummary.seasonNumber} episodes right`}
            aria-controls={railId}
            disabled={!canScrollRight}
            onClick={() => scrollByPage("right")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 bg-slate-950/75 text-white transition hover:border-sky-300/50 hover:bg-sky-500 disabled:cursor-default disabled:border-white/5 disabled:text-slate-700"
          >
            <ArrowIcon direction="right" />
          </button>
        </div>
      </div>

      {selectedEpisode && (
        <EpisodeDetailsPanel
          panelId={detailsPanelId}
          seasonNumber={seasonSummary.seasonNumber}
          episode={selectedEpisode}
          onClose={() => onEpisodeChange(null)}
        />
      )}
    </div>
  );
}

export default SeasonEpisodeRow;