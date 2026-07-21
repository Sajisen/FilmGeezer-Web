import { useId, useMemo, useState } from "react";
import type { MediaSeasonSummary } from "../../types/media";
import EpisodeRatingsGrid, {
  type EpisodeGridOrientation,
} from "./EpisodeRatingsGrid";
import MediaDetailsContainer from "./MediaDetailsContainer";
import SeasonEpisodeRow from "./SeasonEpisodeRow";

interface EpisodeExplorerSectionProps {
  tmdbId: number;
  seasons: MediaSeasonSummary[];
}

type EpisodeViewMode = "rows" | "grid";

const INITIAL_SEASON_LIMIT = 8;
const GRID_DEFAULT_TOTAL_EPISODES = 40;
const GRID_DEFAULT_SEASONS = 5;
const GRID_DEFAULT_EPISODES_IN_ONE_SEASON = 20;

function getRecommendedView(seasons: MediaSeasonSummary[]): EpisodeViewMode {
  const totalEpisodeCount = seasons.reduce(
    (currentTotal, season) => currentTotal + season.episodeCount,
    0,
  );

  const largestSeasonEpisodeCount = Math.max(
    0,
    ...seasons.map((season) => season.episodeCount),
  );

  const isLongSeries =
    totalEpisodeCount >= GRID_DEFAULT_TOTAL_EPISODES ||
    seasons.length >= GRID_DEFAULT_SEASONS ||
    largestSeasonEpisodeCount >= GRID_DEFAULT_EPISODES_IN_ONE_SEASON;

  return isLongSeries ? "grid" : "rows";
}

function getInitialGridOrientation(): EpisodeGridOrientation {
  if (typeof window === "undefined") {
    return "episodes-across";
  }

  return window.matchMedia("(max-width: 639px)").matches
    ? "episodes-down"
    : "episodes-across";
}

function RowsIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="none">
      <path
        d="M3.5 5h2M8 5h8.5M3.5 10h2M8 10h8.5M3.5 15h2M8 15h8.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="none">
      <rect
        x="3.25"
        y="3.25"
        width="5.25"
        height="5.25"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="11.5"
        y="3.25"
        width="5.25"
        height="5.25"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="3.25"
        y="11.5"
        width="5.25"
        height="5.25"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="11.5"
        y="11.5"
        width="5.25"
        height="5.25"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function AcrossIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="none">
      <path
        d="M4 10h12M4 10l3-3M4 10l3 3M16 10l-3-3M16 10l-3 3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4" fill="none">
      <path
        d="M10 4v12M10 4 7 7M10 4l3 3M10 16l-3-3M10 16l3-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EpisodeExplorerContent({
  tmdbId,
  seasons,
}: EpisodeExplorerSectionProps) {
  const headingId = useId();

  const availableSeasons = useMemo(
    () =>
      [...seasons]
        .filter(
          (season) => season.seasonNumber > 0 && season.episodeCount > 0,
        )
        .sort(
          (firstSeason, secondSeason) =>
            firstSeason.seasonNumber - secondSeason.seasonNumber,
        ),
    [seasons],
  );

  const totalEpisodeCount = availableSeasons.reduce(
    (currentTotal, season) => currentTotal + season.episodeCount,
    0,
  );

  const [activeEpisodeKey, setActiveEpisodeKey] = useState<string | null>(null);
  const [showAllSeasons, setShowAllSeasons] = useState(false);
  const [viewMode, setViewMode] = useState<EpisodeViewMode>(() =>
    getRecommendedView(availableSeasons),
  );
  const [gridOrientation, setGridOrientation] =
    useState<EpisodeGridOrientation>(getInitialGridOrientation);

  const hasHiddenSeasons = availableSeasons.length > INITIAL_SEASON_LIMIT;

  const visibleSeasons = showAllSeasons
    ? availableSeasons
    : availableSeasons.slice(0, INITIAL_SEASON_LIMIT);

  if (availableSeasons.length === 0) {
    return null;
  }

  function changeViewMode(nextMode: EpisodeViewMode) {
    setViewMode(nextMode);
    setActiveEpisodeKey(null);
  }

  function changeGridOrientation(nextOrientation: EpisodeGridOrientation) {
    setGridOrientation(nextOrientation);
    setActiveEpisodeKey(null);
  }

  function toggleSeasonVisibility() {
    setShowAllSeasons((currentValue) => !currentValue);
    setActiveEpisodeKey(null);
  }

  return (
    <section
      id="episode-explorer"
      aria-labelledby={headingId}
      className="scroll-mt-24 py-10 sm:py-12"
    >
      <MediaDetailsContainer>
        <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:p-6 lg:p-7">
          <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                TV episodes
              </p>

              <h2
                id={headingId}
                className="mt-2 text-2xl font-bold text-white sm:text-3xl"
              >
                Episode Explorer
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Use Rows for episode-by-episode details or Grid for a compact
                view of ratings across the full series.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <div
                role="group"
                aria-label="Episode Explorer layout"
                className="inline-flex rounded-xl border border-white/10 bg-slate-950/65 p-1"
              >
                <button
                  type="button"
                  aria-pressed={viewMode === "rows"}
                  onClick={() => changeViewMode("rows")}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition ${
                    viewMode === "rows"
                      ? "bg-sky-500 text-white shadow-sm shadow-sky-950/40"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <RowsIcon />
                  Rows
                </button>

                <button
                  type="button"
                  aria-pressed={viewMode === "grid"}
                  onClick={() => changeViewMode("grid")}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition ${
                    viewMode === "grid"
                      ? "bg-sky-500 text-white shadow-sm shadow-sky-950/40"
                      : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <GridIcon />
                  Grid
                </button>
              </div>

              {viewMode === "grid" && (
                <div
                  role="group"
                  aria-label="Grid direction"
                  className="inline-flex rounded-xl border border-white/10 bg-slate-950/65 p-1"
                >
                  <button
                    type="button"
                    title="Show episodes across the screen"
                    aria-label="Show episodes across the screen"
                    aria-pressed={gridOrientation === "episodes-across"}
                    onClick={() => changeGridOrientation("episodes-across")}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition sm:text-sm ${
                      gridOrientation === "episodes-across"
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <AcrossIcon />
                    Across
                  </button>

                  <button
                    type="button"
                    title="Show episodes down the screen"
                    aria-label="Show episodes down the screen"
                    aria-pressed={gridOrientation === "episodes-down"}
                    onClick={() => changeGridOrientation("episodes-down")}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition sm:text-sm ${
                      gridOrientation === "episodes-down"
                        ? "bg-white/10 text-white"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <DownIcon />
                    Down
                  </button>
                </div>
              )}

              <p className="w-fit rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-xs font-semibold text-slate-300">
                {availableSeasons.length}{" "}
                {availableSeasons.length === 1 ? "season" : "seasons"}
                <span aria-hidden="true" className="mx-2 text-slate-600">
                  •
                </span>
                {totalEpisodeCount} episodes
              </p>
            </div>
          </header>

          <div className="mt-5 border-y border-white/10 py-3">
            <div className="flex flex-wrap items-center gap-3 text-[0.7rem] font-medium text-slate-400">
              <span className="font-semibold text-slate-300">Episode rating</span>
              <span>Lower</span>

              <span
                aria-hidden="true"
                className="h-3 w-36 max-w-full rounded-full bg-gradient-to-r from-slate-900 via-sky-700 to-sky-200 sm:w-44"
              />

              <span>Higher</span>

              <span className="inline-flex items-center gap-2 sm:ml-2">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded bg-slate-950 ring-1 ring-white/10"
                />
                Unrated
              </span>
            </div>
          </div>

          {viewMode === "rows" ? (
            <div>
              {visibleSeasons.map((seasonSummary) => (
                <SeasonEpisodeRow
                  key={seasonSummary.tmdbSeasonId}
                  tmdbId={tmdbId}
                  seasonSummary={seasonSummary}
                  activeEpisodeKey={activeEpisodeKey}
                  onEpisodeChange={setActiveEpisodeKey}
                />
              ))}
            </div>
          ) : (
            <EpisodeRatingsGrid
              key={`${gridOrientation}-${showAllSeasons ? "all" : "limited"}`}
              tmdbId={tmdbId}
              seasons={visibleSeasons}
              orientation={gridOrientation}
            />
          )}

          {hasHiddenSeasons && (
            <div className="mt-6 flex justify-center border-t border-white/10 px-4 pb-2 pt-6">
              <button
                type="button"
                onClick={toggleSeasonVisibility}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition hover:border-sky-300/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                {showAllSeasons
                  ? "Show fewer seasons"
                  : `Show all ${availableSeasons.length} seasons`}
              </button>
            </div>
          )}

          <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
            Select any rated episode to view its title, air date, and overview.
            New or upcoming episodes may not have a rating yet.
          </p>
        </div>
      </MediaDetailsContainer>
    </section>
  );
}

function EpisodeExplorerSection(props: EpisodeExplorerSectionProps) {
  return <EpisodeExplorerContent key={props.tmdbId} {...props} />;
}

export default EpisodeExplorerSection;