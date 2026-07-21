import { useId, useMemo, useState } from "react";
import { useSeasonDetails } from "../../hooks/useSeasonDetails";
import type { MediaSeasonSummary } from "../../types/media";
import type { EpisodeDetails } from "../../types/season";
import {
  getEpisodeRatingVisual,
  hasEpisodeRating,
} from "../../utils/episodeRating";
import EpisodeDetailsPanel from "./EpisodeDetailsPanel";

export type EpisodeGridOrientation = "episodes-across" | "episodes-down";

interface EpisodeRatingsGridProps {
  tmdbId: number;
  seasons: MediaSeasonSummary[];
  orientation: EpisodeGridOrientation;
}

interface SelectedGridEpisode {
  seasonNumber: number;
  episode: EpisodeDetails;
}

interface EpisodeRatingCellProps {
  seasonNumber: number;
  episode: EpisodeDetails;
  selectedEpisode: SelectedGridEpisode | null;
  detailsPanelId: string;
  onSelectEpisode: (selection: SelectedGridEpisode | null) => void;
}

interface EpisodeGridRowProps {
  tmdbId: number;
  seasonSummary: MediaSeasonSummary;
  episodeNumbers: number[];
  selectedEpisode: SelectedGridEpisode | null;
  detailsPanelId: string;
  onSelectEpisode: (selection: SelectedGridEpisode | null) => void;
}

type EpisodeGridColumnProps = EpisodeGridRowProps;

const EPISODES_PER_GRID_RANGE = 100;

function EpisodeRatingCell({
  seasonNumber,
  episode,
  selectedEpisode,
  detailsPanelId,
  onSelectEpisode,
}: EpisodeRatingCellProps) {
  const hasRating = hasEpisodeRating(episode.rating, episode.voteCount);
  const ratingVisual = getEpisodeRatingVisual(
    episode.rating,
    episode.voteCount,
  );

  const isSelected =
    selectedEpisode?.seasonNumber === seasonNumber &&
    selectedEpisode.episode.tmdbEpisodeId === episode.tmdbEpisodeId;

  return (
    <button
      type="button"
      aria-expanded={isSelected}
      aria-controls={isSelected ? detailsPanelId : undefined}
      aria-label={`Season ${seasonNumber}, Episode ${episode.episodeNumber}, ${episode.name}, ${ratingVisual.description}`}
      title={`${episode.name}${
        hasRating ? ` — ${episode.rating.toFixed(1)}` : " — Not rated"
      }`}
      onClick={() =>
        onSelectEpisode(
          isSelected
            ? null
            : {
                seasonNumber,
                episode,
              },
        )
      }
      className={`flex shrink-0 items-center justify-center rounded-md border text-[0.62rem] font-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:text-[0.68rem] ${
        ratingVisual.className
      } ${isSelected ? "ring-2 ring-inset ring-white" : ""}`}
      style={{
        width: "var(--episode-grid-cell-size)",
        height: "var(--episode-grid-cell-size)",
      }}
    >
      {hasRating ? episode.rating.toFixed(1) : "—"}
    </button>
  );
}

function MissingEpisodeCell() {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-md border border-white/5 bg-slate-950/55 text-[0.6rem] text-slate-700"
      style={{
        width: "var(--episode-grid-cell-size)",
        height: "var(--episode-grid-cell-size)",
      }}
    >
      —
    </div>
  );
}

function LoadingEpisodeCell() {
  return (
    <div
      aria-hidden="true"
      className="skeleton-placeholder shrink-0 rounded-md"
      style={{
        width: "var(--episode-grid-cell-size)",
        height: "var(--episode-grid-cell-size)",
      }}
    />
  );
}

