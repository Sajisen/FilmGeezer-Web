import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import {
  createDefaultSearchFilters,
  getFormatLabel,
  getLanguageLabel,
  getRatingLabel,
  getReleasePeriodLabel,
  getSortLabel,
  languageOptions,
  MAX_RELEASE_YEAR,
  MIN_RELEASE_YEAR,
  ratingOptions,
  sanitizeFormat,
  sanitizeGenres,
  sortOptions,
  supportsFormatFilter,
  supportsLanguageFilter,
} from "../config/searchFilters";
import ContentContainer from "../components/layout/ContentContainer";
import MediaCard from "../components/MediaCard";
import MediaCardSkeleton from "../components/skeletons/MediaCardSkeleton";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import SearchDesktopSidebar from "../components/search/SearchDesktopSidebar";
import SearchFilterSheet from "../components/search/SearchFilterSheet";
import SearchToolbar from "../components/search/SearchToolbar";
import { useSearchDiscovery } from "../hooks/useSearchDiscovery";
import { useSearchMedia } from "../hooks/useSearchMedia";
import type { SearchScope } from "../types/media";
import type {
  GenreMatchMode,
  SearchFilterValues,
  SearchFormat,
  SearchPreset,
  SearchSort,
} from "../types/search";


function getSearchScope(value: string | null): SearchScope {
  if (
    value === "movie" ||
    value === "tv" ||
    value === "anime" ||
    value === "k-drama"
  ) {
    return value;
  }

  return "all";
}


function getSearchFormat(value: string | null): SearchFormat {
  return value === "movie" || value === "tv" ? value : "all";
}

function getSearchSort(value: string | null): SearchSort {
  return sortOptions.some((option) => option.value === value)
    ? (value as SearchSort)
    : "best-match";
}

function getReleaseYear(value: string | null) {
  if (!value) {
    return null;
  }

  const year = Number(value);

  return Number.isInteger(year) &&
    year >= MIN_RELEASE_YEAR &&
    year <= MAX_RELEASE_YEAR
    ? year
    : null;
}

function getGenreMatchMode(value: string | null): GenreMatchMode {
  return value === "any" ? "any" : "all";
}

function getSearchPreset(value: string | null): SearchPreset {
  if (
    value === "trending" ||
    value === "essentials" ||
    value === "sports" ||
    value === "movie-drama" ||
    value === "movie-drama-romance" ||
    value === "tv-comedy-drama" ||
    value === "anime-romance-drama-comedy"
  ) {
    return value;
  }

  return "default";
}

function getPresetLabel(preset: SearchPreset) {
  if (preset === "trending") {
    return "Trending";
  }

  if (preset === "essentials") {
    return "FilmGeezer essentials";
  }

  if (preset === "sports") {
    return "Sports anime";
  }

  if (preset === "movie-drama" || preset === "movie-drama-romance") {
    return "Drama";
  }

  if (preset === "tv-comedy-drama") {
    return "Comedy & Drama";
  }

  if (preset === "anime-romance-drama-comedy") {
    return "Romance, Drama & Comedy";
  }

  return "";
}

function getPresetTitle(preset: SearchPreset, scope: SearchScope) {
  if (preset === "trending") {
    return scope === "all"
      ? "Trending titles"
      : `Trending ${getScopeLabel(scope)}`;
  }

  if (preset === "sports") {
    return "Sports Anime";
  }

  if (preset === "movie-drama" || preset === "movie-drama-romance") {
    return "Drama Movies";
  }

  if (preset === "tv-comedy-drama") {
    return "Comedy & Drama Series";
  }

  if (preset === "anime-romance-drama-comedy") {
    return "Romance, Drama & Comedy Anime";
  }

  if (preset === "essentials") {
    if (scope === "movie") {
      return "FilmGeezer Movie Essentials";
    }

    if (scope === "tv") {
      return "FilmGeezer TV Essentials";
    }

    if (scope === "anime") {
      return "FilmGeezer Anime Essentials";
    }

    if (scope === "k-drama") {
      return "FilmGeezer K-Drama Essentials";
    }

    return "FilmGeezer Essentials";
  }

  return "";
}

function getScopeLabel(scope: SearchScope) {
  if (scope === "movie") {
    return "Movies";
  }

  if (scope === "tv") {
    return "TV Series";
  }

  if (scope === "anime") {
    return "Anime";
  }

  if (scope === "k-drama") {
    return "K-Drama";
  }

  return "All titles";
}

