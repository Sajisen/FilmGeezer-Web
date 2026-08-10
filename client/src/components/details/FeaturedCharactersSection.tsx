import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import ExternalLink from "../../features/externalNavigation/ExternalLink";
import { useFeaturedCharacters } from "../../hooks/useFeaturedCharacters";
import type {
  FeaturedCharacter,
  FeaturedCharacterPresentation,
} from "../../types/featuredCharacter";
import type { MediaType } from "../../types/media";
import MediaDetailsContainer from "./MediaDetailsContainer";

interface FeaturedCharactersSectionProps {
  mediaType: MediaType;
  tmdbId: number;
  onAvailabilityChange?: (hasCharacters: boolean) => void;
}

interface CharacterArrowIconProps {
  direction: "left" | "right";
}

function CharacterArrowIcon({ direction }: CharacterArrowIconProps) {
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

function getPreferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

function getSectionDescription(presentation: FeaturedCharacterPresentation) {
  if (presentation === "anime") {
    return "Main and supporting characters from the Anime.";
  }

  if (presentation === "animation") {
    return "Important characters from the story.";
  }

  return "Leading and recurring characters, with performers shown as secondary context.";
}

function getCharacterInitials(characterName: string) {
  return characterName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((namePart) => namePart.charAt(0))
    .join("")
    .toUpperCase();
}

function CharacterCard({ character }: { character: FeaturedCharacter }) {
  const cardContent: ReactNode = (
    <>
      <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-sky-950 via-slate-900 to-blue-950">
        {character.imageUrl ? (
          <img
            src={character.imageUrl}
            alt={
              character.performerName
                ? `${character.performerName} as ${character.characterName}`
                : character.characterName
            }
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full items-center justify-center"
          >
            <span className="text-4xl font-black text-sky-300/70">
              {getCharacterInitials(character.characterName)}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 to-transparent" />

        {character.role !== "Featured" && (
          <span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-slate-950/80 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-sky-200 backdrop-blur-md">
            {character.role}
          </span>
        )}
      </div>

      <div className="min-h-28 p-3.5">
        <h3 className="line-clamp-2 text-sm font-bold leading-5 text-white">
          {character.characterName}
        </h3>

        {character.alternateName && (
          <p className="mt-1 line-clamp-1 text-xs text-slate-500">
            {character.alternateName}
          </p>
        )}

        {character.performerName && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">
            Played by{" "}
            <span className="font-semibold text-slate-300">
              {character.performerName}
            </span>
          </p>
        )}
      </div>
    </>
  );

  const cardClassName =
    "group block h-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 text-left transition hover:-translate-y-1 hover:border-sky-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300";

  if (character.sourceUrl) {
    return (
      <ExternalLink
        href={character.sourceUrl}
        destinationName="AniList"
        aria-label={`View ${character.characterName} on AniList`}
        className={cardClassName}
      >
        {cardContent}
      </ExternalLink>
    );
  }

  return <article className={cardClassName}>{cardContent}</article>;
}

function FeaturedCharactersSection({
  mediaType,
  tmdbId,
  onAvailabilityChange,
}: FeaturedCharactersSectionProps) {
  const railRef = useRef<HTMLDivElement>(null);

  const headingId = useId();
  const railId = useId();
  const instructionsId = useId();

  const [canScrollLeft, setCanScrollLeft] = useState(false);

  const [canScrollRight, setCanScrollRight] = useState(false);

  const { featuredCharacters, isLoading, errorMessage, retry } =
    useFeaturedCharacters(mediaType, tmdbId);

  const characterSignature =
    featuredCharacters?.items.map((character) => character.id).join("|") ?? "";

  const hasCharacters = Boolean(featuredCharacters?.items.length);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    onAvailabilityChange?.(!errorMessage && hasCharacters);
  }, [errorMessage, hasCharacters, isLoading, onAvailabilityChange]);

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
  }, [characterSignature, updateScrollState]);

  function scrollByPage(direction: "left" | "right") {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    rail.scrollBy({
      left:
        direction === "left" ? -rail.clientWidth * 0.8 : rail.clientWidth * 0.8,

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

  if (
    !isLoading &&
    !errorMessage &&
    (!featuredCharacters || featuredCharacters.items.length === 0)
  ) {
    return null;
  }

  return (
    <section
      id="featured-characters"
      aria-labelledby={headingId}
      className="scroll-mt-24 py-10 sm:py-12"
    >
      <MediaDetailsContainer>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 lg:p-8">
          <header>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Characters
            </p>

            <h2
              id={headingId}
              className="mt-2 text-2xl font-bold text-white sm:text-3xl"
            >
              Featured characters
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {featuredCharacters
                ? getSectionDescription(featuredCharacters.presentation)
                : "Loading the important characters from this title."}
            </p>
          </header>

          {isLoading && (
            <div
              role="status"
              className="mt-6 flex gap-3 overflow-hidden sm:gap-4"
            >
              <span className="sr-only">Loading featured characters</span>

              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  aria-hidden="true"
                  className="w-[146px] min-w-[146px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 sm:w-[164px] sm:min-w-[164px] lg:w-[176px] lg:min-w-[176px]"
                >
                  <div className="skeleton-placeholder aspect-[3/4]" />

                  <div className="space-y-2 p-3.5">
                    <div className="skeleton-placeholder h-4 w-full rounded-md" />

                    <div className="skeleton-placeholder h-3 w-3/4 rounded-md" />
                  </div>
                </div>
              ))}
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

          {!isLoading &&
            !errorMessage &&
            featuredCharacters &&
            featuredCharacters.items.length > 0 && (
              <>
                <p id={instructionsId} className="sr-only">
                  Use the left and right arrow keys to browse featured
                  characters when the row is focused.
                </p>

                <div className="relative mt-6">
                  <div
                    id={railId}
                    ref={railRef}
                    tabIndex={0}
                    role="group"
                    aria-label="Featured characters"
                    aria-describedby={instructionsId}
                    onScroll={updateScrollState}
                    onKeyDown={handleRailKeyDown}
                    className="media-row-scrollbar flex snap-x snap-proximity gap-3 overflow-x-auto overscroll-x-contain pb-2 pr-4 focus-visible:rounded-2xl sm:gap-4 sm:pr-6"
                  >
                    {featuredCharacters.items.map((character) => (
                      <div
                        key={character.id}
                        className="w-[146px] min-w-[146px] snap-start sm:w-[164px] sm:min-w-[164px] lg:w-[176px] lg:min-w-[176px]"
                      >
                        <CharacterCard character={character} />
                      </div>
                    ))}
                  </div>

                  {canScrollLeft && (
                    <button
                      type="button"
                      aria-label="Scroll featured characters left"
                      aria-controls={railId}
                      onClick={() => scrollByPage("left")}
                      className="media-row-desktop-control absolute left-1 top-1/2 z-20 h-16 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-slate-950/95 text-white backdrop-blur-md transition hover:border-sky-300/60 hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    >
                      <CharacterArrowIcon direction="left" />
                    </button>
                  )}

                  {canScrollRight && (
                    <button
                      type="button"
                      aria-label="Scroll featured characters right"
                      aria-controls={railId}
                      onClick={() => scrollByPage("right")}
                      className="media-row-desktop-control absolute right-1 top-1/2 z-20 h-16 w-10 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-slate-950/95 text-white backdrop-blur-md transition hover:border-sky-300/60 hover:bg-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                    >
                      <CharacterArrowIcon direction="right" />
                    </button>
                  )}
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  {featuredCharacters.source === "AniList"
                    ? "Character names and artwork from AniList."
                    : "Character information from TMDB."}
                </p>
              </>
            )}
        </div>
      </MediaDetailsContainer>
    </section>
  );
}

export default FeaturedCharactersSection;
