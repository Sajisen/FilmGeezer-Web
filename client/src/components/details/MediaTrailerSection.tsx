import {
  useEffect,
  useId,
  useState,
} from 'react'
import type { MediaVideo } from '../../types/media'
import { getLanguageName } from '../../utils/language'
import MediaDetailsContainer from './MediaDetailsContainer'

interface MediaTrailerSectionProps {
  itemTitle: string
  backdropUrl: string
  videos: MediaVideo[]
  primaryTrailer: MediaVideo | null
}

interface PlayIconProps {
  className?: string
}

function PlayIcon({
  className = '',
}: PlayIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="m9 7 8 5-8 5V7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function getVideoLanguageLabel(
  language: string,
) {
  if (
    !language ||
    language === 'Unknown'
  ) {
    return 'Language unavailable'
  }

  return getLanguageName(language)
}

function getVideoMetaLabel(
  video: MediaVideo,
) {
  return [
    video.type,
    video.official
      ? 'Official'
      : null,
    getVideoLanguageLabel(
      video.language,
    ),
  ]
    .filter(Boolean)
    .join(' • ')
}

function MediaTrailerSection({
  itemTitle,
  backdropUrl,
  videos,
  primaryTrailer,
}: MediaTrailerSectionProps) {
  const headingId = useId()

  const availableVideos =
    videos.length > 0
      ? videos
      : primaryTrailer
        ? [primaryTrailer]
        : []

  const defaultVideoId =
    primaryTrailer?.id ??
    availableVideos[0]?.id ??
    ''

  const videoSignature =
    availableVideos
      .map((video) => video.id)
      .join('|')

  const [
    selectedVideoId,
    setSelectedVideoId,
  ] = useState(defaultVideoId)

  const [
    isPlayerLoaded,
    setIsPlayerLoaded,
  ] = useState(false)

  useEffect(() => {
    setSelectedVideoId(
      defaultVideoId,
    )

    setIsPlayerLoaded(false)
  }, [
    defaultVideoId,
    videoSignature,
  ])

  const selectedVideo =
    availableVideos.find(
      (video) =>
        video.id === selectedVideoId,
    ) ??
    availableVideos[0] ??
    null

  if (!selectedVideo) {
    return null
  }

  const selectedVideoIndex =
    Math.max(
      availableVideos.findIndex(
        (video) =>
          video.id ===
          selectedVideo.id,
      ),
      0,
    )

  const embedUrl =
    `https://www.youtube-nocookie.com/embed/` +
    `${encodeURIComponent(
      selectedVideo.key,
    )}` +
    '?autoplay=1&playsinline=1'

  const youtubeUrl =
    `https://www.youtube.com/watch?v=` +
    encodeURIComponent(
      selectedVideo.key,
    )

  function selectVideo(
    videoId: string,
  ) {
    setSelectedVideoId(videoId)
    setIsPlayerLoaded(false)
  }

  return (
    <section
      id="trailer"
      aria-labelledby={headingId}
      className="scroll-mt-24 py-10 sm:py-12"
    >
      <MediaDetailsContainer>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Video
            </p>

            <h2
              id={headingId}
              className="mt-2 text-2xl font-bold text-white sm:text-3xl"
            >
              Trailer & videos
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Select an available trailer
              or preview and watch it
              without leaving FilmGeezer.
            </p>
          </header>

          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="min-w-0">
              <div className="relative aspect-video min-h-[200px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/25">
                {isPlayerLoaded ? (
                  <iframe
                    src={embedUrl}
                    title={`${selectedVideo.name} — video for ${itemTitle}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setIsPlayerLoaded(
                        true,
                      )
                    }
                    aria-label={`Play ${selectedVideo.name}`}
                    className="group absolute inset-0 h-full w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300"
                  >
                    <img
                      src={backdropUrl}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />

                    <div className="absolute inset-0 bg-slate-950/30" />

                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/60 to-slate-950/20" />

                    <div
                      aria-live="polite"
                      className="absolute inset-y-0 left-0 z-10 flex w-[68%] flex-col justify-end p-4 sm:w-[58%] sm:p-6 lg:p-8"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                        Video{' '}
                        {selectedVideoIndex +
                          1}{' '}
                        of{' '}
                        {
                          availableVideos.length
                        }
                      </p>

                      <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-white sm:text-2xl lg:text-3xl">
                        {selectedVideo.name}
                      </h3>

                      <p className="mt-2 line-clamp-1 text-xs text-slate-300 sm:text-sm">
                        {getVideoMetaLabel(
                          selectedVideo,
                        )}
                      </p>
                    </div>

                    <div className="absolute inset-y-0 right-0 z-10 flex w-[32%] items-center justify-center sm:w-[42%]">
                      <span className="relative inline-flex items-center justify-center">
                        <span className="absolute h-20 w-20 rounded-full bg-sky-400/25 blur-2xl transition duration-300 group-hover:scale-125 group-hover:bg-sky-300/35 sm:h-24 sm:w-24" />

                        <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_18px_50px_rgba(14,165,233,0.35)] transition duration-300 group-hover:scale-105 group-hover:from-sky-300 group-hover:to-blue-500 sm:h-20 sm:w-20">
                          <PlayIcon className="ml-1 h-8 w-8 sm:h-10 sm:w-10" />
                        </span>
                      </span>
                    </div>
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="line-clamp-2 font-semibold text-white">
                    {selectedVideo.name}
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    {getVideoMetaLabel(
                      selectedVideo,
                    )}
                  </p>
                </div>

                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-semibold text-white transition hover:border-sky-300/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  Open on YouTube

                  <span
                    aria-hidden="true"
                    className="ml-2"
                  >
                    ↗
                  </span>
                </a>
              </div>
            </div>

            <aside
              aria-label="Available videos"
              className="self-start rounded-2xl border border-white/10 bg-slate-950/45 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-white">
                    More videos
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Choose another trailer
                    or preview.
                  </p>
                </div>

                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-slate-300">
                  {
                    availableVideos.length
                  }
                </span>
              </div>

              <div className="trailer-video-list mt-4 max-h-96 space-y-2 overflow-y-auto pr-2">
                {availableVideos.map(
                  (video, index) => {
                    const isSelected =
                      video.id ===
                      selectedVideo.id

                    return (
                      <button
                        key={video.id}
                        type="button"
                        aria-pressed={
                          isSelected
                        }
                        onClick={() =>
                          selectVideo(
                            video.id,
                          )
                        }
                        className={`w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                          isSelected
                            ? 'border-sky-400/45 bg-sky-500/15'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Video{' '}
                          {index + 1}
                        </span>

                        <span className="mt-2 line-clamp-2 block text-sm font-semibold leading-5 text-white">
                          {video.name}
                        </span>

                        <span className="mt-2 block text-xs leading-5 text-slate-400">
                          {getVideoMetaLabel(
                            video,
                          )}
                        </span>
                      </button>
                    )
                  },
                )}
              </div>
            </aside>
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            The YouTube player loads
            only after you press Play.
          </p>
        </div>
      </MediaDetailsContainer>
    </section>
  )
}

export default MediaTrailerSection