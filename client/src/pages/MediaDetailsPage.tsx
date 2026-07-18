import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import ProviderLinksSection from "../components/ProviderLinksSection";
import ErrorState from "../components/states/ErrorState";
import LoadingState from "../components/states/LoadingState";
import { getMediaByTmdbId } from "../services/mediaService";
import { getProviderLinksByMedia } from "../services/providerLinkService";
import type { MediaItem } from "../types/media";
import type { ProviderLink } from "../types/providerLink";

interface MediaDetailsRequestState {
  mediaType: string | null;
  tmdbId: string | null;
  requestKey: number;
  selectedMedia: MediaItem | null;
  providerLinks: ProviderLink[];
  errorMessage: string;
}

const initialRequestState: MediaDetailsRequestState = {
  mediaType: null,
  tmdbId: null,
  requestKey: -1,
  selectedMedia: null,
  providerLinks: [],
  errorMessage: "",
};

function MediaDetailsPage() {
  const { mediaType, tmdbId } = useParams();

  const [reloadKey, setReloadKey] = useState(0);

  const [requestState, setRequestState] =
    useState<MediaDetailsRequestState>(initialRequestState);

  useEffect(() => {
    if (!mediaType || !tmdbId) {
      return;
    }

    const controller = new AbortController();

    async function loadMediaDetails(
      requestedMediaType: string,
      requestedTmdbId: string,
    ) {
      try {
        const [media, links] = await Promise.all([
          getMediaByTmdbId(
            requestedMediaType,
            requestedTmdbId,
            controller.signal,
          ),
          getProviderLinksByMedia(
            requestedMediaType,
            requestedTmdbId,
            controller.signal,
          ),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          mediaType: requestedMediaType,
          tmdbId: requestedTmdbId,
          requestKey: reloadKey,
          selectedMedia: media,
          providerLinks: links,
          errorMessage: "",
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setRequestState({
          mediaType: requestedMediaType,
          tmdbId: requestedTmdbId,
          requestKey: reloadKey,
          selectedMedia: null,
          providerLinks: [],
          errorMessage:
            error instanceof Error
              ? error.message
              : "Something went wrong while loading media details.",
        });
      }
    }

    void loadMediaDetails(mediaType, tmdbId);

    return () => {
      controller.abort();
    };
  }, [mediaType, tmdbId, reloadKey]);

  const requestMatchesCurrentMedia =
    requestState.mediaType === mediaType &&
    requestState.tmdbId === tmdbId &&
    requestState.requestKey === reloadKey;

  const hasValidRouteParameters = Boolean(
    mediaType && tmdbId,
  );

  const isLoading =
    hasValidRouteParameters &&
    !requestMatchesCurrentMedia;

  const selectedMedia = requestMatchesCurrentMedia
    ? requestState.selectedMedia
    : null;

  const providerLinks = requestMatchesCurrentMedia
    ? requestState.providerLinks
    : [];

  const errorMessage = requestMatchesCurrentMedia
    ? requestState.errorMessage
    : "";

  function retryMediaDetails() {
    setReloadKey(
      (currentKey) => currentKey + 1,
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <LoadingState
          title="Loading media details"
          message="Please wait while we load the selected title."
        />
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <ErrorState
          message={errorMessage}
          onRetry={retryMediaDetails}
        />
      </main>
    );
  }

  if (!selectedMedia) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
            Not Found
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Media item not found
          </h1>

          <p className="mt-4 text-slate-300">
            This media item could not be found.
          </p>

          <Link
            to="/"
            className="mt-8 inline-block rounded-full bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <img
            src={selectedMedia.backdropUrl}
            alt={selectedMedia.title}
            className="h-full w-full object-cover opacity-25 blur-sm"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/80" />
        </div>

        <div className="relative z-10 px-4 py-12 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="mb-8 inline-block text-sm font-semibold text-sky-300 transition hover:text-sky-200"
          >
            ← Back to Home
          </Link>

          <div className="grid gap-8 md:grid-cols-[280px_1fr]">
            <img
              src={selectedMedia.posterUrl}
              alt={selectedMedia.title}
              className="w-full max-w-[280px] rounded-2xl border border-white/10 shadow-2xl"
            />

            <div>
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold uppercase text-sky-300">
                  {selectedMedia.mediaType}
                </span>

                <span className="text-sm text-slate-400">
                  {selectedMedia.year}
                </span>

                <span className="text-sm text-slate-400">
                  {selectedMedia.durationLabel}
                </span>

                <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-sm font-semibold text-yellow-300">
                  ⭐ {selectedMedia.rating}
                </span>
              </div>

              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                {selectedMedia.title}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                {selectedMedia.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                {selectedMedia.overview}
              </p>

              <div className="mt-6 grid max-w-xl gap-3 text-sm text-slate-300 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-slate-500">
                    Status
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {selectedMedia.status}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-slate-500">
                    Language
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {selectedMedia.language}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-slate-500">
                    TMDB ID
                  </p>

                  <p className="mt-1 font-semibold text-white">
                    {selectedMedia.tmdbId}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-slate-500">
                    Type
                  </p>

                  <p className="mt-1 font-semibold uppercase text-white">
                    {selectedMedia.mediaType}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <button className="rounded-full bg-sky-500 px-6 py-3 font-semibold text-white transition hover:bg-sky-400">
                  Add to Watchlist
                </button>

                <a
                  href="#provider-links"
                  className="rounded-full border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  View Provider Links
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ProviderLinksSection
        links={providerLinks}
      />
    </main>
  );
}

export default MediaDetailsPage;