function getLanguageFilter(value: string | null) {
  if (!value) {
    return "all";
  }

  return languageOptions.some((option) => option.value === value)
    ? value
    : "all";
}

function getRatingFilter(value: string | null) {
  if (!value) {
    return "all";
  }

  return ratingOptions.some((option) => option.value === value)
    ? value
    : "all";
}

function hasActiveFilters(filters: SearchFilterValues) {
  return (
    filters.genres.length > 0 ||
    filters.language !== "all" ||
    filters.minRating !== "all" ||
    filters.format !== "all" ||
    filters.releaseYearFrom !== null ||
    filters.releaseYearTo !== null ||
    filters.sortBy !== "best-match" ||
    filters.establishedOnly
  );
}

function filtersEqual(
  firstFilters: SearchFilterValues,
  secondFilters: SearchFilterValues,
) {
  return (
    firstFilters.genreMode === secondFilters.genreMode &&
    firstFilters.language === secondFilters.language &&
    firstFilters.minRating === secondFilters.minRating &&
    firstFilters.format === secondFilters.format &&
    firstFilters.releaseYearFrom === secondFilters.releaseYearFrom &&
    firstFilters.releaseYearTo === secondFilters.releaseYearTo &&
    firstFilters.sortBy === secondFilters.sortBy &&
    firstFilters.establishedOnly === secondFilters.establishedOnly &&
    firstFilters.genres.length === secondFilters.genres.length &&
    firstFilters.genres.every(
      (genre, index) => genre === secondFilters.genres[index],
    )
  );
}

function getActiveFilterCount(
  scope: SearchScope,
  filters: SearchFilterValues,
) {
  return (
    filters.genres.length +
    Number(supportsFormatFilter(scope) && filters.format !== "all") +
    Number(
      filters.releaseYearFrom !== null || filters.releaseYearTo !== null,
    ) +
    Number(supportsLanguageFilter(scope) && filters.language !== "all") +
    Number(filters.minRating !== "all") +
    Number(filters.sortBy !== "best-match") +
    Number(filters.establishedOnly)
  );
}

function getPreferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

interface ActiveFilterChip {
  key: string;
  label: string;
  removeLabel: string;
  onRemove: () => void;
}

interface SearchPageContentProps {
  committedQuery: string;
  committedScope: SearchScope;
  committedPreset: SearchPreset;
  committedFilters: SearchFilterValues;
  onCommit: (
    query: string,
    scope: SearchScope,
    filters: SearchFilterValues,
    preset?: SearchPreset,
  ) => void;
}

