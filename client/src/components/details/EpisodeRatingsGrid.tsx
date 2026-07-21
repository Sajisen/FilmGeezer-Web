import { useId, useMemo, useState } from "react";
import { useSeasonDetails } from "../../hooks/useSeasonDetails";
import type { MediaSeasonSummary } from "../../types/media";
import type { EpisodeDetails } from "../../types/season";
import {
  getEpisodeRatingVisual,
  hasEpisodeRating,
} from "../../utils/episodeRating";
import EpisodeDetailsPanel from "./EpisodeDetailsPanel";

interface EpisodeRatingsGridProps {
  tmdbId: number;
  seasons: MediaSeasonSummary[];
}

interface SelectedGridEpisode {
  seasonNumber: number;
  episode: EpisodeDetails;
}

interface EpisodeGridRowProps {
  tmdbId: number;
  seasonSummary: MediaSeasonSummary;
  episodeNumbers: number[];
  selectedEpisode: SelectedGridEpisode | null;
  detailsPanelId: string;
  onSelectEpisode: (selection: SelectedGridEpisode | null) => void;
}

const EPISODES_PER_GRID_RANGE = 100;

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
          <div
            key={episodeNumber}
            aria-hidden="true"
            className="skeleton-placeholder rounded-md"
            style={{
              width: "var(--episode-grid-cell-size)",
              height: "var(--episode-grid-cell-size)",
            }}
          />
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
            return (
              <div
                key={episodeNumber}
                aria-hidden="true"
                className="flex items-center justify-center rounded-md border border-white/5 bg-slate-950/55 text-[0.6rem] text-slate-700"
                style={{
                  width: "var(--episode-grid-cell-size)",
                  height: "var(--episode-grid-cell-size)",
                }}
              >
                —
              </div>
            );
          }

          const hasRating = hasEpisodeRating(
            episode.rating,
            episode.voteCount,
          );

          const ratingVisual = getEpisodeRatingVisual(
            episode.rating,
            episode.voteCount,
          );

          const isSelected =
            selectedEpisode?.seasonNumber === seasonSummary.seasonNumber &&
            selectedEpisode.episode.tmdbEpisodeId === episode.tmdbEpisodeId;

          return (
            <button
              key={episode.tmdbEpisodeId}
              type="button"
              aria-expanded={isSelected}
              aria-controls={isSelected ? detailsPanelId : undefined}
              aria-label={`Season ${seasonSummary.seasonNumber}, Episode ${episode.episodeNumber}, ${episode.name}, ${ratingVisual.description}`}
              title={`${episode.name}${
                hasRating
                  ? ` — ${episode.rating.toFixed(1)}`
                  : " — Not rated"
              }`}
              onClick={() =>
                onSelectEpisode(
                  isSelected
                    ? null
                    : {
                        seasonNumber: seasonSummary.seasonNumber,
                        episode,
                      },
                )
              }
              className={`flex items-center justify-center rounded-md border text-[0.65rem] font-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white sm:text-[0.7rem] ${
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
        })}
    </div>
  );
}

function EpisodeRatingsGrid({ tmdbId, seasons }: EpisodeRatingsGridProps) {
  const detailsPanelId = useId();
  const instructionsId = useId();

  const [rangeIndex, setRangeIndex] = useState(0);
  const [selectedEpisode, setSelectedEpisode] =
    useState<SelectedGridEpisode | null>(null);

  const maximumEpisodeCount = Math.max(
    ...seasons.map((season) => season.episodeCount),
  );

  const rangeCount = Math.max(
    1,
    Math.ceil(maximumEpisodeCount / EPISODES_PER_GRID_RANGE),
  );

  const firstEpisodeNumber =
    rangeIndex * EPISODES_PER_GRID_RANGE + 1;

  const finalEpisodeNumber = Math.min(
    maximumEpisodeCount,
    (rangeIndex + 1) * EPISODES_PER_GRID_RANGE,
  );

  const episodeNumbers = Array.from({
    length: finalEpisodeNumber - firstEpisodeNumber + 1,
  }).map((_, index) => firstEpisodeNumber + index);

  const gridTemplateColumns = `repeat(${episodeNumbers.length}, var(--episode-grid-cell-size))`;

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
        Scroll horizontally to compare episode ratings. Season labels remain
        fixed on the left.
      </p>

      <div
        className="grid min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45"
        style={{
          gridTemplateColumns:
            "calc(var(--episode-grid-season-width) + 1rem) minmax(0, 1fr)",
        }}
      >
        <div className="relative z-10 flex flex-col border-r border-white/10 bg-slate-950 p-2 shadow-[10px_0_20px_-16px_rgba(56,189,248,0.8)]"
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
          aria-label="Episode rating grid"
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
                  onSelectEpisode={setSelectedEpisode}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

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