import { useId, useState } from "react";
import type { MediaVideo } from "../../types/media";
import { getLanguageName } from "../../utils/language";
import MediaDetailsContainer from "./MediaDetailsContainer";

interface MediaTrailerSectionProps {
  itemTitle: string;
  backdropUrl: string;
  videos: MediaVideo[];
  primaryTrailer: MediaVideo | null;
}

interface PlayIconProps {
  className?: string;
}

function PlayIcon({ className = "" }: PlayIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path d="m9 7 8 5-8 5V7Z" fill="currentColor" />
    </svg>
  );
}

function getVideoLanguageLabel(language: string) {
  if (!language || language === "Unknown") {
    return "Language unavailable";
  }

  return getLanguageName(language);
}

function getVideoMetaLabel(video: MediaVideo) {
  return [
    video.type,
    video.official ? "Official" : null,
    getVideoLanguageLabel(video.language),
  ]
    .filter(Boolean)
    .join(" • ");
}

function MediaTrailerContent({
  itemTitle,
  backdropUrl,
  videos,
  primaryTrailer,
}: MediaTrailerSectionProps) {
  const headingId = useId();

  const availableVideos =
    videos.length > 0 ? videos : primaryTrailer ? [primaryTrailer] : [];

  const defaultVideoId = primaryTrailer?.id ?? availableVideos[0]?.id ?? "";

  const [selectedVideoId, setSelectedVideoId] = useState(defaultVideoId);

  const [isPlayerLoaded, setIsPlayerLoaded] = useState(false);

  const selectedVideo =
    availableVideos.find((video) => video.id === selectedVideoId) ??
    availableVideos[0] ??
    null;

  if (!selectedVideo) {
    return null;
  }

  const selectedVideoIndex = Math.max(
    availableVideos.findIndex((video) => video.id === selectedVideo.id),
    0,
  );

  const embedUrl =
    `https://www.youtube-nocookie.com/embed/` +
    `${encodeURIComponent(selectedVideo.key)}` +
    "?autoplay=1&playsinline=1";

  const youtubeUrl =
    `https://www.youtube.com/watch?v=` + encodeURIComponent(selectedVideo.key);

  function selectVideo(videoId: string) {
    setSelectedVideoId(videoId);
    setIsPlayerLoaded(false);
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
              Select an available trailer or preview and watch it without
              leaving FilmGeezer.
            </p>
          </header>

          <div className="mt-6 grid w-full min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="w-full min-w-0">
              <div className="relative aspect-video w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/25">
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
                    onClick={() => setIsPlayerLoaded(true)}
                    aria-label={`Play ${selectedVideo.name}`}
                    className="group absolute inset-0 h-full w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300"
                  >
                    <img
                      src={backdropUrl}
                      alt=""
                      aria-hidden="true"
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                    />

                    <div className="absolute inset-0 bg-slate-950/25" />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-slate-950/15" />

                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/35 to-transparent" />

                    <div
                      aria-live="polite"
                      className="absolute inset-x-0 bottom-0 z-10 p-4 sm:p-6 lg:p-8"
                    >
                      <div className="max-w-[86%] sm:max-w-[66%] lg:max-w-[52%]">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                          Video {selectedVideoIndex + 1} of{" "}
                          {availableVideos.length}
                        </p>

                        <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-tight text-white sm:text-2xl lg:text-3xl">
                          {selectedVideo.name}
                        </h3>

                        <p className="mt-2 line-clamp-1 text-xs text-slate-300 sm:text-sm">
                          {getVideoMetaLabel(selectedVideo)}
                        </p>
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                      <span className="relative inline-flex items-center justify-center">
                        <span className="absolute h-20 w-20 rounded-full border border-sky-300/20 bg-sky-400/15 blur-sm transition duration-300 group-hover:scale-110 group-hover:bg-sky-300/25 sm:h-24 sm:w-24" />

                        <span className="absolute h-24 w-24 rounded-full bg-sky-400/15 blur-2xl transition duration-300 group-hover:scale-125 sm:h-28 sm:w-28" />

                        <span className="relative inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-[0_18px_50px_rgba(14,165,233,0.38)] transition duration-300 group-hover:scale-105 group-hover:from-sky-300 group-hover:to-blue-500 sm:h-20 sm:w-20">
                          <PlayIcon className="ml-1 h-8 w-8 sm:h-10 sm:w-10" />
                        </span>
                      </span>
                    </div>
                  </button>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div aria-live="polite" className="min-w-0">
                    {isPlayerLoaded ? (
                      <>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                          Now playing
                        </p>

                        <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">
                          {selectedVideo.name}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">
                        Video {selectedVideoIndex + 1} of{" "}
                        {availableVideos.length} selected
                      </p>
                    )}
                  </div>
                </div>

                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/15 px-4 text-sm font-semibold text-white transition hover:border-sky-300/50 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  Open on YouTube
                  <span aria-hidden="true" className="ml-2">
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
                  <h3 className="font-semibold text-white">More videos</h3>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Choose another trailer or preview.
                  </p>
                </div>

                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-semibold text-slate-300">
                  {availableVideos.length}
                </span>
              </div>

              <div className="trailer-video-list mt-4 max-h-96 space-y-2 overflow-y-auto pr-2">
                {availableVideos.map((video, index) => {
                  const isSelected = video.id === selectedVideo.id;

                  return (
                    <button
                      key={video.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => selectVideo(video.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                        isSelected
                          ? "border-sky-400/45 bg-sky-500/15"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Video {index + 1}
                      </span>

                      <span className="mt-2 line-clamp-2 block text-sm font-semibold leading-5 text-white">
                        {video.name}
                      </span>

                      <span className="mt-2 block text-xs leading-5 text-slate-400">
                        {getVideoMetaLabel(video)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            The YouTube player loads only after you press Play.
          </p>
        </div>
      </MediaDetailsContainer>
    </section>
  );
}

function MediaTrailerSection(props: MediaTrailerSectionProps) {
  const videoKey = [
    props.itemTitle,
    props.primaryTrailer?.id ?? "",
    ...props.videos.map((video) => video.id),
  ].join("|");

  return <MediaTrailerContent key={videoKey} {...props} />;
}

export default MediaTrailerSection;