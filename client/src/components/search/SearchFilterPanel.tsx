import { useMemo, useState } from "react";
import {
  getGenreOptions,
  languageOptions,
  ratingOptions,
  supportsLanguageFilter,
} from "../../config/searchFilters";
import type { SearchScope } from "../../types/media";
import type { SearchFilterValues } from "../../types/search";

interface SearchFilterPanelProps {
  scope: SearchScope;
  filters: SearchFilterValues;
  onFiltersChange: (filters: SearchFilterValues) => void;
  onApply: () => void;
  onReset: () => void;
  hasPendingChanges?: boolean;
  variant?: "sidebar" | "sheet";
}

const MAX_SELECTED_GENRES = 6;

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function SearchFilterPanel({
  scope,
  filters,
  onFiltersChange,
  onApply,
  onReset,
  hasPendingChanges = false,
  variant = "sidebar",
}: SearchFilterPanelProps) {
  const [genreSearch, setGenreSearch] = useState("");

  const genreOptions = getGenreOptions(scope);
  const canFilterLanguage = supportsLanguageFilter(scope);
  const idPrefix =
    variant === "sidebar" ? "desktop-search-filter" : "mobile-search-filter";
  const genreHeadingId = `${idPrefix}-genres`;
  const genreSearchId = `${idPrefix}-genre-search`;
  const languageHeadingId = `${idPrefix}-language`;
  const ratingHeadingId = `${idPrefix}-rating`;

  const visibleGenreOptions = useMemo(() => {
    const normalizedSearch = genreSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return genreOptions;
    }

    return genreOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedSearch),
    );
  }, [genreOptions, genreSearch]);

  const activeFilterCount =
    filters.genres.length +
    Number(canFilterLanguage && filters.language !== "all") +
    Number(filters.minRating !== "all");

  const fixedLanguageMessage =
    scope === "anime"
      ? "Japanese-language Anime is included automatically."
      : scope === "k-drama"
        ? "Korean-language titles are included automatically."
        : "";

  function updateFilters(nextFilters: Partial<SearchFilterValues>) {
    onFiltersChange({
      ...filters,
      ...nextFilters,
    });
  }

  function toggleGenre(genre: string) {
    const isSelected = filters.genres.includes(genre);

    if (!isSelected && filters.genres.length >= MAX_SELECTED_GENRES) {
      return;
    }

    updateFilters({
      genres: toggleArrayValue(filters.genres, genre),
    });
  }

  return (
    <div
      className={
        variant === "sidebar"
          ? "rounded-3xl border border-white/10 bg-slate-900/65 p-5 shadow-xl shadow-black/10"
          : "p-5"
      }
    >
      {variant === "sidebar" && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
              Refine
            </p>

            <h2 className="mt-2 text-lg font-bold text-white">
              Filter results
            </h2>
          </div>

          {activeFilterCount > 0 && (
            <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-200">
              {activeFilterCount} active
            </span>
          )}
        </div>
      )}

      <div className={variant === "sidebar" ? "mt-5 space-y-6" : "space-y-6"}>
        <section aria-labelledby={genreHeadingId}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3
                id={genreHeadingId}
                className="text-sm font-semibold text-slate-100"
              >
                Genres
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Select up to {MAX_SELECTED_GENRES} genres.
              </p>
            </div>

            {filters.genres.length > 0 && (
              <button
                type="button"
                onClick={() => updateFilters({ genres: [] })}
                className="min-h-9 rounded-full px-3 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/10 hover:text-sky-200"
              >
                Clear
              </button>
            )}
          </div>

          <label htmlFor={genreSearchId} className="sr-only">
            Find a genre
          </label>

          <input
            id={genreSearchId}
            type="search"
            value={genreSearch}
            onChange={(event) => setGenreSearch(event.target.value)}
            placeholder="Find a genre..."
            className="mt-3 min-h-11 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/15"
          />

          <div className="mt-3 max-h-56 space-y-1 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-slate-950/55 p-1.5 search-filter-scrollbar">
            {visibleGenreOptions.map((option) => {
              const isSelected = filters.genres.includes(option.value);
              const isDisabled =
                !isSelected && filters.genres.length >= MAX_SELECTED_GENRES;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={isDisabled}
                  onClick={() => toggleGenre(option.value)}
                  className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-35 ${
                    isSelected
                      ? "bg-sky-500/15 text-sky-100"
                      : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  <span className="min-w-0 truncate">{option.label}</span>

                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[0.65rem] font-black ${
                      isSelected
                        ? "border-sky-300/50 bg-sky-400 text-slate-950"
                        : "border-white/15 bg-slate-950 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })}

            {visibleGenreOptions.length === 0 && (
              <p className="px-3 py-5 text-center text-sm text-slate-500">
                No matching genres.
              </p>
            )}
          </div>

          {filters.genres.length > 1 && (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Genre matching
              </p>

              <div
                role="group"
                aria-label="Genre matching mode"
                className="mt-2 grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/65 p-1"
              >
                <button
                  type="button"
                  aria-pressed={filters.genreMode === "all"}
                  onClick={() => updateFilters({ genreMode: "all" })}
                  className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
                    filters.genreMode === "all"
                      ? "bg-sky-500 text-white"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  Match all
                </button>

                <button
                  type="button"
                  aria-pressed={filters.genreMode === "any"}
                  onClick={() => updateFilters({ genreMode: "any" })}
                  className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition ${
                    filters.genreMode === "any"
                      ? "bg-sky-500 text-white"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  Match any
                </button>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                {filters.genreMode === "all"
                  ? "Every result must include every selected genre."
                  : "Results may include any one of the selected genres."}
              </p>
            </div>
          )}
        </section>

        {canFilterLanguage ? (
          <section aria-labelledby={languageHeadingId}>
            <h3
              id={languageHeadingId}
              className="text-sm font-semibold text-slate-100"
            >
              Original language
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                aria-pressed={filters.language === "all"}
                onClick={() => updateFilters({ language: "all" })}
                className={`min-h-10 rounded-xl border px-3 text-sm font-semibold transition ${
                  filters.language === "all"
                    ? "border-sky-300/40 bg-sky-500/15 text-sky-100"
                    : "border-white/10 bg-slate-950/55 text-slate-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                Any language
              </button>

              {languageOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={filters.language === option.value}
                  onClick={() => updateFilters({ language: option.value })}
                  className={`min-h-10 rounded-xl border px-3 text-sm font-semibold transition ${
                    filters.language === option.value
                      ? "border-sky-300/40 bg-sky-500/15 text-sky-100"
                      : "border-white/10 bg-slate-950/55 text-slate-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-5 text-slate-400">
            {fixedLanguageMessage}
          </p>
        )}

        <section aria-labelledby={ratingHeadingId}>
          <h3
            id={ratingHeadingId}
            className="text-sm font-semibold text-slate-100"
          >
            Audience rating
          </h3>

          <div className="mt-3 grid gap-2">
            {ratingOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={filters.minRating === option.value}
                onClick={() => updateFilters({ minRating: option.value })}
                className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-4 text-left transition ${
                  filters.minRating === option.value
                    ? "border-amber-300/30 bg-amber-300/10 text-white"
                    : "border-white/10 bg-slate-950/55 text-slate-300 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">
                    {option.label}
                  </span>

                  {option.description && (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {option.description}
                    </span>
                  )}
                </span>

                <span
                  aria-hidden="true"
                  className={`h-3 w-3 shrink-0 rounded-full border ${
                    filters.minRating === option.value
                      ? "border-amber-200 bg-amber-300"
                      : "border-white/20 bg-transparent"
                  }`}
                />
              </button>
            ))}
          </div>
        </section>
      </div>

      {hasPendingChanges && (
        <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-xs leading-5 text-amber-100">
          Your filter changes are ready. Apply them to update the results.
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onReset}
          disabled={activeFilterCount === 0}
          className="min-h-11 rounded-2xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={onApply}
          className="min-h-11 rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
        >
          Apply filters
        </button>
      </div>
    </div>
  );
}

export default SearchFilterPanel;
