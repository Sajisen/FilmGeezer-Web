import {
  useId,
  useMemo,
  useState,
} from 'react'
import type { MediaSeasonSummary } from '../../types/media'
import EpisodeRatingsGrid from './EpisodeRatingsGrid'
import MediaDetailsContainer from './MediaDetailsContainer'
import SeasonEpisodeRow from './SeasonEpisodeRow'

interface EpisodeExplorerSectionProps {
  tmdbId: number
  seasons: MediaSeasonSummary[]
}

type EpisodeViewMode =
  | 'rows'
  | 'grid'

const INITIAL_SEASON_LIMIT = 8

function EpisodeExplorerContent({
  tmdbId,
  seasons,
}: EpisodeExplorerSectionProps) {
  const headingId = useId()

  const [
    activeEpisodeKey,
    setActiveEpisodeKey,
  ] = useState<string | null>(
    null,
  )

  const [
    showAllSeasons,
    setShowAllSeasons,
  ] = useState(false)

  const [
    viewMode,
    setViewMode,
  ] =
    useState<EpisodeViewMode>(
      'rows',
    )

  const availableSeasons =
    useMemo(
      () =>
        [...seasons]
          .filter(
            (season) =>
              season.seasonNumber > 0 &&
              season.episodeCount > 0,
          )
          .sort(
            (
              firstSeason,
              secondSeason,
            ) =>
              firstSeason.seasonNumber -
              secondSeason.seasonNumber,
          ),

      [seasons],
    )

  const totalEpisodeCount =
    availableSeasons.reduce(
      (
        currentTotal,
        season,
      ) =>
        currentTotal +
        season.episodeCount,

      0,
    )

  const hasHiddenSeasons =
    availableSeasons.length >
    INITIAL_SEASON_LIMIT

  const visibleSeasons =
    showAllSeasons
      ? availableSeasons
      : availableSeasons.slice(
          0,
          INITIAL_SEASON_LIMIT,
        )

  if (
    availableSeasons.length === 0
  ) {
    return null
  }

  function changeViewMode(
    nextMode: EpisodeViewMode,
  ) {
    setViewMode(nextMode)
    setActiveEpisodeKey(null)
  }

  function toggleSeasonVisibility() {
    setShowAllSeasons(
      (currentValue) =>
        !currentValue,
    )

    setActiveEpisodeKey(null)
  }

  return (
    <section
      id="episode-explorer"
      aria-labelledby={headingId}
      className="scroll-mt-24 py-10 sm:py-12"
    >
      <MediaDetailsContainer>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-7">
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

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Compare ratings across
                every season and select
                an episode to reveal
                its details.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  View
                </span>

                <div className="mt-2 inline-flex rounded-xl border border-white/10 bg-slate-950/65 p-1">
                  <button
                    type="button"
                    aria-pressed={
                      viewMode === 'rows'
                    }
                    onClick={() =>
                      changeViewMode(
                        'rows',
                      )
                    }
                    className={`min-h-9 rounded-lg px-4 text-sm font-semibold transition ${
                      viewMode === 'rows'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rows
                  </button>

                  <button
                    type="button"
                    aria-pressed={
                      viewMode === 'grid'
                    }
                    onClick={() =>
                      changeViewMode(
                        'grid',
                      )
                    }
                    className={`min-h-9 rounded-lg px-4 text-sm font-semibold transition ${
                      viewMode === 'grid'
                        ? 'bg-sky-500 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>

              <p className="w-fit rounded-full border border-white/10 bg-slate-950/55 px-3 py-2 text-xs font-semibold text-slate-300">
                {
                  availableSeasons.length
                }{' '}
                {availableSeasons.length ===
                1
                  ? 'season'
                  : 'seasons'}

                <span
                  aria-hidden="true"
                  className="mx-2 text-slate-600"
                >
                  •
                </span>

                {totalEpisodeCount}{' '}
                episodes
              </p>
            </div>
          </header>

          <div className="mt-5 border-y border-white/10 py-3">
            <div className="flex flex-wrap items-center gap-3 text-[0.7rem] font-medium text-slate-400">
              <span>
                Lower
              </span>

              <span
                aria-hidden="true"
                className="h-3 w-44 max-w-full rounded-full bg-gradient-to-r from-slate-900 via-sky-700 to-sky-200"
              />

              <span>
                Higher
              </span>

              <span className="ml-2 inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded bg-slate-950 ring-1 ring-white/10"
                />

                Unrated
              </span>
            </div>
          </div>

          {viewMode === 'rows' ? (
            <div>
              {visibleSeasons.map(
                (seasonSummary) => (
                  <SeasonEpisodeRow
                    key={
                      seasonSummary.tmdbSeasonId
                    }
                    tmdbId={tmdbId}
                    seasonSummary={
                      seasonSummary
                    }
                    activeEpisodeKey={
                      activeEpisodeKey
                    }
                    onEpisodeChange={
                      setActiveEpisodeKey
                    }
                  />
                ),
              )}
            </div>
          ) : (
            <EpisodeRatingsGrid
              tmdbId={tmdbId}
              seasons={
                visibleSeasons
              }
            />
          )}

          {hasHiddenSeasons && (
            <div className="mt-6 flex justify-center border-t border-white/10 px-4 pb-2 pt-6">
              <button
                type="button"
                onClick={
                  toggleSeasonVisibility
                }
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition hover:border-sky-300/50 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                {showAllSeasons
                  ? 'Show fewer seasons'
                  : `Show all ${availableSeasons.length} seasons`}
              </button>
            </div>
          )}

          <p className="mt-4 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
            Ratings and vote counts
            are provided by TMDB.
            Season data loads as it
            approaches the screen.
          </p>
        </div>
      </MediaDetailsContainer>
    </section>
  )
}

function EpisodeExplorerSection(
  props: EpisodeExplorerSectionProps,
) {
  return (
    <EpisodeExplorerContent
      key={props.tmdbId}
      {...props}
    />
  )
}

export default EpisodeExplorerSection