function EpisodeGridRow({
  tmdbId,
  seasonSummary,
  episodeNumbers,
  selectedEpisode,
  detailsPanelId,
  onSelectEpisode,
}: EpisodeGridRowProps) {
  const { season, isLoading, errorMessage, retry } = useSeasonDetails(
    tmdbId,
    seasonSummary.seasonNumber,
    true,
  );

  const episodeMap = useMemo(
    () =>
      new Map(
        season?.episodes.map((episode) => [episode.episodeNumber, episode]) ??
          [],
      ),
    [season],
  );

  const gridTemplateColumns = `repeat(${episodeNumbers.length}, var(--episode-grid-cell-size))`;

  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns,
        gap: "var(--episode-grid-gap)",
      }}
    >
      {isLoading &&
        episodeNumbers.map((episodeNumber) => (
          <LoadingEpisodeCell key={episodeNumber} />
        ))}

      {!isLoading && errorMessage && (
        <div
          style={{
            gridColumn: "1 / -1",
            height: "var(--episode-grid-cell-size)",
          }}
          className="flex min-w-64 items-center gap-3 rounded-md border border-red-400/20 bg-red-500/10 px-3"
        >
          <span className="text-[0.65rem] text-red-100 sm:text-xs">
            Season could not be loaded.
          </span>

          <button
            type="button"
            onClick={retry}
            className="text-[0.65rem] font-semibold text-red-100 underline underline-offset-2 sm:text-xs"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading &&
        !errorMessage &&
        episodeNumbers.map((episodeNumber) => {
          const episode = episodeMap.get(episodeNumber);

          if (!episode) {
            return <MissingEpisodeCell key={episodeNumber} />;
          }

          return (
            <EpisodeRatingCell
              key={episode.tmdbEpisodeId}
              seasonNumber={seasonSummary.seasonNumber}
              episode={episode}
              selectedEpisode={selectedEpisode}
              detailsPanelId={detailsPanelId}
              onSelectEpisode={onSelectEpisode}
            />
          );
        })}
    </div>
  );
}

function EpisodeGridColumn({
  tmdbId,
  seasonSummary,
  episodeNumbers,
  selectedEpisode,
  detailsPanelId,
  onSelectEpisode,
}: EpisodeGridColumnProps) {
  const { season, isLoading, errorMessage, retry } = useSeasonDetails(
    tmdbId,
    seasonSummary.seasonNumber,
    true,
  );

  const episodeMap = useMemo(
    () =>
      new Map(
        season?.episodes.map((episode) => [episode.episodeNumber, episode]) ??
          [],
      ),
    [season],
  );

  return (
    <div
      className="flex shrink-0 flex-col"
      style={{ gap: "var(--episode-grid-gap)" }}
    >
      {isLoading &&
        episodeNumbers.map((episodeNumber) => (
          <LoadingEpisodeCell key={episodeNumber} />
        ))}

      {!isLoading &&
        errorMessage &&
        episodeNumbers.map((episodeNumber, index) =>
          index === 0 ? (
            <button
              key={episodeNumber}
              type="button"
              onClick={retry}
              aria-label={`Retry Season ${seasonSummary.seasonNumber}`}
              title={`Retry Season ${seasonSummary.seasonNumber}`}
              className="flex shrink-0 items-center justify-center rounded-md border border-red-400/25 bg-red-500/10 text-sm font-bold text-red-100"
              style={{
                width: "var(--episode-grid-cell-size)",
                height: "var(--episode-grid-cell-size)",
              }}
            >
              ↻
            </button>
          ) : (
            <MissingEpisodeCell key={episodeNumber} />
          ),
        )}

      {!isLoading &&
        !errorMessage &&
        episodeNumbers.map((episodeNumber) => {
          const episode = episodeMap.get(episodeNumber);

          if (!episode) {
            return <MissingEpisodeCell key={episodeNumber} />;
          }

          return (
            <EpisodeRatingCell
              key={episode.tmdbEpisodeId}
              seasonNumber={seasonSummary.seasonNumber}
              episode={episode}
              selectedEpisode={selectedEpisode}
              detailsPanelId={detailsPanelId}
              onSelectEpisode={onSelectEpisode}
            />
          );
        })}
    </div>
  );
}

interface EpisodesAcrossGridProps {
  tmdbId: number;
  seasons: MediaSeasonSummary[];
  episodeNumbers: number[];
  selectedEpisode: SelectedGridEpisode | null;
  detailsPanelId: string;
  onSelectEpisode: (selection: SelectedGridEpisode | null) => void;
  instructionsId: string;
}

