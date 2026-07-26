import ExternalLink from "../features/externalNavigation/ExternalLink";
import type { MediaType } from "../types/media";
import type {
  ProviderLink,
  ProviderLinkGroup,
  ProviderLinksPayload,
} from "../types/providerLink";
import TelegramIcon from "./icons/TelegramIcon";
import MediaDetailsContainer from "./details/MediaDetailsContainer";

interface ProviderLinksSectionProps {
  data: ProviderLinksPayload | null;
  mediaTitle: string;
  mediaType: MediaType;
  isLoading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}

type LinkGroupLayout = "stacked" | "grid";

interface LinkCardProps {
  mediaTitle: string;
  mediaType: MediaType;
  groupLabel: string;
  link: ProviderLink;
  alternativeNumber: number | null;
  layout: LinkGroupLayout;
}

function getMediaTypeLabel(mediaType: MediaType) {
  return mediaType === "movie" ? "Movie" : "TV Series";
}

function LinkCard({
  mediaTitle,
  mediaType,
  groupLabel,
  link,
  alternativeNumber,
  layout,
}: LinkCardProps) {
  const usesGridLayout = layout === "grid";
  const optionLabel = link.isMain
    ? "Recommended"
    : `Alt ${alternativeNumber ?? 1}`;

  return (
    <article
      className={`rounded-2xl border border-white/10 bg-slate-900/75 p-4 transition hover:border-sky-400/30 hover:bg-slate-900/90 sm:p-5 ${
        usesGridLayout
          ? "flex h-full flex-col gap-5"
          : "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      }`}
    >
      <div className="min-w-0">
        <h4 className="break-words text-base font-bold leading-6 text-white sm:text-lg">
          {mediaTitle}
        </h4>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-wide text-slate-300">
            {getMediaTypeLabel(mediaType)}
          </span>

          <span
            className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${
              link.isMain
                ? "border-sky-300/25 bg-sky-500/15 text-sky-200"
                : "border-white/10 bg-slate-950/65 text-slate-400"
            }`}
          >
            {optionLabel}
          </span>

          {link.size && (
            <span className="rounded-full border border-white/10 bg-slate-950/65 px-2.5 py-1 text-[0.68rem] font-semibold text-slate-300">
              Size {link.size}
            </span>
          )}
        </div>
      </div>

      <ExternalLink
        href={link.url}
        destinationName="Telegram"
        aria-label={`Open ${mediaTitle}, ${groupLabel}, ${optionLabel} in Telegram`}
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 ${
          usesGridLayout ? "mt-auto w-full sm:w-auto sm:self-start" : ""
        }`}
      >
        <TelegramIcon className="h-4 w-4" />
        Open in Telegram
        <span aria-hidden="true">↗</span>
      </ExternalLink>
    </article>
  );
}

interface LinkGroupProps {
  group: ProviderLinkGroup;
  mediaTitle: string;
  mediaType: MediaType;
  layout: LinkGroupLayout;
  headingLabel?: string;
}

function LinkGroup({
  group,
  mediaTitle,
  mediaType,
  layout,
  headingLabel,
}: LinkGroupProps) {
  const usesGridLayout = layout === "grid";

  return (
    <section
      aria-labelledby={`provider-group-${group.id}`}
      className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          id={`provider-group-${group.id}`}
          className="text-lg font-bold text-white"
        >
          {headingLabel ?? group.label}
        </h3>

        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-semibold text-slate-400">
          {group.links.length} {group.links.length === 1 ? "link" : "links"}
        </span>
      </div>

      <div
        className={`mt-4 ${
          usesGridLayout ? "grid gap-3 md:grid-cols-2" : "space-y-3"
        }`}
      >
        {group.links.map((link, index) => {
          const alternativeNumber = link.isMain
            ? null
            : group.links
                .slice(0, index + 1)
                .filter((currentLink) => !currentLink.isMain).length;

          return (
            <LinkCard
              key={link.id}
              mediaTitle={mediaTitle}
              mediaType={mediaType}
              groupLabel={headingLabel ?? group.label}
              link={link}
              alternativeNumber={alternativeNumber}
              layout={layout}
            />
          );
        })}
      </div>
    </section>
  );
}

function ProviderLinksSection({
  data,
  mediaTitle,
  mediaType,
  isLoading = false,
  errorMessage = "",
  onRetry,
}: ProviderLinksSectionProps) {
  const groups = data?.groups ?? [];
  const isMovieLinks =
    data?.kind === "movie" || (!data && mediaType === "movie");
  const isSeriesLinks =
    data?.kind === "series" || (!data && mediaType === "tv");
  const linkGroupLayout: LinkGroupLayout = isSeriesLinks ? "grid" : "stacked";

  return (
    <section
      id="provider-links"
      aria-busy={isLoading}
      className="scroll-mt-24 py-10 sm:py-12"
    >
      <MediaDetailsContainer>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              FilmGeezer links
            </p>

            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Available on FilmGeezer
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              {isMovieLinks
                ? "Choose a resolution and start with the recommended Telegram link. File size appears when it is available."
                : "Start with the recommended Telegram link. If it is unavailable, try one of the alternatives."}
            </p>
          </header>

          {isLoading && (
            <div role="status" className="mt-6 grid gap-4 lg:grid-cols-2">
              <span className="sr-only">Loading FilmGeezer links</span>

              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 sm:p-5"
                >
                  <div className="skeleton-placeholder h-5 w-24 rounded-md" />

                  <div className="mt-4 space-y-3">
                    {Array.from({ length: 2 }).map((__, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                      >
                        <div className="skeleton-placeholder h-5 w-48 max-w-full rounded-md" />
                        <div className="mt-3 flex gap-2">
                          <div className="skeleton-placeholder h-6 w-20 rounded-full" />
                          <div className="skeleton-placeholder h-6 w-24 rounded-full" />
                        </div>
                        <div className="skeleton-placeholder mt-5 h-11 w-40 rounded-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && errorMessage && (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-5"
            >
              <h3 className="font-semibold text-white">
                FilmGeezer links could not be loaded
              </h3>

              <p className="mt-2 text-sm leading-6 text-red-100/80">
                {errorMessage}
              </p>

              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="mt-4 min-h-11 rounded-full bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
                >
                  Try again
                </button>
              )}
            </div>
          )}

          {!isLoading && !errorMessage && groups.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-900/55 p-5">
              <h3 className="font-semibold text-white">
                No FilmGeezer links yet
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                FilmGeezer links are not available for this title yet.
              </p>
            </div>
          )}

          {!isLoading && !errorMessage && groups.length > 0 && (
            <div
              className={`mt-6 grid gap-4 ${
                isMovieLinks && groups.length > 1 ? "lg:grid-cols-2" : ""
              }`}
            >
              {groups.map((group) => (
                <LinkGroup
                  key={group.id}
                  group={group}
                  mediaTitle={mediaTitle}
                  mediaType={mediaType}
                  layout={linkGroupLayout}
                  headingLabel={isSeriesLinks ? "Telegram links" : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </MediaDetailsContainer>
    </section>
  );
}

export default ProviderLinksSection;
