import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import type { MediaItem } from '../types/media'
import ContentContainer from './layout/ContentContainer'
import MediaCard from './MediaCard'

interface MediaRowProps {
  title: string
  description?: string
  items: MediaItem[]
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
      className="h-6 w-6"
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

function getPreferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches
    ? 'auto'
    : 'smooth'
}

function MediaRow({
  title,
  description,
  items,
}: MediaRowProps) {
  const railRef =
    useRef<HTMLDivElement>(null)

  const headingId = useId()
  const descriptionId = useId()
  const railId = useId()
  const instructionsId = useId()

  const [canScrollLeft, setCanScrollLeft] =
    useState(false)

  const [canScrollRight, setCanScrollRight] =
    useState(false)

  const updateScrollState =
    useCallback(() => {
      const rail = railRef.current

      if (!rail) {
        return
      }

      const overflowThreshold = 4

      const maximumScrollLeft =
        rail.scrollWidth -
        rail.clientWidth

      setCanScrollLeft(
        rail.scrollLeft >
          overflowThreshold,
      )

      setCanScrollRight(
        maximumScrollLeft -
          rail.scrollLeft >
          overflowThreshold,
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
    items.length,
    updateScrollState,
  ])

  function scrollByPage(
    direction: 'left' | 'right',
  ) {
    const rail = railRef.current

    if (!rail) {
      return
    }

    const scrollDistance =
      rail.clientWidth * 0.82

    rail.scrollBy({
      left:
        direction === 'left'
          ? -scrollDistance
          : scrollDistance,

      behavior:
        getPreferredScrollBehavior(),
    })
  }

  function scrollToBoundary(
    boundary: 'start' | 'end',
  ) {
    const rail = railRef.current

    if (!rail) {
      return
    }

    rail.scrollTo({
      left:
        boundary === 'start'
          ? 0
          : rail.scrollWidth,

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
      scrollToBoundary('start')
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      scrollToBoundary('end')
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      aria-describedby={
        description
          ? descriptionId
          : undefined
      }
      className="py-7 sm:py-8"
    >
      <ContentContainer>
        <header className="mb-4 sm:mb-5">
          <h2
            id={headingId}
            className="text-xl font-bold tracking-tight text-white sm:text-2xl"
          >
            {title}
          </h2>

          {description && (
            <p
              id={descriptionId}
              className="mt-1 max-w-3xl text-sm leading-6 text-slate-400"
            >
              {description}
            </p>
          )}
        </header>

        <div className="relative">
          <p
            id={instructionsId}
            className="sr-only"
          >
            Use the left and right
            arrow keys to browse this
            row when it is focused.
          </p>

          <div
            id={railId}
            ref={railRef}
            tabIndex={0}
            aria-label={`${title} media`}
            aria-describedby={
              instructionsId
            }
            onScroll={
              updateScrollState
            }
            onKeyDown={
              handleRailKeyDown
            }
            className="media-row-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain pb-2 pr-4 scroll-px-1 focus-visible:rounded-2xl sm:gap-4 sm:pr-6 lg:gap-5 lg:pr-8"
          >
            {items.map((item) => (
              <div
                key={`${item.mediaType}-${item.tmdbId}`}
                className="w-[154px] min-w-[154px] flex-shrink-0 snap-start sm:w-[176px] sm:min-w-[176px] lg:w-[196px] lg:min-w-[196px]"
              >
                <MediaCard
                  item={item}
                />
              </div>
            ))}
          </div>

          {canScrollLeft && (
            <>
              <div className="media-row-desktop-fade pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent xl:w-20" />

              <button
                type="button"
                aria-label={`Scroll ${title} left`}
                aria-controls={railId}
                onClick={() =>
                  scrollByPage('left')
                }
                className="media-row-desktop-control absolute left-2 top-1/2 z-20 min-h-12 min-w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/85 text-white shadow-xl shadow-black/40 backdrop-blur-md transition hover:border-sky-300/60 hover:bg-sky-500"
              >
                <ArrowIcon
                  direction="left"
                />
              </button>
            </>
          )}

          {canScrollRight && (
            <>
              <div className="media-row-desktop-fade pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-slate-950 via-slate-950/75 to-transparent xl:w-20" />

              <button
                type="button"
                aria-label={`Scroll ${title} right`}
                aria-controls={railId}
                onClick={() =>
                  scrollByPage('right')
                }
                className="media-row-desktop-control absolute right-2 top-1/2 z-20 min-h-12 min-w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/85 text-white shadow-xl shadow-black/40 backdrop-blur-md transition hover:border-sky-300/60 hover:bg-sky-500"
              >
                <ArrowIcon
                  direction="right"
                />
              </button>
            </>
          )}
        </div>
      </ContentContainer>
    </section>
  )
}

export default MediaRow