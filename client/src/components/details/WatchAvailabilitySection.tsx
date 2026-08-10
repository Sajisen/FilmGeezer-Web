import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useWatchAvailability } from "../../hooks/useWatchAvailability";
import type { MediaType } from "../../types/media";
import type {
  WatchAvailability,
  WatchProviderItem,
} from "../../types/watchAvailability";
import MediaDetailsContainer from "./MediaDetailsContainer";

interface WatchAvailabilitySectionProps {
  mediaType: MediaType;
  tmdbId: number;
}

type AvailabilityType = "Stream" | "Rent" | "Buy";

interface CombinedProvider extends WatchProviderItem {
  availabilityTypes: AvailabilityType[];
  order: number;
}

interface ProviderRailArrowIconProps {
  direction: "left" | "right";
}

function ProviderRailArrowIcon({ direction }: ProviderRailArrowIconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none">
      <path
        d={direction === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const REGION_STORAGE_KEY = "filmgeezer-watch-region";

const regionOptions = [
  {
    value: "US",
    label: "United States",
  },
  {
    value: "GB",
    label: "United Kingdom",
  },
  {
    value: "IN",
    label: "India",
  },
  {
    value: "AU",
    label: "Australia",
  },
  {
    value: "CA",
    label: "Canada",
  },
  {
    value: "JP",
    label: "Japan",
  },
  {
    value: "KR",
    label: "South Korea",
  },
];

function getInitialRegion() {
  const storedRegion = window.localStorage.getItem(REGION_STORAGE_KEY);

  if (regionOptions.some((option) => option.value === storedRegion)) {
    return storedRegion as string;
  }

  try {
    const browserRegion = new Intl.Locale(navigator.language).region;

    if (
      browserRegion &&
      regionOptions.some((option) => option.value === browserRegion)
    ) {
      return browserRegion;
    }
  } catch {
    // Use the project default below.
  }

  return "US";
}

function normalizeProviderName(providerName: string) {
  return providerName.trim().toLocaleLowerCase();
}

function combineProviders(availability: WatchAvailability | null) {
  if (!availability) {
    return [];
  }

  const providerMap = new Map<string, CombinedProvider>();

  let nextOrder = 0;

  function addProviderGroup(
    providers: WatchProviderItem[],
    availabilityType: AvailabilityType,
  ) {
    for (const provider of providers) {
      const providerKey = normalizeProviderName(provider.name);

      const existingProvider = providerMap.get(providerKey);

      if (existingProvider) {
        if (!existingProvider.availabilityTypes.includes(availabilityType)) {
          existingProvider.availabilityTypes.push(availabilityType);
        }

        if (!existingProvider.logoUrl && provider.logoUrl) {
          existingProvider.logoUrl = provider.logoUrl;
        }

        continue;
      }

      providerMap.set(providerKey, {
        ...provider,

        availabilityTypes: [availabilityType],

        order: nextOrder,
      });

      nextOrder += 1;
    }
  }

  /*
   * Stream providers appear first,
   * followed by providers that are
   * available only for Rent or Buy.
   */
  addProviderGroup(availability.stream, "Stream");

  addProviderGroup(availability.rent, "Rent");

  addProviderGroup(availability.buy, "Buy");

  return [...providerMap.values()].sort(
    (firstProvider, secondProvider) =>
      firstProvider.order - secondProvider.order,
  );
}

function getPreferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function WatchAvailabilitySection({
  mediaType,
  tmdbId,
}: WatchAvailabilitySectionProps) {
  const railRef = useRef<HTMLDivElement>(null);

  const railId = useId();
  const instructionsId = useId();

  const [region, setRegion] = useState(getInitialRegion);

  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const [canScrollRight, setCanScrollRight] = useState(false);

  const { availability, isLoading, errorMessage, retry } = useWatchAvailability(
    mediaType,
    tmdbId,
    region,
  );

  const combinedProviders = combineProviders(availability);

  const selectedRegionLabel =
    regionOptions.find((option) => option.value === region)?.label ?? region;

  const providerSignature = combinedProviders
    .map(
      (provider) =>
        `${provider.providerId}:` + provider.availabilityTypes.join(","),
    )
    .join("|");

  useEffect(() => {
    window.localStorage.setItem(REGION_STORAGE_KEY, region);
  }, [region]);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const threshold = 4;

    const maximumScrollLeft = rail.scrollWidth - rail.clientWidth;

    setCanScrollLeft(rail.scrollLeft > threshold);

    setCanScrollRight(maximumScrollLeft - rail.scrollLeft > threshold);
  }, []);

  useEffect(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    updateScrollState();

    const resizeObserver = new ResizeObserver(updateScrollState);

    resizeObserver.observe(rail);

    return () => {
      resizeObserver.disconnect();
    };
  }, [providerSignature, updateScrollState]);

  function scrollByPage(direction: "left" | "right") {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      left:
        direction === "left"
          ? -rail.clientWidth * 0.75
          : rail.clientWidth * 0.75,

      behavior: getPreferredScrollBehavior(),
    });
  }

  function scrollToBoundary(boundary: "start" | "end") {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    rail.scrollTo({
      left: boundary === "start" ? 0 : rail.scrollWidth,

      behavior: getPreferredScrollBehavior(),
    });
  }

  function handleRailKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByPage("left");
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByPage("right");
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      scrollToBoundary("start");
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      scrollToBoundary("end");
    }
  }

  return (
    <section id="official-availability" className="scroll-mt-24 py-10 sm:py-12">
      <MediaDetailsContainer>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
                Official providers
              </p>

              <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                Where to stream, rent, or buy
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Official streaming, rental, and purchase options can vary by
                region and may change over time.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-end lg:w-auto">
              <label className="w-full sm:w-52">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Region
                </span>

                <select
                  value={region}
                  onChange={(event) => setRegion(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-sky-400/60"
                >
                  {regionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {!isLoading && !errorMessage && combinedProviders.length > 0 && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Scroll official providers left"
                    aria-controls={railId}
                    disabled={!canScrollLeft}
                    onClick={() => scrollByPage("left")}
                    className="media-row-desktop-control h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-slate-950/80 text-white transition hover:border-sky-300/60 hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-default disabled:border-white/5 disabled:bg-slate-950/35 disabled:text-slate-700"
                  >
                    <ProviderRailArrowIcon direction="left" />
                  </button>

                  <button
                    type="button"
                    aria-label="Scroll official providers right"
                    aria-controls={railId}
                    disabled={!canScrollRight}
                    onClick={() => scrollByPage("right")}
                    className="media-row-desktop-control h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-slate-950/80 text-white transition hover:border-sky-300/60 hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-default disabled:border-white/5 disabled:bg-slate-950/35 disabled:text-slate-700"
                  >
                    <ProviderRailArrowIcon direction="right" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {isLoading && (
            <div role="status" className="mt-6">
              <span className="sr-only">Loading official availability</span>

              <div className="flex gap-3 overflow-hidden">
                {Array.from({
                  length: 5,
                }).map((_, index) => (
                  <div
                    key={index}
                    aria-hidden="true"
                    className="flex min-h-24 w-[172px] min-w-[172px] items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-3 sm:w-[190px] sm:min-w-[190px]"
                  >
                    <div className="skeleton-placeholder h-11 w-11 shrink-0 rounded-xl" />

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="skeleton-placeholder h-4 w-full rounded-md" />

                      <div className="skeleton-placeholder h-3 w-3/4 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && errorMessage && (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 p-4"
            >
              <p className="text-sm text-red-100">{errorMessage}</p>

              <button
                type="button"
                onClick={retry}
                className="mt-3 text-sm font-semibold text-red-100 underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {!isLoading && !errorMessage && combinedProviders.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 p-4">
              <h3 className="font-semibold text-white">
                No official options found
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                We could not find streaming, rental, or purchase options for
                this title in {selectedRegionLabel}. Try another region or
                check again later.
              </p>
            </div>
          )}

          {!isLoading && !errorMessage && combinedProviders.length > 0 && (
            <>
              <p id={instructionsId} className="sr-only">
                Use the left and right arrow keys to browse official providers
                when the row is focused.
              </p>

              <div className="mt-6">
                <div
                  id={railId}
                  ref={railRef}
                  tabIndex={0}
                  role="group"
                  aria-label="Official watch providers"
                  aria-describedby={instructionsId}
                  onScroll={updateScrollState}
                  onKeyDown={handleRailKeyDown}
                  className="media-row-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain pb-2 pr-4 focus-visible:rounded-2xl sm:gap-4 sm:pr-6"
                >
                  {combinedProviders.map((provider) => (
                    <article
                      key={`${provider.providerId}-${provider.name}`}
                      className="flex min-h-[5.75rem] w-[176px] min-w-[176px] snap-start items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/55 p-3 transition hover:-translate-y-0.5 hover:border-sky-400/25 sm:w-[192px] sm:min-w-[192px] lg:w-[208px] lg:min-w-[208px]"
                    >
                      {provider.logoUrl ? (
                        <img
                          src={provider.logoUrl}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-11 w-11 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sm font-bold text-sky-200">
                          {provider.name.charAt(0)}
                        </span>
                      )}

                      <div className="flex min-w-0 flex-1 flex-col justify-center">
                        <div className="flex min-h-10 items-center">
                          <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-white">
                            {provider.name}
                          </h4>
                        </div>

                        <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-1">
                          {provider.availabilityTypes.map(
                            (availabilityType) => (
                              <span
                                key={availabilityType}
                                className="rounded-full border border-sky-300/15 bg-sky-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-sky-200"
                              >
                                {availabilityType}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                <p>Provider information supplied by JustWatch.</p>

                {availability?.link && (
                  <a
                    href={availability.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-sky-300 transition hover:text-sky-200"
                  >
                    View availability details ↗
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </MediaDetailsContainer>
    </section>
  );
}

export default WatchAvailabilitySection;