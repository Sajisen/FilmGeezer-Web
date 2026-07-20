import { useEffect, useId, useMemo, useState } from "react";
import { useSeasonDetails } from "../../hooks/useSeasonDetails";
import type { MediaSeasonSummary } from "../../types/media";
import type { EpisodeDetails } from "../../types/season";
import MediaDetailsContainer from "./MediaDetailsContainer";

interface EpisodeExplorerSectionProps {
  tmdbId: number;
  seasons: MediaSeasonSummary[];
}

interface SeasonArrowIconProps {
  direction: "left" | "right";
}

const EPISODES_PER_RANGE = 50;

function SeasonArrowIcon({ direction }: SeasonArrowIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
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

function formatDate(dateText: string) {
  if (!dateText) {
    return "Date unavailable";
  }

  const date = new Date(`${dateText}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatRuntime(runtimeMinutes: number | null) {
  if (!runtimeMinutes || runtimeMinutes <= 0) {
    return "Runtime unavailable";
  }

  return `${runtimeMinutes} min`;
}

function formatVotes(voteCount: number) {
  return new Intl.NumberFormat("en-US").format(voteCount);
}

function getEpisodeRatingVisual(rating: number, voteCount: number) {
  if (rating <= 0 || voteCount <= 0) {
    return {
      label: "Unrated",

      className: "border-white/10 bg-slate-900/75 text-slate-300",
    };
  }

  if (rating >= 9) {
    return {
      label: "Exceptional",

      className:
        "border-cyan-200/60 bg-cyan-400 text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.16)]",
    };
  }

  if (rating >= 8) {
    return {
      label: "Great",

      className: "border-sky-300/45 bg-sky-500/85 text-white",
    };
  }

  if (rating >= 7) {
    return {
      label: "Good",

      className: "border-blue-300/35 bg-blue-600/80 text-white",
    };
  }

  if (rating >= 6) {
    return {
      label: "Mixed",

      className: "border-indigo-400/30 bg-indigo-800/80 text-indigo-50",
    };
  }

  return {
    label: "Low",

    className: "border-blue-900/75 bg-blue-950/90 text-blue-200",
  };
}

function EpisodeExplorerSkeleton() {
  return (
    <div role="status" className="mt-7">
      <span className="sr-only">Loading episode ratings</span>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({
          length: 4,
        }).map((_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="rounded-2xl border border-white/10 bg-slate-950/55 p-4"
          >
            <div className="skeleton-placeholder h-3 w-20 rounded-md" />

            <div className="skeleton-placeholder mt-3 h-5 w-28 rounded-md" />
          </div>
        ))}
      </div>

      <div className="mt-7 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
        {Array.from({
          length: 24,
        }).map((_, index) => (
          <div
            key={index}
            aria-hidden="true"
            className="skeleton-placeholder min-h-20 rounded-2xl"
          />
        ))}
      </div>

      <div className="mt-8 grid overflow-hidden rounded-3xl border border-white/10 bg-slate-950/50 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="skeleton-placeholder aspect-video lg:aspect-auto" />

        <div className="space-y-4 p-5 sm:p-6">
          <div className="skeleton-placeholder h-6 w-4/5 rounded-md" />

          <div className="skeleton-placeholder h-4 w-3/5 rounded-md" />

          <div className="space-y-2">
            <div className="skeleton-placeholder h-4 w-full rounded-md" />

            <div className="skeleton-placeholder h-4 w-11/12 rounded-md" />

            <div className="skeleton-placeholder h-4 w-4/5 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

function EpisodeExplorerSection({
  tmdbId,
  seasons,
}: EpisodeExplorerSectionProps) {
  const headingId = useId();

  const availableSeasons = useMemo(
    () =>
      [...seasons]
        .filter((season) => season.seasonNumber > 0)
        .sort(
          (firstSeason, secondSeason) =>
            firstSeason.seasonNumber - secondSeason.seasonNumber,
        ),

    [seasons],
  );

  const defaultSeasonNumber =
    availableSeasons.find((season) => season.episodeCount > 0)?.seasonNumber ??
    availableSeasons[0]?.seasonNumber ??
    1;

  const seasonSignature = availableSeasons
    .map((season) => `${season.seasonNumber}:` + season.episodeCount)
    .join("|");

  const [selectedSeasonNumber, setSelectedSeasonNumber] =
    useState(defaultSeasonNumber);

  const [episodeRangeIndex, setEpisodeRangeIndex] = useState(0);

  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setSelectedSeasonNumber(defaultSeasonNumber);

    setEpisodeRangeIndex(0);
    setSelectedEpisodeId(null);
  }, [tmdbId, seasonSignature, defaultSeasonNumber]);

  const { season, isLoading, errorMessage, retry } = useSeasonDetails(
    tmdbId,
    selectedSeasonNumber,
  );

  const selectedSeasonIndex = availableSeasons.findIndex(
    (seasonSummary) => seasonSummary.seasonNumber === selectedSeasonNumber,
  );

  const rangeCount = season
    ? Math.max(
        1,

        Math.ceil(season.episodes.length / EPISODES_PER_RANGE),
      )
    : 1;

  const visibleEpisodes =
    season?.episodes.slice(
      episodeRangeIndex * EPISODES_PER_RANGE,

      (episodeRangeIndex + 1) * EPISODES_PER_RANGE,
    ) ?? [];

  const firstVisibleEpisodeId = visibleEpisodes[0]?.tmdbEpisodeId ?? null;

  useEffect(() => {
    setSelectedEpisodeId(firstVisibleEpisodeId);
  }, [selectedSeasonNumber, episodeRangeIndex, firstVisibleEpisodeId]);

  const selectedEpisode =
    season?.episodes.find(
      (episode) => episode.tmdbEpisodeId === selectedEpisodeId,
    ) ??
    visibleEpisodes[0] ??
    null;

  if (availableSeasons.length === 0) {
    return null;
  }

  function selectSeason(nextSeasonNumber: number) {
    setSelectedSeasonNumber(nextSeasonNumber);

    setEpisodeRangeIndex(0);
    setSelectedEpisodeId(null);
  }

  function goToPreviousSeason() {
    if (selectedSeasonIndex <= 0) {
      return;
    }

    selectSeason(availableSeasons[selectedSeasonIndex - 1].seasonNumber);
  }

  function goToNextSeason() {
    if (
      selectedSeasonIndex < 0 ||
      selectedSeasonIndex >= availableSeasons.length - 1
    ) {
      return;
    }

    selectSeason(availableSeasons[selectedSeasonIndex + 1].seasonNumber);
  }

  return (
    <section
      id="episode-explorer"
      aria-labelledby={headingId}
      className="scroll-mt-24 py-10 sm:py-12"
    >
      <MediaDetailsContainer>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
          <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                TV episodes
              </p>

              <h2
                id={headingId}
                className="mt-2 text-2xl font-bold text-white sm:text-3xl"
              >
                Episode Explorer
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Explore episode ratings one season at a time. Ratings and vote
                counts are provided by TMDB.
              </p>
            </div>

            <div className="flex w-full items-end gap-2 sm:w-auto">
              <button
                type="button"
                aria-label="Previous season"
                disabled={selectedSeasonIndex <= 0}
                onClick={goToPreviousSeason}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-slate-950/75 text-white transition hover:border-sky-300/60 hover:bg-sky-500 disabled:cursor-default disabled:border-white/5 disabled:text-slate-700"
              >
                <SeasonArrowIcon direction="left" />
              </button>

              <label className="min-w-0 flex-1 sm:w-56">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Season
                </span>

                <select
                  value={selectedSeasonNumber}
                  onChange={(event) => selectSeason(Number(event.target.value))}
                  className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-sky-400/60"
                >
                  {availableSeasons.map((seasonSummary) => (
                    <option
                      key={seasonSummary.tmdbSeasonId}
                      value={seasonSummary.seasonNumber}
                    >
                      {seasonSummary.name} · {seasonSummary.episodeCount}{" "}
                      episodes
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                aria-label="Next season"
                disabled={
                  selectedSeasonIndex < 0 ||
                  selectedSeasonIndex >= availableSeasons.length - 1
                }
                onClick={goToNextSeason}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-slate-950/75 text-white transition hover:border-sky-300/60 hover:bg-sky-500 disabled:cursor-default disabled:border-white/5 disabled:text-slate-700"
              >
                <SeasonArrowIcon direction="right" />
              </button>
            </div>
          </header>

          {isLoading && <EpisodeExplorerSkeleton />}

          {!isLoading && errorMessage && (
            <div
              role="alert"
              className="mt-7 rounded-2xl border border-red-400/20 bg-red-500/10 p-5"
            >
              <h3 className="font-semibold text-white">
                This season could not be loaded
              </h3>

              <p className="mt-2 text-sm leading-6 text-red-100/80">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={retry}
                className="mt-4 min-h-11 rounded-full bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-400"
              >
                Try season again
              </button>
            </div>
          )}

          {!isLoading && !errorMessage && season && (
            <>
              <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Selected season
                  </p>

                  <p className="mt-2 font-semibold text-white">{season.name}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Episodes
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {season.episodeCount}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Season average
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {season.averageRating > 0
                      ? `${season.averageRating.toFixed(1)} / 10`
                      : "Not rated"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    First aired
                  </p>

                  <p className="mt-2 font-semibold text-white">
                    {formatDate(season.airDate)}
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-4 border-t border-white/10 pt-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="font-semibold text-white">Episode ratings</h3>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {[
                      {
                        label: "Exceptional",
                        className: "bg-cyan-400",
                      },
                      {
                        label: "Great",
                        className: "bg-sky-500",
                      },
                      {
                        label: "Good",
                        className: "bg-blue-600",
                      },
                      {
                        label: "Mixed",
                        className: "bg-indigo-800",
                      },
                      {
                        label: "Low",
                        className: "bg-blue-950",
                      },
                      {
                        label: "Unrated",
                        className: "bg-slate-700",
                      },
                    ].map((legendItem) => (
                      <span
                        key={legendItem.label}
                        className="inline-flex items-center gap-2 text-slate-400"
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-2.5 rounded-full ${legendItem.className}`}
                        />

                        {legendItem.label}
                      </span>
                    ))}
                  </div>
                </div>

                {rangeCount > 1 && (
                  <label className="w-full sm:w-52">
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Episode range
                    </span>

                    <select
                      value={episodeRangeIndex}
                      onChange={(event) =>
                        setEpisodeRangeIndex(Number(event.target.value))
                      }
                      className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-sky-400/60"
                    >
                      {Array.from({
                        length: rangeCount,
                      }).map((_, index) => {
                        const start = index * EPISODES_PER_RANGE + 1;

                        const end = Math.min(
                          (index + 1) * EPISODES_PER_RANGE,

                          season.episodes.length,
                        );

                        return (
                          <option key={index} value={index}>
                            Episodes {start}–{end}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                )}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">
                {visibleEpisodes.map((episode) => {
                  const ratingVisual = getEpisodeRatingVisual(
                    episode.rating,
                    episode.voteCount,
                  );

                  const isSelected =
                    episode.tmdbEpisodeId === selectedEpisode?.tmdbEpisodeId;

                  return (
                    <button
                      key={episode.tmdbEpisodeId}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`Episode ${episode.episodeNumber}, ${
                        episode.name
                      }, ${ratingVisual.label}${
                        episode.rating > 0 && episode.voteCount > 0
                          ? `, rating ${episode.rating.toFixed(
                              1,
                            )} from ${formatVotes(episode.voteCount)} votes`
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedEpisodeId(episode.tmdbEpisodeId)
                      }
                      className={`min-h-20 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 ${
                        ratingVisual.className
                      } ${
                        isSelected
                          ? "ring-2 ring-white ring-offset-2 ring-offset-slate-950"
                          : ""
                      }`}
                    >
                      <span className="block text-[0.65rem] font-bold uppercase tracking-[0.16em] opacity-75">
                        E{String(episode.episodeNumber).padStart(2, "0")}
                      </span>

                      <span className="mt-2 block text-lg font-black">
                        {episode.rating > 0 && episode.voteCount > 0
                          ? episode.rating.toFixed(1)
                          : "—"}
                      </span>

                      <span className="mt-1 block truncate text-[0.65rem] font-semibold opacity-75">
                        {ratingVisual.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedEpisode && (
                <article className="mt-8 grid overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-sky-950 via-slate-900 to-blue-950 lg:aspect-auto lg:min-h-[300px]">
                    <img
                      src={selectedEpisode.stillUrl}
                      alt={`Still from episode ${selectedEpisode.episodeNumber}, ${selectedEpisode.name}`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent lg:hidden" />
                  </div>

                  <div className="p-5 sm:p-6 lg:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                      Season {season.seasonNumber} • Episode{" "}
                      {selectedEpisode.episodeNumber}
                    </p>

                    <h3 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
                      {selectedEpisode.name}
                    </h3>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-300">
                        {formatDate(selectedEpisode.airDate)}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-300">
                        {formatRuntime(selectedEpisode.runtimeMinutes)}
                      </span>

                      <span className="rounded-full border border-sky-300/15 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
                        {selectedEpisode.rating > 0 &&
                        selectedEpisode.voteCount > 0
                          ? `${selectedEpisode.rating.toFixed(
                              1,
                            )} from ${formatVotes(
                              selectedEpisode.voteCount,
                            )} TMDB votes`
                          : "Not rated"}
                      </span>
                    </div>

                    <p className="mt-5 leading-7 text-slate-300">
                      {selectedEpisode.overview ||
                        "No episode overview is currently available."}
                    </p>
                  </div>
                </article>
              )}
            </>
          )}
        </div>
      </MediaDetailsContainer>
    </section>
  );
}

export default EpisodeExplorerSection;