function SearchPageContent({
  committedQuery,
  committedScope,
  committedPreset,
  committedFilters,
  onCommit,
}: SearchPageContentProps) {
  const [searchText, setSearchText] = useState(committedQuery);
  const [scope, setScope] = useState<SearchScope>(committedScope);
  const [filters, setFilters] =
    useState<SearchFilterValues>(committedFilters);
  const [areMobileFiltersOpen, setAreMobileFiltersOpen] = useState(false);
  const location = useLocation();

  const shouldFocusSearchInput =
    typeof location.state === "object" &&
    location.state !== null &&
    "focusSearchInput" in location.state &&
    (location.state as { focusSearchInput?: unknown }).focusSearchInput === true;

  useEffect(() => {
    if (!shouldFocusSearchInput) {
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        const inputId = window.matchMedia("(min-width: 1024px)").matches
          ? "desktop-search-page-query"
          : "search-page-query";

        const input = document.getElementById(inputId);

        if (!(input instanceof HTMLInputElement)) {
          return;
        }

        input.focus({ preventScroll: true });

        const caretPosition = input.value.length;
        input.setSelectionRange(caretPosition, caretPosition);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [location.key, shouldFocusSearchInput]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: getPreferredScrollBehavior(),
    });
  }, []);

  const isCommittedSearchActive =
    committedQuery.length > 0 ||
    committedScope !== "all" ||
    committedPreset !== "default" ||
    hasActiveFilters(committedFilters);

  const search = useSearchMedia(
    committedQuery,
    committedScope,
    committedFilters,
    committedPreset,
  );
  const discovery = useSearchDiscovery(!isCommittedSearchActive);

  const activeFilterCount = getActiveFilterCount(scope, filters);
  const canSubmit =
    searchText.trim().length > 0 ||
    scope !== "all" ||
    hasActiveFilters(filters);

  const hasPendingSearchChanges =
    searchText.trim() !== committedQuery ||
    scope !== committedScope ||
    !filtersEqual(filters, committedFilters);

  const items = isCommittedSearchActive ? search.items : discovery.items;
  const isLoading = isCommittedSearchActive
    ? search.isLoading
    : discovery.isLoading;
  const errorMessage = isCommittedSearchActive
    ? search.errorMessage
    : discovery.errorMessage;

  function handleScopeChange(nextScope: SearchScope) {
    setScope(nextScope);
    setFilters((currentFilters) => ({
      ...currentFilters,
      genres: sanitizeGenres(nextScope, currentFilters.genres),
      language: supportsLanguageFilter(nextScope)
        ? currentFilters.language
        : "all",
      format: sanitizeFormat(
        nextScope,
        scope === "movie" || scope === "tv" ? "all" : currentFilters.format,
      ),
    }));
  }

  function applyCurrentSearch(nextFilters = filters) {
    onCommit(searchText.trim(), scope, nextFilters, "default");
    setAreMobileFiltersOpen(false);
  }

  function resetDraftFilters() {
    setFilters(createDefaultSearchFilters(scope));
  }

  function clearAllSearchCriteria() {
    onCommit("", "all", createDefaultSearchFilters("all"), "default");
  }

  function removeCommittedScope() {
    onCommit(
      committedQuery,
      "all",
      {
        ...committedFilters,
        genres: sanitizeGenres("all", committedFilters.genres),
        format:
          committedScope === "movie" || committedScope === "tv"
            ? "all"
            : committedFilters.format,
      },
      committedPreset,
    );
  }

  function removeCommittedGenre(genre: string) {
    const nextGenres = committedFilters.genres.filter(
      (currentGenre) => currentGenre !== genre,
    );

    onCommit(
      committedQuery,
      committedScope,
      {
        ...committedFilters,
        genres: nextGenres,
        genreMode: nextGenres.length > 1 ? committedFilters.genreMode : "all",
      },
      committedPreset,
    );
  }

  function resetCommittedGenreMode() {
    onCommit(
      committedQuery,
      committedScope,
      {
        ...committedFilters,
        genreMode: "all",
      },
      committedPreset,
    );
  }

  function removeCommittedLanguage() {
    onCommit(
      committedQuery,
      committedScope,
      {
        ...committedFilters,
        language: "all",
      },
      committedPreset,
    );
  }

  function removeCommittedRating() {
    onCommit(
      committedQuery,
      committedScope,
      {
        ...committedFilters,
        minRating: "all",
      },
      committedPreset,
    );
  }

  function removeCommittedFormat() {
    onCommit(
      committedQuery,
      committedScope,
      {
        ...committedFilters,
        format: sanitizeFormat(committedScope, "all"),
      },
      committedPreset,
    );
  }

  function removeCommittedReleasePeriod() {
    onCommit(
      committedQuery,
      committedScope,
      {
        ...committedFilters,
        releaseYearFrom: null,
        releaseYearTo: null,
      },
      committedPreset,
    );
  }

  function removeCommittedSort() {
    onCommit(
      committedQuery,
      committedScope,
      {
        ...committedFilters,
        sortBy: "best-match",
      },
      committedPreset,
    );
  }

  function removeCommittedEstablishedOnly() {
    onCommit(
      committedQuery,
      committedScope,
      {
        ...committedFilters,
        establishedOnly: false,
      },
      committedPreset,
    );
  }

  function removeCommittedPreset() {
    onCommit(
      committedQuery,
      committedScope,
      committedFilters,
      "default",
    );
  }

  const activeChips: ActiveFilterChip[] = [
    ...(committedPreset !== "default"
      ? [
          {
            key: "preset",
            label: getPresetLabel(committedPreset),
            removeLabel: `Remove ${getPresetLabel(committedPreset)} collection`,
            onRemove: removeCommittedPreset,
          },
        ]
      : []),
    ...(committedScope !== "all"
      ? [
          {
            key: "scope",
            label: getScopeLabel(committedScope),
            removeLabel: `Remove ${getScopeLabel(committedScope)} category`,
            onRemove: removeCommittedScope,
          },
        ]
      : []),
    ...committedFilters.genres.map((genre) => ({
      key: `genre:${genre}`,
      label: genre,
      removeLabel: `Remove ${genre} genre`,
      onRemove: () => removeCommittedGenre(genre),
    })),
    ...(committedFilters.genres.length > 1 &&
    committedFilters.genreMode === "any"
      ? [
          {
            key: "genre-mode",
            label: "Match any genre",
            removeLabel: "Change genre matching to Match all",
            onRemove: resetCommittedGenreMode,
          },
        ]
      : []),
    ...(supportsFormatFilter(committedScope) &&
    committedFilters.format !== "all"
      ? [
          {
            key: "format",
            label: getFormatLabel(committedFilters.format),
            removeLabel: `Remove ${getFormatLabel(committedFilters.format)} format`,
            onRemove: removeCommittedFormat,
          },
        ]
      : []),
    ...(committedFilters.releaseYearFrom !== null ||
    committedFilters.releaseYearTo !== null
      ? [
          {
            key: "release-period",
            label: getReleasePeriodLabel(
              committedFilters.releaseYearFrom,
              committedFilters.releaseYearTo,
            ),
            removeLabel: "Remove release period filter",
            onRemove: removeCommittedReleasePeriod,
          },
        ]
      : []),
    ...(supportsLanguageFilter(committedScope) &&
    committedFilters.language !== "all"
      ? [
          {
            key: "language",
            label: getLanguageLabel(committedFilters.language),
            removeLabel: `Remove ${getLanguageLabel(
              committedFilters.language,
            )} language filter`,
            onRemove: removeCommittedLanguage,
          },
        ]
      : []),
    ...(committedFilters.minRating !== "all"
      ? [
          {
            key: "rating",
            label: getRatingLabel(committedFilters.minRating),
            removeLabel: `Remove ${getRatingLabel(
              committedFilters.minRating,
            )} filter`,
            onRemove: removeCommittedRating,
          },
        ]
      : []),
    ...(committedFilters.sortBy !== "best-match"
      ? [
          {
            key: "sort",
            label: getSortLabel(committedFilters.sortBy),
            removeLabel: `Remove ${getSortLabel(committedFilters.sortBy)} sorting`,
            onRemove: removeCommittedSort,
          },
        ]
      : []),
    ...(committedFilters.establishedOnly
      ? [
          {
            key: "established",
            label: "Established titles",
            removeLabel: "Show titles with any audience vote count",
            onRemove: removeCommittedEstablishedOnly,
          },
        ]
      : []),
  ];

  const resultTitle = committedQuery
    ? `Results for “${committedQuery}”`
    : committedPreset !== "default"
      ? getPresetTitle(committedPreset, committedScope)
      : isCommittedSearchActive
        ? committedScope === "all"
          ? "Filtered discoveries"
          : `Explore ${getScopeLabel(committedScope)}`
        : "Discover something new";

  const resultDescription = isCommittedSearchActive
    ? `${search.items.length} title${search.items.length === 1 ? "" : "s"} loaded${
        search.hasMore ? " · More available" : ""
      }`
    : "A fresh mix of trending Movies, TV Series, Anime, and K-Drama.";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="py-5 sm:py-7">
        <ContentContainer>
          <div className="grid min-w-0 gap-7 lg:grid-cols-[21.5rem_minmax(0,1fr)] lg:items-start xl:gap-9">
            <SearchDesktopSidebar
              searchText={searchText}
              scope={scope}
              filters={filters}
              hasPendingChanges={hasPendingSearchChanges}
              onSearchTextChange={setSearchText}
              onScopeChange={handleScopeChange}
              onFiltersChange={setFilters}
              onApply={() => applyCurrentSearch()}
              onResetFilters={resetDraftFilters}
            />

            <div className="min-w-0">
              <header className="mb-5 lg:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
                  Search
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                  Find your next watch
                </p>

                <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
                  Search by title or explore the catalogue using focused filters.
                </p>
              </header>

              <SearchToolbar
                searchText={searchText}
                scope={scope}
                activeFilterCount={activeFilterCount}
                canSubmit={canSubmit}
                onSearchTextChange={setSearchText}
                onScopeChange={handleScopeChange}
                onSubmit={() => applyCurrentSearch()}
                onOpenFilters={() => setAreMobileFiltersOpen(true)}
              />

              {hasPendingSearchChanges && (
                <p
                  role="status"
                  className="mt-3 text-xs font-medium leading-5 text-amber-300 lg:hidden"
                >
                  Search options changed. Apply them to refresh the results.
                </p>
              )}

              <div className="mt-7 lg:mt-0">
                <header className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                      Search results
                    </p>

                    <h1 className="mt-2 text-2xl font-bold text-white lg:text-3xl">
                      {resultTitle}
                    </h1>

                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {resultDescription}
                    </p>
                  </div>

                  {isCommittedSearchActive && (
                    <button
                      type="button"
                      onClick={clearAllSearchCriteria}
                      className="w-fit text-sm font-semibold text-sky-300 transition hover:text-sky-200"
                    >
                      Reset search
                    </button>
                  )}
                </header>

                {activeChips.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="mr-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Applied
                    </span>

                    {activeChips.map((chip) => (
                      <button
                        key={chip.key}
                        type="button"
                        aria-label={chip.removeLabel}
                        title={chip.removeLabel}
                        onClick={chip.onRemove}
                        className="group inline-flex min-h-9 items-center gap-2 rounded-full border border-sky-400/20 bg-sky-500/10 py-1 pl-3 pr-1.5 text-xs font-semibold text-sky-100 transition hover:border-red-300/30 hover:bg-red-400/10 hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      >
                        <span>{chip.label}</span>
                        <span
                          aria-hidden="true"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.06] text-sm text-slate-300 transition group-hover:bg-red-300/15 group-hover:text-red-100"
                        >
                          ×
                        </span>
                      </button>
                    ))}

                    {activeChips.length > 1 && (
                      <button
                        type="button"
                        onClick={clearAllSearchCriteria}
                        className="min-h-9 rounded-full px-3 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-6">
                <div aria-live="polite" className="sr-only">
                  {isLoading ? "Loading titles" : resultDescription}
                </div>

                {isLoading && (
                  <div role="status" className="search-results-grid">
                    <span className="sr-only">Loading titles</span>
                    {Array.from({ length: 18 }).map((_, index) => (
                      <MediaCardSkeleton key={index} />
                    ))}
                  </div>
                )}

                {!isLoading && errorMessage && (
                  <ErrorState
                    message={errorMessage}
                    onRetry={
                      isCommittedSearchActive ? search.reload : discovery.reload
                    }
                  />
                )}

                {!isLoading && !errorMessage && items.length === 0 && (
                  <EmptyState
                    title={
                      isCommittedSearchActive
                        ? "No matching titles"
                        : "No discovery titles available"
                    }
                    message={
                      isCommittedSearchActive
                        ? search.hasMore
                          ? "No matches were found in the current catalogue slice. Load more titles or loosen one of the filters."
                          : "Try another title, switch Match all to Match any, or use fewer filters."
                        : "Try again shortly to load a fresh selection."
                    }
                  />
                )}

                {!isLoading && !errorMessage && items.length > 0 && (
                  <div className="search-results-grid">
                    {items.map((item) => (
                      <MediaCard
                        key={`${item.mediaType}-${item.tmdbId}`}
                        item={item}
                      />
                    ))}

                    {isCommittedSearchActive &&
                      search.isLoadingMore &&
                      Array.from({ length: 6 }).map((_, index) => (
                        <MediaCardSkeleton key={`loading-more-${index}`} />
                      ))}
                  </div>
                )}

                {isCommittedSearchActive &&
                  !isLoading &&
                  !errorMessage &&
                  search.loadMoreErrorMessage && (
                    <p
                      role="alert"
                      className="mt-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
                    >
                      {search.loadMoreErrorMessage}
                    </p>
                  )}

                {isCommittedSearchActive &&
                  !isLoading &&
                  !errorMessage &&
                  search.hasMore && (
                    <div className="mt-8 flex justify-center">
                      <button
                        type="button"
                        onClick={search.loadMore}
                        disabled={search.isLoadingMore}
                        className="min-h-12 rounded-full border border-sky-300/25 bg-sky-500/10 px-7 py-3 font-semibold text-sky-100 transition hover:border-sky-300/45 hover:bg-sky-500/15 disabled:cursor-wait disabled:opacity-60"
                      >
                        {search.isLoadingMore
                          ? "Loading more titles..."
                          : "Show more titles"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ContentContainer>
      </section>

      {areMobileFiltersOpen && (
        <SearchFilterSheet
          scope={scope}
          initialFilters={filters}
          onApply={(nextFilters) => {
            setFilters(nextFilters);
            applyCurrentSearch(nextFilters);
          }}
          onClose={() => setAreMobileFiltersOpen(false)}
        />
      )}
    </main>
  );
}

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const committedQuery = (searchParams.get("q") ?? "").trim();
  const committedScope = getSearchScope(searchParams.get("scope"));
  const committedPreset = getSearchPreset(searchParams.get("preset"));

  const requestedGenres = [
    ...searchParams.getAll("genres"),
    ...(searchParams.get("genre") ? [searchParams.get("genre")!] : []),
  ].map((genre) => genre.trim());

  const committedGenres = sanitizeGenres(committedScope, requestedGenres);

  const committedLanguage = supportsLanguageFilter(committedScope)
    ? getLanguageFilter(searchParams.get("language"))
    : "all";

  const committedRating = getRatingFilter(searchParams.get("rating"));
  const requestedFormat = getSearchFormat(searchParams.get("format"));
  const committedFormat = sanitizeFormat(committedScope, requestedFormat);
  const requestedFromYear = getReleaseYear(searchParams.get("fromYear"));
  const requestedToYear = getReleaseYear(searchParams.get("toYear"));
  const committedFromYear =
    requestedFromYear !== null &&
    requestedToYear !== null &&
    requestedFromYear > requestedToYear
      ? requestedToYear
      : requestedFromYear;
  const committedToYear =
    requestedFromYear !== null &&
    requestedToYear !== null &&
    requestedFromYear > requestedToYear
      ? requestedFromYear
      : requestedToYear;

  const committedFilters: SearchFilterValues = {
    genres: committedGenres,
    genreMode: getGenreMatchMode(searchParams.get("genreMode")),
    language: committedLanguage,
    minRating: committedRating,
    format: committedFormat,
    releaseYearFrom: committedFromYear,
    releaseYearTo: committedToYear,
    sortBy: getSearchSort(searchParams.get("sort")),
    establishedOnly: searchParams.get("established") === "true",
  };

  function commitSearch(
    query: string,
    scope: SearchScope,
    filters: SearchFilterValues,
    preset: SearchPreset = "default",
  ) {
    const trimmedQuery = query.trim();
    const sanitizedGenres = sanitizeGenres(scope, filters.genres);
    const nextParams = new URLSearchParams();

    if (trimmedQuery) {
      nextParams.set("q", trimmedQuery);
    }

    if (scope !== "all") {
      nextParams.set("scope", scope);
    }

    sanitizedGenres.forEach((genre) => {
      nextParams.append("genres", genre);
    });

    if (sanitizedGenres.length > 1 && filters.genreMode === "any") {
      nextParams.set("genreMode", "any");
    }

    if (supportsLanguageFilter(scope) && filters.language !== "all") {
      nextParams.set("language", filters.language);
    }

    if (filters.minRating !== "all") {
      nextParams.set("rating", filters.minRating);
    }

    const sanitizedFormat = sanitizeFormat(scope, filters.format);

    if (supportsFormatFilter(scope) && sanitizedFormat !== "all") {
      nextParams.set("format", sanitizedFormat);
    }

    if (filters.releaseYearFrom !== null) {
      nextParams.set("fromYear", String(filters.releaseYearFrom));
    }

    if (filters.releaseYearTo !== null) {
      nextParams.set("toYear", String(filters.releaseYearTo));
    }

    if (filters.sortBy !== "best-match") {
      nextParams.set("sort", filters.sortBy);
    }

    if (filters.establishedOnly) {
      nextParams.set("established", "true");
    }

    if (!trimmedQuery && preset !== "default") {
      nextParams.set("preset", preset);
    }

    setSearchParams(nextParams);
  }

  const pageKey = [
    committedQuery,
    committedScope,
    committedPreset,
    committedFilters.genres.join("|"),
    committedFilters.genreMode,
    committedFilters.language,
    committedFilters.minRating,
    committedFilters.format,
    committedFilters.releaseYearFrom ?? "",
    committedFilters.releaseYearTo ?? "",
    committedFilters.sortBy,
    committedFilters.establishedOnly ? "1" : "0",
  ].join(":");

  return (
    <SearchPageContent
      key={pageKey}
      committedQuery={committedQuery}
      committedScope={committedScope}
      committedPreset={committedPreset}
      committedFilters={committedFilters}
      onCommit={commitSearch}
    />
  );
}

export default SearchPage;
