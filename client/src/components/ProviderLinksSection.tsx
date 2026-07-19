import type { ProviderLink } from '../types/providerLink'
import { getLanguageName } from '../utils/language'
import MediaDetailsContainer from './details/MediaDetailsContainer'

interface ProviderLinksSectionProps {
  links: ProviderLink[]
  isLoading?: boolean
  errorMessage?: string
  onRetry?: () => void
}

function getProviderLanguageLabel(
  language: string,
) {
  const trimmedLanguage =
    language.trim()

  return trimmedLanguage.length <= 3
    ? getLanguageName(
        trimmedLanguage,
      )
    : trimmedLanguage
}

function ProviderLinksSection({
  links,
  isLoading = false,
  errorMessage = '',
  onRetry,
}: ProviderLinksSectionProps) {
  return (
    <section
      id="provider-links"
      aria-busy={isLoading}
      className="scroll-mt-24 py-10 sm:py-12"
    >
      <MediaDetailsContainer>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                Watch options
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Available links
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Open an available quality option in a new tab. These links are currently development data and will later come from the FilmGeezer database.
              </p>
            </div>

            <span className="w-fit rounded-full border border-amber-300/15 bg-amber-300/10 px-3 py-1 text-xs font-semibold text-amber-200">
              Development links
            </span>
          </header>

          {isLoading && (
            <div
              role="status"
              className="mt-6 space-y-3"
            >
              <span className="sr-only">
                Loading available links
              </span>

              {Array.from({
                length: 2,
              }).map((_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="skeleton-placeholder h-4 w-44 max-w-full rounded-md" />

                    <div className="skeleton-placeholder h-3 w-32 rounded-md" />
                  </div>

                  <div className="skeleton-placeholder h-10 w-20 rounded-full" />
                </div>
              ))}
            </div>
          )}

          {!isLoading &&
            errorMessage && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-5"
              >
                <h3 className="font-semibold text-white">
                  Available links could not be loaded
                </h3>

                <p className="mt-2 text-sm leading-6 text-red-100/80">
                  {errorMessage}
                </p>

                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="mt-4 min-h-11 rounded-full bg-red-500 px-5 text-sm font-semibold text-white transition hover:bg-red-400"
                  >
                    Try links again
                  </button>
                )}
              </div>
            )}

          {!isLoading &&
            !errorMessage &&
            links.length === 0 && (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-900/55 p-5">
                <h3 className="font-semibold text-white">
                  No links are available yet
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  This title does not currently have an approved link in FilmGeezer.
                </p>
              </div>
            )}

          {!isLoading &&
            !errorMessage &&
            links.length > 0 && (
              <div className="mt-6 space-y-3">
                {links.map((link) => (
                  <article
                    key={link.linkId}
                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-sky-400/25 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-semibold text-white">
                          {link.label}
                        </h3>

                        <span className="rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-semibold text-sky-200">
                          {link.quality}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-slate-400">
                        {link.providerName}

                        <span aria-hidden="true">
                          {' '}•{' '}
                        </span>

                        {getProviderLanguageLabel(
                          link.language,
                        )}
                      </p>
                    </div>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open ${link.label} from ${link.providerName} in a new tab`}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-semibold text-white transition hover:bg-sky-400"
                    >
                      Open link

                      <span
                        aria-hidden="true"
                        className="ml-2"
                      >
                        ↗
                      </span>
                    </a>
                  </article>
                ))}
              </div>
            )}
        </div>
      </MediaDetailsContainer>
    </section>
  )
}

export default ProviderLinksSection