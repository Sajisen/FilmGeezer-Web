import { useState } from "react";
import { useSearchParams } from "react-router";
import {
  getLanguageLabel,
  getRatingLabel,
  languageOptions,
  ratingOptions,
  sanitizeGenres,
  supportsLanguageFilter,
} from "../config/searchFilters";
import ContentContainer from "../components/layout/ContentContainer";
import MediaCard from "../components/MediaCard";
import MediaCardSkeleton from "../components/skeletons/MediaCardSkeleton";
import EmptyState from "../components/states/EmptyState";
import ErrorState from "../components/states/ErrorState";
import SearchFilterPanel from "../components/search/SearchFilterPanel";
import SearchFilterSheet from "../components/search/SearchFilterSheet";
import SearchToolbar from "../components/search/SearchToolbar";
import { useSearchDiscovery } from "../hooks/useSearchDiscovery";
import { useSearchMedia } from "../hooks/useSearchMedia";
import type { SearchScope } from "../types/media";
import type {
  GenreMatchMode,
  SearchFilterValues,
} from "../types/search";

const emptyFilters: SearchFilterValues = {
  genres: [],
  genreMode: "all",
  language: "all",
  minRating: "all",
};

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

function getGenreMatchMode(value: string | null): GenreMatchMode {
  return value === "any" ? "any" : "all";
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
    filters.minRating !== "all"
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
    Number(supportsLanguageFilter(scope) && filters.language !== "all") +
    Number(filters.minRating !== "all")
  );
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
  committedFilters: SearchFilterValues;
  onCommit: (
    query: string,
    scope: SearchScope,
    filters: SearchFilterValues,
  ) => void;
}

function SearchPageContent({
  committedQuery,
  committedScope,
  committedFilters,
  onCommit,
}: SearchPageContentProps) {
  const [searchText, setSearchText] = useState(committedQuery);
  const [scope, setScope] = useState<SearchScope>(committedScope);
  const [filters, setFilters] =
    useState<SearchFilterValues>(committedFilters);
  const [areMobileFiltersOpen, setAreMobileFiltersOpen] = useState(false);

  const isCommittedSearchActive =
    committedQuery.length > 0 ||
    committedScope !== "all" ||
    hasActiveFilters(committedFilters);

  const search = useSearchMedia(
    committedQuery,
    committedScope,
    committedFilters,
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
    }));
  }

  function applyCurrentSearch(nextFilters = filters) {
    onCommit(searchText.trim(), scope, nextFilters);
    setAreMobileFiltersOpen(false);
  }

  function resetDraftFilters() {
    setFilters(emptyFilters);
  }

  function clearAllSearchCriteria() {
    onCommit("", "all", emptyFilters);
  }

  function removeCommittedScope() {
    onCommit(
      committedQuery,
      "all",
      {
        ...committedFilters,
        genres: sanitizeGenres("all", committedFilters.genres),
      },
    );
  }

  function removeCommittedGenre(genre: string) {
    onCommit(committedQuery, committedScope, {
      ...committedFilters,
      genres: committedFilters.genres.filter(
        (currentGenre) => currentGenre !== genre,
      ),
    });
  }

  function resetCommittedGenreMode() {
    onCommit(committedQuery, committedScope, {
      ...committedFilters,
      genreMode: "all",
    });
  }

  function removeCommittedLanguage() {
    onCommit(committedQuery, committedScope, {
      ...committedFilters,
      language: "all",
    });
  }

  function removeCommittedRating() {
    onCommit(committedQuery, committedScope, {
      ...committedFilters,
      minRating: "all",
    });
  }

  const activeChips: ActiveFilterChip[] = [
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
  ];

  const resultTitle = committedQuery
    ? `Results for “${committedQuery}”`
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
      <section className="border-b border-white/10 bg-slate-950 py-5 sm:py-7">
        <ContentContainer>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
                Search
              </p>

              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Find your next watch
              </h1>
            </div>

            <p className="max-w-xl text-sm leading-6 text-slate-400 sm:text-right">
              Search by title or explore the catalogue with category and genre
              filters.
            </p>
          </div>

          <div className="mt-5">
            <SearchToolbar
              searchText={searchText}
              scope={scope}
              activeFilterCount={activeFilterCount}
              canSubmit={canSubmit}
              autoFocus={
                !committedQuery &&
                !isCommittedSearchActive &&
                typeof window !== "undefined" &&
                Boolean(
                  window.matchMedia?.("(min-width: 1024px)").matches,
                )
              }
              onSearchTextChange={setSearchText}
              onScopeChange={handleScopeChange}
              onSubmit={() => applyCurrentSearch()}
              onOpenFilters={() => setAreMobileFiltersOpen(true)}
            />
          </div>

          {hasPendingSearchChanges && (
            <p className="mt-3 text-xs leading-5 text-amber-200/80">
              Search options have changed. Press Search or Apply filters to
              update the results.
            </p>
          )}

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
        </ContentContainer>
      </section>

      <section className="py-6 sm:py-8">
        <ContentContainer>
          <div className="grid min-w-0 gap-7 lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
            <aside className="hidden lg:block">
              <div className="sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-1 search-filter-scrollbar">
                <SearchFilterPanel
                  scope={scope}
                  filters={filters}
                  onFiltersChange={setFilters}
                  onApply={() => applyCurrentSearch()}
                  onReset={resetDraftFilters}
                  hasPendingChanges={!filtersEqual(filters, committedFilters)}
                />
              </div>
            </aside>

            <div className="min-w-0">
              <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {resultTitle}
                  </h2>

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

              <div aria-live="polite" className="sr-only">
                {isLoading ? "Loading titles" : resultDescription}
              </div>

              {isLoading && (
                <div
                  role="status"
                  className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4"
                >
                  <span className="sr-only">Loading titles</span>

                  {Array.from({ length: 12 }).map((_, index) => (
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
                      ? "Try another title, switch Match all to Match any, or use fewer filters."
                      : "Try again shortly to load a fresh selection."
                  }
                />
              )}

              {!isLoading && !errorMessage && items.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
                  {items.map((item) => (
                    <MediaCard
                      key={`${item.mediaType}-${item.tmdbId}`}
                      item={item}
                    />
                  ))}

                  {isCommittedSearchActive &&
                    search.isLoadingMore &&
                    Array.from({ length: 4 }).map((_, index) => (
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

  const requestedGenres = [
    ...searchParams.getAll("genres"),
    ...(searchParams.get("genre") ? [searchParams.get("genre")!] : []),
  ].map((genre) => genre.trim());

  const committedGenres = sanitizeGenres(
    committedScope,
    requestedGenres,
  );

  const committedLanguage = supportsLanguageFilter(committedScope)
    ? getLanguageFilter(searchParams.get("language"))
    : "all";

  const committedRating = getRatingFilter(searchParams.get("rating"));

  const committedFilters: SearchFilterValues = {
    genres: committedGenres,
    genreMode: getGenreMatchMode(searchParams.get("genreMode")),
    language: committedLanguage,
    minRating: committedRating,
  };

  function commitSearch(
    query: string,
    scope: SearchScope,
    filters: SearchFilterValues,
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

    setSearchParams(nextParams);
  }

  const pageKey = [
    committedQuery,
    committedScope,
    committedFilters.genres.join("|"),
    committedFilters.genreMode,
    committedFilters.language,
    committedFilters.minRating,
  ].join(":");

  return (
    <SearchPageContent
      key={pageKey}
      committedQuery={committedQuery}
      committedScope={committedScope}
      committedFilters={committedFilters}
      onCommit={commitSearch}
    />
  );
}

export default SearchPage;
