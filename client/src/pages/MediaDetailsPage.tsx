import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import MediaDetailsSkeleton from "../components/details/MediaDetailsSkeleton";
import ContentContainer from "../components/layout/ContentContainer";
import ProviderLinksSection from "../components/ProviderLinksSection";
import ErrorState from "../components/states/ErrorState";
import WatchlistButton from "../components/WatchlistButton";
import { getMediaByTmdbId } from "../services/mediaService";
import { getProviderLinksByMedia } from "../services/providerLinkService";
import type { MediaDetails } from "../types/media";
import type { ProviderLinksPayload } from "../types/providerLink";
import { getLanguageName } from "../utils/language";
import MediaDetailsContainer from "../components/details/MediaDetailsContainer";
import MediaTrailerSection from "../components/details/MediaTrailerSection";
import WatchAvailabilitySection from "../components/details/WatchAvailabilitySection";
import FeaturedCharactersSection from "../components/details/FeaturedCharactersSection";
import EpisodeExplorerSection from "../components/details/EpisodeExplorerSection";
import MediaDetailsQuickNav from "../components/details/MediaDetailsQuickNav";
import MoreLikeThisSection from "../components/details/MoreLikeThisSection";
import ExternalLink from "../features/externalNavigation/ExternalLink";
import TelegramIcon from "../components/icons/TelegramIcon";

interface MediaDetailsRequestState {
  mediaType: string | null;
  tmdbId: string | null;
  requestKey: number;
  selectedMedia: MediaDetails | null;
  errorMessage: string;
}

interface ProviderLinksRequestState {
  mediaType: string | null;
  tmdbId: string | null;
  requestKey: number;
  data: ProviderLinksPayload | null;
  errorMessage: string;
}

const initialMediaRequestState: MediaDetailsRequestState = {
  mediaType: null,
  tmdbId: null,
  requestKey: -1,
  selectedMedia: null,
  errorMessage: "",
};

const initialProviderRequestState: ProviderLinksRequestState = {
  mediaType: null,
  tmdbId: null,
  requestKey: -1,
  data: null,
  errorMessage: "",
};

