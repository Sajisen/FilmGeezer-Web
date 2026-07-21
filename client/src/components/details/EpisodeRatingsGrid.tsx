import {
  useMemo,
  useState,
} from 'react'
import { useSeasonDetails } from '../../hooks/useSeasonDetails'
import type { MediaSeasonSummary } from '../../types/media'
import type { EpisodeDetails } from '../../types/season'
import {
  getEpisodeRatingVisual,
  hasEpisodeRating,
} from '../../utils/episodeRating'
import EpisodeDetailsPanel from './EpisodeDetailsPanel'

interface EpisodeRatingsGridProps {
  tmdbId: number
  seasons: MediaSeasonSummary[]
}

interface SelectedGridEpisode {
  seasonNumber: number
  episode: EpisodeDetails
}

const EPISODES_PER_GRID_RANGE =
  100

function EpisodeGridRow({
  tmdbId,
  seasonSummary,
  firstEpisodeNumber,
  finalEpisodeNumber,
  selectedEpisode,
  onSelectEpisode,
}: {
  tmdbId: number
  seasonSummary: MediaSeasonSummary
  firstEpisodeNumber: number
  finalEpisodeNumber: number
  selectedEpisode:
    | SelectedGridEpisode
    | null
  onSelectEpisode: (
    selection:
      | SelectedGridEpisode
      | null,
  ) => void
}) {
  const {
    season,
    isLoading,
    errorMessage,
    retry,
  } = useSeasonDetails(
    tmdbId,
    seasonSummary.seasonNumber,
    true,
  )

  const episodeMap = useMemo(
    () =>
      new Map(
        season?.episodes.map(
          (episode) => [
            episode.episodeNumber,
            episode,
          ],
        ) ?? [],
      ),

    [season],
  )

  const episodeNumbers =
    Array.from({
      length:
        finalEpisodeNumber -
        firstEpisodeNumber +
        1,
    }).map(
      (_, index) =>
        firstEpisodeNumber +
        index,
    )

  const gridTemplateColumns =
    `3.25rem repeat(` +
    `${episodeNumbers.length}, 3rem)`

  return (
    <div
      className="grid gap-1 border-t border-white/5 py-1 first:border-t-0"
      style={{
        gridTemplateColumns,
      }}
    >
      <div className="sticky left-0 z-10 flex h-12 items-center justify-center rounded-lg border border-white/10 bg-slate-950 text-xs font-black text-sky-300">
        S{seasonSummary.seasonNumber}
      </div>

      {isLoading &&
        episodeNumbers.map(
          (episodeNumber) => (
            <div
              key={episodeNumber}
              className="skeleton-placeholder h-12 w-12 rounded-lg"
            />
          ),
        )}

      {!isLoading &&
        errorMessage && (
          <div
            style={{
              gridColumn: '2 / -1',
            }}
            className="flex h-12 items-center gap-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3"
          >
            <span className="text-xs text-red-100">
              Season could not be
              loaded.
            </span>

            <button
              type="button"
              onClick={retry}
              className="text-xs font-semibold text-red-100 underline"
            >
              Retry
            </button>
          </div>
        )}

      {!isLoading &&
        !errorMessage &&
        season &&
        episodeNumbers.map(
          (episodeNumber) => {
            const episode =
              episodeMap.get(
                episodeNumber,
              )

            if (!episode) {
              return (
                <div
                  key={episodeNumber}
                  aria-hidden="true"
                  className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/5 bg-slate-950/45 text-xs text-slate-700"
                >
                  —
                </div>
              )
            }

            const hasRating =
              hasEpisodeRating(
                episode.rating,
                episode.voteCount,
              )

            const ratingVisual =
              getEpisodeRatingVisual(
                episode.rating,
                episode.voteCount,
              )

            const isSelected =
              selectedEpisode
                ?.seasonNumber ===
                seasonSummary.seasonNumber &&
              selectedEpisode.episode
                .tmdbEpisodeId ===
                episode.tmdbEpisodeId

            return (
              <button
                key={
                  episode.tmdbEpisodeId
                }
                type="button"
                aria-pressed={
                  isSelected
                }
                aria-label={`Season ${seasonSummary.seasonNumber}, Episode ${episode.episodeNumber}, ${episode.name}, ${ratingVisual.description}`}
                title={`${episode.name}${
                  hasRating
                    ? ` — ${episode.rating.toFixed(
                        1,
                      )}`
                    : ' — Not rated'
                }`}
                onClick={() =>
                  onSelectEpisode(
                    isSelected
                      ? null
                      : {
                          seasonNumber:
                            seasonSummary.seasonNumber,

                          episode,
                        },
                  )
                }
                className={`flex h-12 w-12 items-center justify-center rounded-lg border text-xs font-black transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white ${
                  ratingVisual.className
                } ${
                  isSelected
                    ? 'ring-2 ring-inset ring-white'
                    : ''
                }`}
              >
                {hasRating
                  ? episode.rating.toFixed(
                      1,
                    )
                  : '—'}
              </button>
            )
          },
        )}
    </div>
  )
}

