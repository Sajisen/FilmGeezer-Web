import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { useSeasonDetails } from '../../hooks/useSeasonDetails'
import type { MediaSeasonSummary } from '../../types/media'
import type { EpisodeDetails } from '../../types/season'

interface SeasonEpisodeRowProps {
  tmdbId: number
  seasonSummary: MediaSeasonSummary
  activeEpisodeKey: string | null
  onEpisodeChange: (
    episodeKey: string | null,
  ) => void
}

interface ArrowIconProps {
  direction: 'left' | 'right'
}

function ArrowIcon({
  direction,
}: ArrowIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d={
          direction === 'left'
            ? 'm14.5 6-6 6 6 6'
            : 'm9.5 6 6 6-6 6'
        }
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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

function getPreferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
    ? 'auto'
    : 'smooth'
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

function getRatingVisual(
  rating: number,
  voteCount: number,
) {
  if (
    rating <= 0 ||
    voteCount <= 0
  ) {
    return {
      description: 'Unrated',

      className:
        'border-white/10 bg-slate-900/75 text-slate-400',
    }
  }

  if (rating >= 9) {
    return {
      description:
        'Exceptional rating',

      className:
        'border-cyan-200/60 bg-gradient-to-br from-cyan-300 to-sky-500 text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.14)]',
    }
  }

  if (rating >= 8) {
    return {
      description:
        'Very high rating',

      className:
        'border-sky-300/45 bg-gradient-to-br from-sky-400 to-blue-600 text-white',
    }
  }

  if (rating >= 7) {
    return {
      description: 'Good rating',

      className:
        'border-blue-300/35 bg-gradient-to-br from-blue-500 to-indigo-700 text-white',
    }
  }

  if (rating >= 6) {
    return {
      description:
        'Moderate rating',

      className:
        'border-indigo-400/30 bg-gradient-to-br from-indigo-700 to-slate-800 text-indigo-50',
    }
  }

  return {
    description: 'Low rating',

    className:
      'border-blue-900/75 bg-gradient-to-br from-slate-800 to-blue-950 text-blue-200',
  }
}

function SeasonRowSkeleton() {
  return (
    <div
      role="status"
      className="flex gap-2 overflow-hidden"
    >
      <span className="sr-only">
        Loading season episodes
      </span>

      {Array.from({
        length: 10,
      }).map((_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="skeleton-placeholder h-[4.5rem] w-[4.5rem] min-w-[4.5rem] rounded-xl sm:h-[4.75rem] sm:w-[4.75rem] sm:min-w-[4.75rem]"
        />
      ))}
    </div>
  )
}

function EpisodeDetailsPanel({
  panelId,
  seasonNumber,
  episode,
  onClose,
}: {
  panelId: string
  seasonNumber: number
  episode: EpisodeDetails
  onClose: () => void
}) {
  const hasRating =
    episode.rating > 0 &&
    episode.voteCount > 0

  return (
    <article
      id={panelId}
      className="mt-5 grid overflow-hidden rounded-2xl border border-sky-400/20 bg-slate-950/60 shadow-xl shadow-black/15 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
    >
      <div className="relative aspect-video overflow-hidden bg-slate-900 lg:aspect-auto lg:min-h-[280px]">
        <img
          src={episode.stillUrl}
          alt={`Still from episode ${episode.episodeNumber}, ${episode.name}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent lg:hidden" />
      </div>

      <div className="relative p-5 sm:p-6 lg:p-8">
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
          Episode {
            episode.episodeNumber
          }
        </p>

        <h4 className="mt-3 pr-12 text-2xl font-bold leading-tight text-white sm:text-3xl">
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

        <p className="mt-5 leading-7 text-slate-300">
          {episode.overview ||
            'No episode overview is currently available.'}
        </p>
      </div>
    </article>
  )
}

function SeasonEpisodeRow({
  tmdbId,
  seasonSummary,
  activeEpisodeKey,
  onEpisodeChange,
}: SeasonEpisodeRowProps) {
  const rowRef =
    useRef<HTMLDivElement>(null)

  const railRef =
    useRef<HTMLDivElement>(null)

  const railId = useId()
  const instructionsId = useId()
  const detailsPanelId = useId()

  const [
    shouldLoad,
    setShouldLoad,
  ] = useState(false)

  const [
    canScrollLeft,
    setCanScrollLeft,
  ] = useState(false)

  const [
    canScrollRight,
    setCanScrollRight,
  ] = useState(false)

  useEffect(() => {
    const row = rowRef.current

    if (!row) {
      return
    }

    if (
      !('IntersectionObserver' in window)
    ) {
      setShouldLoad(true)
      return
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          if (
            entries.some(
              (entry) =>
                entry.isIntersecting,
            )
          ) {
            setShouldLoad(true)
            observer.disconnect()
          }
        },
        {
          rootMargin:
            '300px 0px',
        },
      )

    observer.observe(row)

    return () => {
      observer.disconnect()
    }
  }, [])

  const {
    season,
    isLoading,
    errorMessage,
    retry,
  } = useSeasonDetails(
    tmdbId,
    seasonSummary.seasonNumber,
    shouldLoad,
  )

  const episodeSignature =
    season?.episodes
      .map(
        (episode) =>
          episode.tmdbEpisodeId,
      )
      .join('|') ?? ''

  const updateScrollState =
    useCallback(() => {
      const rail = railRef.current

      if (!rail) {
        return
      }

      const threshold = 4

      const maximumScrollLeft =
        rail.scrollWidth -
        rail.clientWidth

      setCanScrollLeft(
        rail.scrollLeft > threshold,
      )

      setCanScrollRight(
        maximumScrollLeft -
          rail.scrollLeft >
          threshold,
      )
    }, [])

  useEffect(() => {
    const rail = railRef.current

    if (!rail) {
      return
    }

    updateScrollState()

    const resizeObserver =
      new ResizeObserver(
        updateScrollState,
      )

    resizeObserver.observe(rail)

    return () => {
      resizeObserver.disconnect()
    }
  }, [
    episodeSignature,
    updateScrollState,
  ])

  function scrollByPage(
    direction: 'left' | 'right',
  ) {
    const rail = railRef.current

    if (!rail) {
      return
    }

    rail.scrollBy({
      left:
        direction === 'left'
          ? -rail.clientWidth * 0.8
          : rail.clientWidth * 0.8,

      behavior:
        getPreferredScrollBehavior(),
    })
  }

  function handleRailKeyDown(
    event:
      KeyboardEvent<HTMLDivElement>,
  ) {
    if (
      event.target !==
      event.currentTarget
    ) {
      return
    }

    if (
      event.key === 'ArrowLeft'
    ) {
      event.preventDefault()
      scrollByPage('left')
      return
    }

    if (
      event.key === 'ArrowRight'
    ) {
      event.preventDefault()
      scrollByPage('right')
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()

      railRef.current?.scrollTo({
        left: 0,

        behavior:
          getPreferredScrollBehavior(),
      })

      return
    }

    if (event.key === 'End') {
      event.preventDefault()

      railRef.current?.scrollTo({
        left:
          railRef.current.scrollWidth,

        behavior:
          getPreferredScrollBehavior(),
      })
    }
  }

  const selectedEpisode =
    season?.episodes.find(
      (episode) =>
        `${seasonSummary.seasonNumber}:${episode.tmdbEpisodeId}` ===
        activeEpisodeKey,
    ) ?? null

  return (
    <div
      ref={rowRef}
      className="py-6 first:pt-0 last:pb-0"
    >
      <div className="grid gap-4 lg:grid-cols-[8.5rem_minmax(0,1fr)] lg:gap-6">
        <header className="flex items-end justify-between gap-4 lg:block">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
              Season
            </p>

            <h3 className="mt-1 text-xl font-bold text-white">
              {
                seasonSummary.seasonNumber
              }
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {
                seasonSummary.episodeCount
              }{' '}
              episodes
            </p>
          </div>

          <div className="flex gap-2 lg:mt-4">
            <button
              type="button"
              aria-label={`Scroll Season ${seasonSummary.seasonNumber} episodes left`}
              aria-controls={railId}
              disabled={!canScrollLeft}
              onClick={() =>
                scrollByPage('left')
              }
              className="media-row-desktop-control h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-slate-950/75 text-white transition hover:border-sky-300/50 hover:bg-sky-500 disabled:cursor-default disabled:border-white/5 disabled:text-slate-700"
            >
              <ArrowIcon
                direction="left"
              />
            </button>

            <button
              type="button"
              aria-label={`Scroll Season ${seasonSummary.seasonNumber} episodes right`}
              aria-controls={railId}
              disabled={!canScrollRight}
              onClick={() =>
                scrollByPage('right')
              }
              className="media-row-desktop-control h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-slate-950/75 text-white transition hover:border-sky-300/50 hover:bg-sky-500 disabled:cursor-default disabled:border-white/5 disabled:text-slate-700"
            >
              <ArrowIcon
                direction="right"
              />
            </button>
          </div>
        </header>

        <div className="min-w-0">
          {!shouldLoad ||
          isLoading ? (
            <SeasonRowSkeleton />
          ) : null}

          {!isLoading &&
            errorMessage && (
            <div
              role="alert"
              className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4"
            >
              <p className="text-sm text-red-100">
                {errorMessage}
              </p>

              <button
                type="button"
                onClick={retry}
                className="mt-3 text-sm font-semibold text-red-100 underline underline-offset-4"
              >
                Try season again
              </button>
            </div>
          )}

          {!isLoading &&
            !errorMessage &&
            season && (
            <>
              <p
                id={instructionsId}
                className="sr-only"
              >
                Use the left and right
                arrow keys to browse
                Season{' '}
                {
                  seasonSummary.seasonNumber
                }{' '}
                episodes when the row
                is focused.
              </p>

              <div
                id={railId}
                ref={railRef}
                tabIndex={0}
                aria-label={`Season ${seasonSummary.seasonNumber} episode ratings`}
                aria-describedby={
                  instructionsId
                }
                onScroll={
                  updateScrollState
                }
                onKeyDown={
                  handleRailKeyDown
                }
                className="media-row-scrollbar flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain pb-2 pr-4 focus-visible:rounded-xl sm:gap-2.5 sm:pr-6"
              >
                {season.episodes.map(
                  (episode) => {
                    const episodeKey =
                      `${seasonSummary.seasonNumber}:${episode.tmdbEpisodeId}`

                    const isSelected =
                      activeEpisodeKey ===
                      episodeKey

                    const hasRating =
                      episode.rating > 0 &&
                      episode.voteCount > 0

                    const ratingVisual =
                      getRatingVisual(
                        episode.rating,
                        episode.voteCount,
                      )

                    return (
                      <button
                        key={
                          episode.tmdbEpisodeId
                        }
                        type="button"
                        title={`${episode.name}${
                          hasRating
                            ? ` — ${episode.rating.toFixed(
                                1,
                              )} from ${formatVotes(
                                episode.voteCount,
                              )} votes`
                            : ' — Not rated'
                        }`}
                        aria-expanded={
                          isSelected
                        }
                        aria-controls={
                          isSelected
                            ? detailsPanelId
                            : undefined
                        }
                        aria-label={`Season ${seasonSummary.seasonNumber}, Episode ${episode.episodeNumber}, ${episode.name}, ${ratingVisual.description}`}
                        onClick={() =>
                          onEpisodeChange(
                            isSelected
                              ? null
                              : episodeKey,
                          )
                        }
                        className={`flex h-[4.5rem] w-[4.5rem] min-w-[4.5rem] snap-start flex-col items-center justify-center rounded-xl border text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 sm:h-[4.75rem] sm:w-[4.75rem] sm:min-w-[4.75rem] ${
                          ratingVisual.className
                        } ${
                          isSelected
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-950'
                            : ''
                        }`}
                      >
                        <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] opacity-75">
                          E
                          {String(
                            episode.episodeNumber,
                          ).padStart(
                            2,
                            '0',
                          )}
                        </span>

                        <span className="mt-1 text-xl font-black leading-none">
                          {hasRating
                            ? episode.rating.toFixed(
                                1,
                              )
                            : '—'}
                        </span>
                      </button>
                    )
                  },
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedEpisode && (
        <EpisodeDetailsPanel
          panelId={detailsPanelId}
          seasonNumber={
            seasonSummary.seasonNumber
          }
          episode={
            selectedEpisode
          }
          onClose={() =>
            onEpisodeChange(null)
          }
        />
      )}
    </div>
  )
}

export default SeasonEpisodeRow