function formatReleaseDate(dateText: string) {
  if (!dateText) {
    return "Date unavailable";
  }

  const parsedDate = new Date(`${dateText}T00:00:00Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return dateText;
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(parsedDate);
}

function formatVoteCount(voteCount: number) {
  return new Intl.NumberFormat("en-US").format(voteCount);
}

function formatRuntime(runtimeMinutes: number | null, fallbackLabel: string) {
  if (runtimeMinutes === null || runtimeMinutes <= 0) {
    return fallbackLabel;
  }

  const hours = Math.floor(runtimeMinutes / 60);

  const minutes = runtimeMinutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  if (minutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

function getMediaTypeLabel(mediaType: MediaDetails["mediaType"]) {
  return mediaType === "movie" ? "Movie" : "TV Series";
}

function getBrowseFallbackPath(media: MediaDetails) {
  const normalizedGenres = media.genres.map((genre) =>
    genre.toLocaleLowerCase(),
  );

  const isAnime =
    media.language === "ja" && normalizedGenres.includes("animation");

  if (isAnime) {
    return "/anime";
  }

  if (media.language === "ko") {
    return "/k-drama";
  }

  return media.mediaType === "movie" ? "/movies" : "/tv";
}

function MediaDetailsPage() {
  const { mediaType, tmdbId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [detailsReloadKey, setDetailsReloadKey] = useState(0);

  const [linksReloadKey, setLinksReloadKey] = useState(0);

  const [characterAvailability, setCharacterAvailability] = useState({
    mediaKey: "",
    hasCharacters: false,
  });

  const [mediaRequestState, setMediaRequestState] =
    useState<MediaDetailsRequestState>(initialMediaRequestState);

  const [providerRequestState, setProviderRequestState] =
    useState<ProviderLinksRequestState>(initialProviderRequestState);

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
        const media = await getMediaByTmdbId(
          requestedMediaType,
          requestedTmdbId,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setMediaRequestState({
          mediaType: requestedMediaType,

          tmdbId: requestedTmdbId,

          requestKey: detailsReloadKey,

          selectedMedia: media,
          errorMessage: "",
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setMediaRequestState({
          mediaType: requestedMediaType,

          tmdbId: requestedTmdbId,

          requestKey: detailsReloadKey,

          selectedMedia: null,

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
  }, [mediaType, tmdbId, detailsReloadKey]);

  useEffect(() => {
    if (!mediaType || !tmdbId) {
      return;
    }

    const controller = new AbortController();

    async function loadProviderLinks(
      requestedMediaType: string,
      requestedTmdbId: string,
    ) {
      try {
        const data = await getProviderLinksByMedia(
          requestedMediaType,
          requestedTmdbId,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setProviderRequestState({
          mediaType: requestedMediaType,

          tmdbId: requestedTmdbId,

          requestKey: linksReloadKey,

          data,
          errorMessage: "",
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setProviderRequestState({
          mediaType: requestedMediaType,

          tmdbId: requestedTmdbId,

          requestKey: linksReloadKey,

          data: null,

          errorMessage:
            error instanceof Error
              ? error.message
              : "Something went wrong while loading available links.",
        });
      }
    }

    void loadProviderLinks(mediaType, tmdbId);

    return () => {
      controller.abort();
    };
  }, [mediaType, tmdbId, linksReloadKey]);

  const hasValidRouteParameters = Boolean(mediaType && tmdbId);

  const mediaRequestMatches =
    mediaRequestState.mediaType === mediaType &&
    mediaRequestState.tmdbId === tmdbId &&
    mediaRequestState.requestKey === detailsReloadKey;

  const providerRequestMatches =
    providerRequestState.mediaType === mediaType &&
    providerRequestState.tmdbId === tmdbId &&
    providerRequestState.requestKey === linksReloadKey;

  const isMediaLoading = hasValidRouteParameters && !mediaRequestMatches;

  const isProviderLinksLoading =
    hasValidRouteParameters && !providerRequestMatches;

  const selectedMedia = mediaRequestMatches
    ? mediaRequestState.selectedMedia
    : null;

  const mediaErrorMessage = mediaRequestMatches
    ? mediaRequestState.errorMessage
    : "";

  const providerLinksData = providerRequestMatches
    ? providerRequestState.data
    : null;

  const providerErrorMessage = providerRequestMatches
    ? providerRequestState.errorMessage
    : "";

  const currentMediaKey = `${mediaType ?? ""}:${tmdbId ?? ""}`;

  const hasFeaturedCharacters =
    characterAvailability.mediaKey === currentMediaKey &&
    characterAvailability.hasCharacters;

  const handleCharacterAvailabilityChange = useCallback(
    (hasCharacters: boolean) => {
      setCharacterAvailability((currentState) => {
        if (
          currentState.mediaKey === currentMediaKey &&
          currentState.hasCharacters === hasCharacters
        ) {
          return currentState;
        }

        return {
          mediaKey: currentMediaKey,
          hasCharacters,
        };
      });
    },
    [currentMediaKey],
  );

  function retryMediaDetails() {
    setDetailsReloadKey((currentKey) => currentKey + 1);
  }

  function retryProviderLinks() {
    setLinksReloadKey((currentKey) => currentKey + 1);
  }

  if (isMediaLoading) {
    return <MediaDetailsSkeleton mediaType={mediaType} />;
  }

  if (mediaErrorMessage) {
    return (
      <main className="min-h-screen bg-slate-950 py-16 text-white">
        <ContentContainer>
          <ErrorState
            title="Media details could not be loaded"
            message={mediaErrorMessage}
            onRetry={retryMediaDetails}
          />
        </ContentContainer>
      </main>
    );
  }

  if (!selectedMedia) {
    return (
      <main className="min-h-screen bg-slate-950 py-16 text-white">
        <ContentContainer>
          <div className="max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Not found
            </p>

            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Media item not found
            </h1>

            <p className="mt-4 leading-7 text-slate-300">
              This title may have been removed or the link may be incorrect.
            </p>

            <Link
              to="/"
              className="mt-7 inline-flex min-h-11 items-center rounded-full bg-sky-500 px-5 font-semibold text-white transition hover:bg-sky-400"
            >
              Back to Home
            </Link>
          </div>
        </ContentContainer>
      </main>
    );
  }

  const mediaTypeLabel = getMediaTypeLabel(selectedMedia.mediaType);

  const languageLabel = getLanguageName(selectedMedia.language);

  const releaseDateLabel = formatReleaseDate(selectedMedia.fullReleaseDate);

  const runtimeLabel = formatRuntime(
    selectedMedia.runtimeMinutes,
    selectedMedia.durationLabel,
  );

  const showsOriginalTitle =
    selectedMedia.originalTitle &&
    selectedMedia.originalTitle.toLocaleLowerCase() !==
      selectedMedia.title.toLocaleLowerCase();

  const imdbUrl = selectedMedia.imdbId
    ? `https://www.imdb.com/title/${encodeURIComponent(selectedMedia.imdbId)}/`
    : "";

  const primaryFacts = [
    selectedMedia.fullReleaseDate
      ? {
          label:
            selectedMedia.mediaType === "movie"
              ? "Release date"
              : "First aired",
          value: releaseDateLabel,
        }
      : null,

    selectedMedia.mediaType === "movie"
      ? selectedMedia.runtimeMinutes !== null &&
        selectedMedia.runtimeMinutes > 0
        ? {
            label: "Runtime",
            value: runtimeLabel,
          }
        : null
      : (selectedMedia.numberOfSeasons ?? 0) > 0
        ? {
            label: "Seasons",
            value: `${selectedMedia.numberOfSeasons} ${
              selectedMedia.numberOfSeasons === 1 ? "season" : "seasons"
            }`,
          }
        : null,

    selectedMedia.mediaType === "tv" &&
    (selectedMedia.numberOfEpisodes ?? 0) > 0
      ? {
          label: "Episodes",
          value: `${selectedMedia.numberOfEpisodes} ${
            selectedMedia.numberOfEpisodes === 1 ? "episode" : "episodes"
          }`,
        }
      : null,

    selectedMedia.language
      ? {
          label: "Original language",
          value: languageLabel,
        }
      : null,

    selectedMedia.status &&
    selectedMedia.status.trim().toLowerCase() !== "unknown"
      ? {
          label: "Status",
          value: selectedMedia.status,
        }
      : null,
  ].filter(
    (
      fact,
    ): fact is {
      label: string;
      value: string;
    } => fact !== null,
  );

  const hasTrailer =
    selectedMedia.videos.length > 0 || Boolean(selectedMedia.primaryTrailer);

  const browseFallbackPath = getBrowseFallbackPath(selectedMedia);

  function returnToBrowse() {
    if (location.key !== "default") {
      navigate(-1);
      return;
    }

    navigate(browseFallbackPath);
  }

  return (
    <main className="min-h-screen overflow-x-clip bg-slate-950 text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0">
          <img
            src={selectedMedia.backdropUrl}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-105 object-cover opacity-45 blur-[1px] saturate-125 contrast-110 sm:opacity-50"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/65 to-slate-950" />

          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/72 to-slate-950/15" />
        </div>

        <MediaDetailsContainer className="relative py-8 sm:py-10 lg:py-14">
          <button
            type="button"
            onClick={returnToBrowse}
            aria-label="Return to the previous browsing page"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-slate-950/55 text-sky-300 backdrop-blur-md transition hover:border-sky-300/40 hover:bg-white/[0.06] hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:h-auto sm:w-auto sm:min-h-11 sm:justify-start sm:rounded-none sm:border-0 sm:bg-transparent sm:backdrop-blur-none"
          >
            <span aria-hidden="true" className="text-xl sm:mr-2 sm:text-base">
              ←
            </span>
            <span className="hidden text-sm font-semibold sm:inline">
              Back to browse
            </span>
          </button>

          <div className="mt-6 grid gap-y-6 lg:mx-auto lg:w-fit lg:grid-cols-[260px_minmax(0,620px)] lg:gap-x-10 lg:gap-y-5 xl:grid-cols-[280px_minmax(0,720px)] 2xl:grid-cols-[300px_minmax(0,820px)] 2xl:gap-x-12">
            <div className="order-1 mx-auto w-full max-w-[220px] sm:max-w-[250px] lg:col-start-1 lg:row-start-2 lg:max-w-[300px]">
              <img
                src={selectedMedia.posterUrl}
                alt={`Poster for ${selectedMedia.title}`}
                className="aspect-[2/3] w-full rounded-3xl border border-white/10 object-cover shadow-2xl shadow-black/50"
              />
            </div>

            <div className="order-2 flex flex-wrap justify-center gap-2 lg:col-start-2 lg:row-start-1 lg:justify-start">
              <span className="rounded-full border border-sky-300/15 bg-sky-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-sky-200">
                {mediaTypeLabel}
              </span>

              <span className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur-md">
                {selectedMedia.year || "Year unavailable"}
              </span>

              <span className="rounded-full border border-white/10 bg-slate-950/55 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur-md">
                {runtimeLabel}
              </span>
            </div>

            <div className="order-3 min-w-0 text-center lg:col-start-2 lg:row-start-2 lg:text-left">
              <h1 className="text-balance text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-[4.75rem]">
                {selectedMedia.title}
              </h1>

              {showsOriginalTitle && (
                <p className="mt-3 break-words text-sm font-medium text-slate-400 sm:text-base">
                  Original title: {selectedMedia.originalTitle}
                </p>
              )}

              {selectedMedia.tagline && (
                <p className="mx-auto mt-4 max-w-3xl text-base italic leading-7 text-slate-300 sm:text-lg lg:mx-0">
                  “{selectedMedia.tagline}”
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <div className="rounded-full border border-amber-300/15 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-200">
                  <span aria-hidden="true">★ </span>

                  {selectedMedia.rating > 0
                    ? selectedMedia.rating.toFixed(1)
                    : "Not rated"}
                </div>

                <p className="text-sm text-slate-400">
                  {formatVoteCount(selectedMedia.voteCount)} TMDB votes
                </p>
              </div>

              {selectedMedia.genres.length > 0 && (
                <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {selectedMedia.genres.map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              <div className="mx-auto mt-7 max-w-[72ch] text-left lg:mx-0">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Overview
                </h2>

                <p className="mt-3 text-base leading-8 text-slate-200 sm:text-lg">
                  {selectedMedia.overview}
                </p>
              </div>

              <div className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row lg:mx-0 lg:justify-start">
                <WatchlistButton
                  item={selectedMedia}
                  variant="labeled"
                  className="w-full sm:min-w-[13.5rem]"
                />

                <a
                  href="#provider-links"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-5 font-semibold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:min-w-[13.5rem]"
                >
                  <TelegramIcon className="h-5 w-5" />
                  FilmGeezer links
                </a>
              </div>
            </div>
          </div>
        </MediaDetailsContainer>
      </section>

      <MediaDetailsQuickNav
        hasTrailer={hasTrailer}
        hasEpisodes={
          selectedMedia.mediaType === "tv" && selectedMedia.seasons.length > 0
        }
        hasCharacters={hasFeaturedCharacters}
      />

      <section id="key-details" className="scroll-mt-24 py-10 sm:py-12">
        <MediaDetailsContainer>
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
            <header>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                Title information
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Key details
              </h2>
            </header>

            <dl className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
              {primaryFacts.map((fact, index) => {
                const shouldFillMobileRow =
                  primaryFacts.length % 2 === 1 &&
                  index === primaryFacts.length - 1;

                return (
                  <div
                    key={fact.label}
                    className={`rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 sm:p-5 ${
                      shouldFillMobileRow ? "col-span-2 lg:col-span-1" : ""
                    }`}
                  >
                    <dt className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:text-xs sm:tracking-[0.16em]">
                      {fact.label}
                    </dt>

                    <dd className="mt-1.5 text-sm font-semibold text-white sm:mt-2 sm:text-base">
                      {fact.value}
                    </dd>
                  </div>
                );
              })}
            </dl>

            {(selectedMedia.homepageUrl || imdbUrl) && (
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-white/10 pt-5">
                {selectedMedia.homepageUrl && (
                  <ExternalLink
                    href={selectedMedia.homepageUrl}
                    destinationName="the official website"
                    className="text-sm font-semibold text-sky-300 transition hover:text-sky-200"
                  >
                    Official homepage ↗
                  </ExternalLink>
                )}

                {selectedMedia.homepageUrl && imdbUrl && (
                  <span aria-hidden="true" className="text-slate-600">
                    •
                  </span>
                )}

                {imdbUrl && (
                  <ExternalLink
                    href={imdbUrl}
                    destinationName="IMDb"
                    className="text-sm font-semibold text-sky-300 transition hover:text-sky-200"
                  >
                    IMDb title page ↗
                  </ExternalLink>
                )}
              </div>
            )}
          </div>
        </MediaDetailsContainer>
      </section>

      <MediaTrailerSection
        itemTitle={selectedMedia.title}
        backdropUrl={selectedMedia.backdropUrl}
        videos={selectedMedia.videos}
        primaryTrailer={selectedMedia.primaryTrailer}
      />

      <WatchAvailabilitySection
        mediaType={selectedMedia.mediaType}
        tmdbId={selectedMedia.tmdbId}
      />

      {selectedMedia.mediaType === "tv" && selectedMedia.seasons.length > 0 && (
        <EpisodeExplorerSection
          tmdbId={selectedMedia.tmdbId}
          seasons={selectedMedia.seasons}
        />
      )}
      <FeaturedCharactersSection
        mediaType={selectedMedia.mediaType}
        tmdbId={selectedMedia.tmdbId}
        onAvailabilityChange={handleCharacterAvailabilityChange}
      />

      <ProviderLinksSection
        data={providerLinksData}
        mediaTitle={selectedMedia.title}
        mediaType={selectedMedia.mediaType}
        isLoading={isProviderLinksLoading}
        errorMessage={providerErrorMessage}
        onRetry={retryProviderLinks}
      />

      <MoreLikeThisSection
        mediaType={selectedMedia.mediaType}
        tmdbId={selectedMedia.tmdbId}
      />
    </main>
  );
}

export default MediaDetailsPage;
