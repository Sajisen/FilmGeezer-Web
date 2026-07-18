import { useId, useState, type FormEvent } from "react";
import {
  getGenreOptions,
  getLanguageLabel,
  languageOptions,
  ratingOptions,
  supportsLanguageFilter,
} from "../../config/searchFilters";
import type { SearchScope } from "../../types/media";
import type { SearchFilterValues } from "../../types/search";

interface SearchToolbarProps {
  initialQuery: string;
  initialScope: SearchScope;
  initialFilters: SearchFilterValues;
  onSubmit: (
    query: string,
    scope: SearchScope,
    filters: SearchFilterValues,
  ) => void;
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

function SearchToolbar({
  initialQuery,
  initialScope,
  initialFilters,
  onSubmit,
}: SearchToolbarProps) {
  const [searchText, setSearchText] = useState(initialQuery);

  const [scope, setScope] = useState<SearchScope>(initialScope);

  const [genre, setGenre] = useState(initialFilters.genre);

  const [language, setLanguage] = useState(initialFilters.language);

  const [minRating, setMinRating] = useState(initialFilters.minRating);

  const [areFiltersOpen, setAreFiltersOpen] = useState(
    initialFilters.genre !== "all" ||
      initialFilters.language !== "all" ||
      initialFilters.minRating !== "all",
  );

  const searchInputId = useId();
  const scopeId = useId();
  const genreId = useId();
  const languageId = useId();
  const ratingId = useId();
  const filterPanelId = useId();

  const trimmedSearch = searchText.trim();

  const genreOptions = getGenreOptions(scope);

  const canFilterLanguage = supportsLanguageFilter(scope);

  const fixedLanguageMessage =
    scope === "anime"
      ? "Japanese original language is applied automatically for Anime searches."
      : scope === "k-drama"
        ? "Korean original language is applied automatically for K-Drama searches."
        : "";

  const activeFilterCount = [
    genre !== "all",

    canFilterLanguage && language !== "all",

    minRating !== "all",
  ].filter(Boolean).length;

  function buildFilters(): SearchFilterValues {
    return {
      genre,

      language: canFilterLanguage ? language : "all",

      minRating,
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedSearch) {
      return;
    }

    onSubmit(trimmedSearch, scope, buildFilters());
  }

  function handleScopeChange(nextScope: SearchScope) {
    setScope(nextScope);
    setGenre("all");

    if (!supportsLanguageFilter(nextScope)) {
      setLanguage("all");
    }
  }

  function resetFilters() {
    const resetValues: SearchFilterValues = {
      genre: "all",
      language: "all",
      minRating: "all",
    };

    setGenre(resetValues.genre);
    setLanguage(resetValues.language);
    setMinRating(resetValues.minRating);

    if (trimmedSearch) {
      onSubmit(trimmedSearch, scope, resetValues);
    }
  }

  return (
    <form
      role="search"
      aria-label="Search FilmGeezer"
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/20 sm:p-5"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
        <div>
          <label
            htmlFor={searchInputId}
            className="text-sm font-semibold text-slate-200"
          >
            Search title
          </label>

          <input
            id={searchInputId}
            type="search"
            value={searchText}
            maxLength={100}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search movies, series, Anime, or K-Dramas..."
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-white outline-none placeholder:text-slate-500 focus:border-sky-400/60"
          />
        </div>

        <div>
          <label
            htmlFor={scopeId}
            className="text-sm font-semibold text-slate-200"
          >
            Content category
          </label>

          <select
            id={scopeId}
            value={scope}
            onChange={(event) =>
              handleScopeChange(event.target.value as SearchScope)
            }
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-white outline-none focus:border-sky-400/60"
          >
            <option value="all">Movies and TV Series</option>

            <option value="movie">Movies only</option>

            <option value="tv">TV Series only</option>

            <option value="anime">Anime only</option>

            <option value="k-drama">K-Drama only</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={!trimmedSearch}
          className="min-h-12 rounded-2xl bg-sky-500 px-7 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply Search
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 lg:hidden">
        <button
          type="button"
          aria-expanded={areFiltersOpen}
          aria-controls={filterPanelId}
          onClick={() => setAreFiltersOpen((isOpen) => !isOpen)}
          className="inline-flex min-h-11 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
        >
          Filters
          {activeFilterCount > 0 && ` (${activeFilterCount})`}
        </button>

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={resetFilters}
            className="min-h-11 text-sm font-semibold text-sky-300 transition hover:text-sky-200"
          >
            Reset filters
          </button>
        )}
      </div>

      <div
        id={filterPanelId}
        className={`${
          areFiltersOpen ? "grid" : "hidden"
        } mt-4 gap-4 border-t border-white/10 pt-4 ${
          canFilterLanguage ? "md:grid-cols-3" : "md:grid-cols-2"
        } lg:grid`}
      >
        <div>
          <label
            htmlFor={genreId}
            className="text-sm font-semibold text-slate-200"
          >
            Genre
          </label>

          <select
            id={genreId}
            value={genre}
            onChange={(event) => setGenre(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-white outline-none focus:border-sky-400/60"
          >
            <option value="all">All genres</option>

            {genreOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {canFilterLanguage && (
          <div>
            <label
              htmlFor={languageId}
              className="text-sm font-semibold text-slate-200"
            >
              Original language
            </label>

            <select
              id={languageId}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-white outline-none focus:border-sky-400/60"
            >
              <option value="all">All languages</option>

              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label
            htmlFor={ratingId}
            className="text-sm font-semibold text-slate-200"
          >
            Minimum rating
          </label>

          <select
            id={ratingId}
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-white outline-none focus:border-sky-400/60"
          >
            <option value="all">Any rating</option>

            {ratingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {fixedLanguageMessage && (
          <p className="text-sm leading-6 text-slate-400 md:col-span-2">
            {fixedLanguageMessage}
          </p>
        )}

        <div
          className={`hidden ${
            canFilterLanguage ? "md:col-span-3" : "md:col-span-2"
          } lg:flex lg:justify-end`}
        >
          <button
            type="button"
            onClick={resetFilters}
            disabled={activeFilterCount === 0}
            className="min-h-11 rounded-full border border-white/10 px-5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Reset filters
          </button>
        </div>
      </div>

      {(scope !== "all" || activeFilterCount > 0) && (
        <div
          aria-label="Active search filters"
          className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4"
        >
          {scope !== "all" && (
            <span className="rounded-full bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200">
              {getScopeLabel(scope)}
            </span>
          )}

          {genre !== "all" && (
            <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
              {genre}
            </span>
          )}

          {canFilterLanguage && language !== "all" && (
            <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
              {getLanguageLabel(language)}
            </span>
          )}

          {minRating !== "all" && (
            <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200">
              Rating {minRating}+
            </span>
          )}
        </div>
      )}
    </form>
  );
}

export default SearchToolbar;
