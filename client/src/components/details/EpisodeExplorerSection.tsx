import {
  useEffect,
  useId,
  useMemo,
  useState,
} from 'react'
import type { MediaSeasonSummary } from '../../types/media'
import MediaDetailsContainer from './MediaDetailsContainer'
import SeasonEpisodeRow from './SeasonEpisodeRow'

interface EpisodeExplorerSectionProps {
  tmdbId: number
  seasons: MediaSeasonSummary[]
}

const ratingLegend = [
  {
    label: '9.0+',

    className:
      'bg-gradient-to-br from-cyan-300 to-sky-500',
  },
  {
    label: '8.0–8.9',

    className:
      'bg-gradient-to-br from-sky-400 to-blue-600',
  },
  {
    label: '7.0–7.9',

    className:
      'bg-gradient-to-br from-blue-500 to-indigo-700',
  },
  {
    label: '6.0–6.9',

    className:
      'bg-gradient-to-br from-indigo-700 to-slate-800',
  },
  {
    label: 'Below 6',

    className:
      'bg-gradient-to-br from-slate-800 to-blue-950',
  },
  {
    label: 'Unrated',

    className: 'bg-slate-700',
  },
]

function EpisodeExplorerSection({
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

  useEffect(() => {
    setActiveEpisodeKey(null)
  }, [tmdbId])

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

  if (
    availableSeasons.length === 0
  ) {
    return null
  }

  return (
    <section
      id="episode-explorer"
      aria-labelledby={headingId}
      className="scroll-mt-24 py-10 sm:py-12"
    >
      <MediaDetailsContainer>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
          <header>
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
              Compare episode ratings
              across every season.
              Select any episode to
              reveal its details.
            </p>

            <p className="mt-3 text-sm font-medium text-slate-300">
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
          </header>

          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 border-y border-white/10 py-4">
            {ratingLegend.map(
              (legendItem) => (
                <span
                  key={legendItem.label}
                  className="inline-flex items-center gap-2 text-xs font-medium text-slate-400"
                >
                  <span
                    aria-hidden="true"
                    className={`h-3 w-3 rounded-md ${legendItem.className}`}
                  />

                  {legendItem.label}
                </span>
              ),
            )}
          </div>

          <div className="divide-y divide-white/10">
            {availableSeasons.map(
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

          <p className="border-t border-white/10 pt-5 text-xs leading-5 text-slate-500">
            Episode ratings and vote
            counts are provided by
            TMDB. Seasons load as they
            approach the screen.
          </p>
        </div>
      </MediaDetailsContainer>
    </section>
  )
}

export default EpisodeExplorerSection