function EpisodesAcrossGrid({
  tmdbId,
  seasons,
  episodeNumbers,
  selectedEpisode,
  detailsPanelId,
  onSelectEpisode,
  instructionsId,
}: EpisodesAcrossGridProps) {
  const gridTemplateColumns = `repeat(${episodeNumbers.length}, var(--episode-grid-cell-size))`;

  return (
    <div
      className="grid min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45"
      style={{
        gridTemplateColumns:
          "calc(var(--episode-grid-season-width) + 1rem) minmax(0, 1fr)",
      }}
    >
      <div
        className="relative z-10 flex flex-col border-r border-white/10 bg-slate-950 p-2"
        style={{ gap: "var(--episode-grid-gap)" }}
      >
        <div
          aria-hidden="true"
          style={{ height: "var(--episode-grid-header-height)" }}
        />

        {seasons.map((seasonSummary) => (
          <div
            key={seasonSummary.tmdbSeasonId}
            className="flex items-center justify-center rounded-md border border-white/10 bg-slate-900 text-[0.65rem] font-black text-sky-300 sm:text-xs"
            title={`Season ${seasonSummary.seasonNumber}`}
            style={{
              width: "var(--episode-grid-season-width)",
              height: "var(--episode-grid-cell-size)",
            }}
          >
            S{seasonSummary.seasonNumber}
          </div>
        ))}
      </div>

      <div
        tabIndex={0}
        aria-label="Episode rating grid with episodes across"
        aria-describedby={instructionsId}
        className="media-row-scrollbar min-w-0 overflow-x-auto overscroll-x-contain focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300"
      >
        <div className="w-max min-w-full p-2">
          <div
            className="flex flex-col"
            style={{ gap: "var(--episode-grid-gap)" }}
          >
            <div
              className="grid"
              style={{
                gridTemplateColumns,
                gap: "var(--episode-grid-gap)",
                height: "var(--episode-grid-header-height)",
              }}
            >
              {episodeNumbers.map((episodeNumber) => (
                <div
                  key={episodeNumber}
                  className="flex items-center justify-center text-[0.55rem] font-bold text-slate-500 sm:text-[0.6rem]"
                  style={{ width: "var(--episode-grid-cell-size)" }}
                >
                  E{episodeNumber}
                </div>
              ))}
            </div>

            {seasons.map((seasonSummary) => (
              <EpisodeGridRow
                key={seasonSummary.tmdbSeasonId}
                tmdbId={tmdbId}
                seasonSummary={seasonSummary}
                episodeNumbers={episodeNumbers}
                selectedEpisode={selectedEpisode}
                detailsPanelId={detailsPanelId}
                onSelectEpisode={onSelectEpisode}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type EpisodesDownGridProps = EpisodesAcrossGridProps;

function EpisodesDownGrid({
  tmdbId,
  seasons,
  episodeNumbers,
  selectedEpisode,
  detailsPanelId,
  onSelectEpisode,
  instructionsId,
}: EpisodesDownGridProps) {
  const gridTemplateColumns = `var(--episode-grid-season-width) repeat(${seasons.length}, var(--episode-grid-cell-size))`;

  return (
    <div
      tabIndex={0}
      aria-label="Episode rating grid with episodes down"
      aria-describedby={instructionsId}
      className="episode-grid-scrollbar max-h-[68vh] min-w-0 overflow-auto rounded-2xl border border-white/10 bg-slate-950/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300 sm:max-h-[38rem]"
    >
      <div className="w-max min-w-full px-2 pb-2">
        <div className="sticky top-0 z-40 -mx-2 bg-slate-950 px-2 pb-[var(--episode-grid-gap)] pt-2">
          <div
            className="grid items-center"
            style={{
              gridTemplateColumns,
              gap: "var(--episode-grid-gap)",
            }}
          >
            <div
              className="sticky left-0 z-50 flex shrink-0 items-center justify-center rounded-md border border-white/10 bg-slate-900 text-[0.55rem] font-bold uppercase tracking-wide text-slate-500"
              style={{
                width: "var(--episode-grid-season-width)",
                height: "var(--episode-grid-cell-size)",
                boxShadow:
                  "var(--episode-grid-gap) 0 0 rgb(2 6 23)",
              }}
            >
              Ep
            </div>

            {seasons.map((seasonSummary) => (
              <div
                key={seasonSummary.tmdbSeasonId}
                className="flex shrink-0 items-center justify-center rounded-md border border-white/10 bg-slate-900 text-[0.65rem] font-black text-sky-300 sm:text-xs"
                title={`Season ${seasonSummary.seasonNumber}`}
                style={{
                  width: "var(--episode-grid-cell-size)",
                  height: "var(--episode-grid-cell-size)",
                }}
              >
                S{seasonSummary.seasonNumber}
              </div>
            ))}
          </div>
        </div>

        <div
          className="grid items-start"
          style={{
            gridTemplateColumns,
            gap: "var(--episode-grid-gap)",
          }}
        >
          <div
            className="sticky left-0 z-30 flex shrink-0 flex-col bg-slate-950"
            style={{
              gap: "var(--episode-grid-gap)",
              boxShadow:
                "var(--episode-grid-gap) 0 0 rgb(2 6 23)",
            }}
          >
            {episodeNumbers.map((episodeNumber) => (
              <div
                key={episodeNumber}
                className="flex items-center justify-center rounded-md border border-white/10 bg-slate-900 text-[0.58rem] font-bold text-slate-400 sm:text-[0.65rem]"
                style={{
                  width: "var(--episode-grid-season-width)",
                  height: "var(--episode-grid-cell-size)",
                }}
              >
                E{episodeNumber}
              </div>
            ))}
          </div>

          {seasons.map((seasonSummary) => (
            <EpisodeGridColumn
              key={seasonSummary.tmdbSeasonId}
              tmdbId={tmdbId}
              seasonSummary={seasonSummary}
              episodeNumbers={episodeNumbers}
              selectedEpisode={selectedEpisode}
              detailsPanelId={detailsPanelId}
              onSelectEpisode={onSelectEpisode}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function EpisodeRatingsGrid({
  tmdbId,
  seasons,
  orientation,
}: EpisodeRatingsGridProps) {
  const detailsPanelId = useId();
  const instructionsId = useId();

  const [rangeIndex, setRangeIndex] = useState(0);
  const [selectedEpisode, setSelectedEpisode] =
    useState<SelectedGridEpisode | null>(null);

  const maximumEpisodeCount = Math.max(
    0,
    ...seasons.map((season) => season.episodeCount),
  );

  const rangeCount = Math.max(
    1,
    Math.ceil(maximumEpisodeCount / EPISODES_PER_GRID_RANGE),
  );

  const firstEpisodeNumber = rangeIndex * EPISODES_PER_GRID_RANGE + 1;

  const finalEpisodeNumber = Math.min(
    maximumEpisodeCount,
    (rangeIndex + 1) * EPISODES_PER_GRID_RANGE,
  );

  const episodeNumbers = Array.from({
    length: Math.max(0, finalEpisodeNumber - firstEpisodeNumber + 1),
  }).map((_, index) => firstEpisodeNumber + index);

  return (
    <div className="episode-rating-grid mt-5 min-w-0">
      {rangeCount > 1 && (
        <div className="mb-4 flex justify-end">
          <label className="w-full sm:w-56">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Episode range
            </span>

            <select
              value={rangeIndex}
              onChange={(event) => {
                setRangeIndex(Number(event.target.value));
                setSelectedEpisode(null);
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-sky-400/60"
            >
              {Array.from({ length: rangeCount }).map((_, index) => {
                const start = index * EPISODES_PER_GRID_RANGE + 1;
                const end = Math.min(
                  maximumEpisodeCount,
                  (index + 1) * EPISODES_PER_GRID_RANGE,
                );

                return (
                  <option key={index} value={index}>
                    Episodes {start}–{end}
                  </option>
                );
              })}
            </select>
          </label>
        </div>
      )}

      <p id={instructionsId} className="sr-only">
        {orientation === "episodes-across"
          ? "Scroll horizontally to compare episode ratings. Season labels remain fixed on the left."
          : "Scroll vertically to compare episodes and horizontally when more season columns are available."}
      </p>

      {orientation === "episodes-across" ? (
        <EpisodesAcrossGrid
          tmdbId={tmdbId}
          seasons={seasons}
          episodeNumbers={episodeNumbers}
          selectedEpisode={selectedEpisode}
          detailsPanelId={detailsPanelId}
          onSelectEpisode={setSelectedEpisode}
          instructionsId={instructionsId}
        />
      ) : (
        <EpisodesDownGrid
          tmdbId={tmdbId}
          seasons={seasons}
          episodeNumbers={episodeNumbers}
          selectedEpisode={selectedEpisode}
          detailsPanelId={detailsPanelId}
          onSelectEpisode={setSelectedEpisode}
          instructionsId={instructionsId}
        />
      )}

      {selectedEpisode && (
        <EpisodeDetailsPanel
          panelId={detailsPanelId}
          seasonNumber={selectedEpisode.seasonNumber}
          episode={selectedEpisode.episode}
          onClose={() => setSelectedEpisode(null)}
        />
      )}
    </div>
  );
}

export default EpisodeRatingsGrid;