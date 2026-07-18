import { useSearchParams } from "react-router";
import {
  getLanguageLabel,
  isGenreAllowed,
  languageOptions,
  ratingOptions,
  supportsLanguageFilter,
} from "../config/searchFilters";
import ContentContainer from "../components/layout/ContentContainer";
import MediaGrid from "../components/MediaGrid";
import SearchToolbar from "../components/search/SearchToolbar";
import { useSearchMedia } from "../hooks/useSearchMedia";
import type { SearchScope } from "../types/media";
import type { SearchFilterValues } from "../types/search";

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

  return "Movies and TV Series";
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

  return ratingOptions.some((option) => option.value === value) ? value : "all";
}

function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const trimmedQuery = query.trim();

  const scope = getSearchScope(searchParams.get("scope"));

  const requestedGenre = searchParams.get("genre")?.trim() || "all";

  const genre = isGenreAllowed(scope, requestedGenre) ? requestedGenre : "all";

  const language = supportsLanguageFilter(scope)
    ? getLanguageFilter(searchParams.get("language"))
    : "all";

  const minRating = getRatingFilter(searchParams.get("rating"));

  const filters: SearchFilterValues = {
    genre,
    language,
    minRating,
  };

  const search = useSearchMedia(trimmedQuery, scope, filters);

  const scopeLabel = getScopeLabel(scope);

  const activeFilterLabels = [
    genre !== "all" ? genre : null,

    language !== "all" ? getLanguageLabel(language) : null,

    minRating !== "all" ? `Rating ${minRating}+` : null,
  ].filter((label): label is string => Boolean(label));

  function submitSearch(
    nextQuery: string,
    nextScope: SearchScope,
    nextFilters: SearchFilterValues,
  ) {
    const nextParams = new URLSearchParams({
      q: nextQuery,
    });

    if (nextScope !== "all") {
      nextParams.set("scope", nextScope);
    }

    if (nextFilters.genre !== "all") {
      nextParams.set("genre", nextFilters.genre);
    }

    if (nextFilters.language !== "all") {
      nextParams.set("language", nextFilters.language);
    }

    if (nextFilters.minRating !== "all") {
      nextParams.set("rating", nextFilters.minRating);
    }

    setSearchParams(nextParams);
  }

  const loadedDescription = trimmedQuery
    ? `${search.items.length} title${
        search.items.length === 1 ? "" : "s"
      } loaded · ${scopeLabel}${
        activeFilterLabels.length > 0
          ? ` · ${activeFilterLabels.join(" · ")}`
          : ""
      }`
    : "Enter a title to search Movies and TV series.";

  const toolbarKey = [trimmedQuery, scope, genre, language, minRating].join(
    ":",
  );

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="border-b border-white/10 bg-slate-950 py-12 sm:py-16">
        <ContentContainer>
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-300">
              Search Results
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Find movies, TV series, Anime, and K-Dramas
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-slate-400">
              Search across FilmGeezer, then narrow the results by category,
              genre, original language where available, and rating.
            </p>
          </div>

          <div className="mt-8">
            <SearchToolbar
              key={toolbarKey}
              initialQuery={trimmedQuery}
              initialScope={scope}
              initialFilters={filters}
              onSubmit={submitSearch}
            />
          </div>
        </ContentContainer>
      </section>

      <div aria-live="polite" className="sr-only">
        {search.isLoading ? `Searching for ${trimmedQuery}` : loadedDescription}
      </div>

      <MediaGrid
        title={
          trimmedQuery ? `Results for “${trimmedQuery}”` : "Search FilmGeezer"
        }
        description={loadedDescription}
        items={search.items}
        emptyMessage={
          trimmedQuery
            ? `No ${scopeLabel.toLowerCase()} matched “${trimmedQuery}” with the selected filters.`
            : "Enter a title to begin searching."
        }
        isLoading={search.isLoading}
        isLoadingMore={search.isLoadingMore}
        errorMessage={search.errorMessage}
        loadMoreErrorMessage={search.loadMoreErrorMessage}
        onRetry={search.reload}
        hasMore={search.hasMore}
        onLoadMore={search.loadMore}
        loadMoreLabel="Load More Results"
      />
    </main>
  );
}

export default SearchPage;