function EpisodeRatingsGrid({
  tmdbId,
  seasons,
}: EpisodeRatingsGridProps) {
  const [
    rangeIndex,
    setRangeIndex,
  ] = useState(0)

  const [
    selectedEpisode,
    setSelectedEpisode,
  ] =
    useState<SelectedGridEpisode | null>(
      null,
    )

  const maximumEpisodeCount =
    Math.max(
      ...seasons.map(
        (season) =>
          season.episodeCount,
      ),
    )

  const rangeCount = Math.max(
    1,
    Math.ceil(
      maximumEpisodeCount /
        EPISODES_PER_GRID_RANGE,
    ),
  )

  const firstEpisodeNumber =
    rangeIndex *
      EPISODES_PER_GRID_RANGE +
    1

  const finalEpisodeNumber =
    Math.min(
      maximumEpisodeCount,

      (rangeIndex + 1) *
        EPISODES_PER_GRID_RANGE,
    )

  const episodeNumbers =
    Array.from({
      length:
        finalEpisodeNumber -
        firstEpisodeNumber +
        1,
    }).map(
      (_, index) =>
        firstEpisodeNumber +
        index,
    )

  const gridTemplateColumns =
    `3.25rem repeat(` +
    `${episodeNumbers.length}, 3rem)`

  return (
    <div className="mt-5">
      {rangeCount > 1 && (
        <div className="mb-4 flex justify-end">
          <label className="w-full sm:w-56">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Episode range
            </span>

            <select
              value={rangeIndex}
              onChange={(event) => {
                setRangeIndex(
                  Number(
                    event.target.value,
                  ),
                )

                setSelectedEpisode(null)
              }}
              className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-sky-400/60"
            >
              {Array.from({
                length: rangeCount,
              }).map((_, index) => {
                const start =
                  index *
                    EPISODES_PER_GRID_RANGE +
                  1

                const end = Math.min(
                  maximumEpisodeCount,

                  (index + 1) *
                    EPISODES_PER_GRID_RANGE,
                )

                return (
                  <option
                    key={index}
                    value={index}
                  >
                    Episodes {start}–{end}
                  </option>
                )
              })}
            </select>
          </label>
        </div>
      )}

      <div className="media-row-scrollbar overflow-x-auto overscroll-x-contain rounded-2xl border border-white/10 bg-slate-950/45 p-3">
        <div className="w-max min-w-full">
          <div
            className="grid gap-1 pb-1"
            style={{
              gridTemplateColumns,
            }}
          >
            <div className="sticky left-0 z-20 h-7 rounded-md bg-slate-950" />

            {episodeNumbers.map(
              (episodeNumber) => (
                <div
                  key={episodeNumber}
                  className="flex h-7 w-12 items-center justify-center text-[0.65rem] font-bold text-slate-500"
                >
                  E{episodeNumber}
                </div>
              ),
            )}
          </div>

          {seasons.map(
            (seasonSummary) => (
              <EpisodeGridRow
                key={
                  seasonSummary.tmdbSeasonId
                }
                tmdbId={tmdbId}
                seasonSummary={
                  seasonSummary
                }
                firstEpisodeNumber={
                  firstEpisodeNumber
                }
                finalEpisodeNumber={
                  finalEpisodeNumber
                }
                selectedEpisode={
                  selectedEpisode
                }
                onSelectEpisode={
                  setSelectedEpisode
                }
              />
            ),
          )}
        </div>
      </div>

      {selectedEpisode && (
        <EpisodeDetailsPanel
          panelId="episode-grid-details"
          seasonNumber={
            selectedEpisode.seasonNumber
          }
          episode={
            selectedEpisode.episode
          }
          onClose={() =>
            setSelectedEpisode(null)
          }
        />
      )}
    </div>
  )
}

export default EpisodeRatingsGrid