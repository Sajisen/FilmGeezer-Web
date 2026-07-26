import { useState } from 'react'
import type { EpisodeDetails } from '../../types/season'
import { hasEpisodeRating } from '../../utils/episodeRating'

interface EpisodeDetailsPanelProps {
  panelId: string
  seasonNumber: number
  episode: EpisodeDetails
  onClose: () => void
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function formatDate(
  dateText: string,
) {
  if (!dateText) {
    return 'Date unavailable'
  }

  const date = new Date(
    `${dateText}T00:00:00Z`,
  )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return dateText
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    },
  ).format(date)
}

function formatRuntime(
  runtimeMinutes: number | null,
) {
  if (
    !runtimeMinutes ||
    runtimeMinutes <= 0
  ) {
    return 'Runtime unavailable'
  }

  return `${runtimeMinutes} min`
}

function formatVotes(
  voteCount: number,
) {
  return new Intl.NumberFormat(
    'en-US',
  ).format(voteCount)
}

function EpisodeDetailsPanel({
  panelId,
  seasonNumber,
  episode,
  onClose,
}: EpisodeDetailsPanelProps) {
  const [
    expandedEpisodeId,
    setExpandedEpisodeId,
  ] = useState<number | null>(null)

  const isOverviewExpanded =
    expandedEpisodeId ===
    episode.tmdbEpisodeId

  const hasRating =
    hasEpisodeRating(
      episode.rating,
      episode.voteCount,
    )

  const shouldTruncateOverview =
    episode.overview.length > 320

  return (
    <article
      id={panelId}
      className="mt-4 grid overflow-hidden rounded-2xl border border-sky-400/20 bg-slate-950/60 shadow-xl shadow-black/15 lg:h-[300px] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
    >
      <div className="relative h-48 overflow-hidden bg-slate-900 sm:h-60 lg:h-full">
        <img
          src={episode.stillUrl}
          alt={`Still from episode ${episode.episodeNumber}, ${episode.name}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent lg:hidden" />
      </div>

      <div className="relative flex min-h-0 flex-col p-5 sm:p-6 lg:h-full lg:p-7">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close episode details"
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/70 text-slate-300 transition hover:border-sky-300/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          <CloseIcon />
        </button>

        <p className="pr-12 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
          Season {seasonNumber}
          {' '}•{' '}
          Episode {episode.episodeNumber}
        </p>

        <h4 className="mt-3 line-clamp-2 pr-12 text-2xl font-bold leading-tight text-white sm:text-3xl">
          {episode.name}
        </h4>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-300">
            {formatDate(
              episode.airDate,
            )}
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-300">
            {formatRuntime(
              episode.runtimeMinutes,
            )}
          </span>

          <span className="rounded-full border border-sky-300/15 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
            {hasRating
              ? `${episode.rating.toFixed(
                  1,
                )} from ${formatVotes(
                  episode.voteCount,
                )} TMDB votes`
              : 'Not rated'}
          </span>
        </div>

        <div className="mt-5 min-h-0">
          <p
            className={`leading-7 text-slate-300 ${
              isOverviewExpanded
                ? 'max-h-32 overflow-y-auto pr-2'
                : 'line-clamp-4'
            }`}
          >
            {episode.overview ||
              'No episode overview is currently available.'}
          </p>

          {shouldTruncateOverview && (
            <button
              type="button"
              onClick={() =>
                setExpandedEpisodeId(
                  (currentEpisodeId) =>
                    currentEpisodeId ===
                    episode.tmdbEpisodeId
                      ? null
                      : episode.tmdbEpisodeId,
                )
              }
              className="mt-3 text-sm font-semibold text-sky-300 transition hover:text-sky-200"
            >
              {isOverviewExpanded
                ? 'Collapse overview'
                : 'Read full overview'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default EpisodeDetailsPanel