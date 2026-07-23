import { useId, useMemo, useState } from "react";
import {
  getGenreOptions,
  getLanguageLabel,
  getRatingLabel,
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
  applyLabel?: string;
  className?: string;
}

type FilterSection = "genres" | "language" | "rating";

const MAX_SELECTED_GENRES = 6;

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
      fill="none"
    >
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface FilterSectionButtonProps {
  id: string;
  controlsId: string;
  title: string;
  summary: string;
  isOpen: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function FilterSectionButton({
  id,
  controlsId,
  title,
  summary,
  isOpen,
  disabled = false,
  onClick,
}: FilterSectionButtonProps) {
  return (
    <button
      id={id}
      type="button"
      aria-expanded={disabled ? undefined : isOpen}
      aria-controls={disabled ? undefined : controlsId}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      className={`flex min-h-16 w-full items-center justify-between gap-4 rounded-2xl border px-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
        isOpen
          ? "border-sky-400/30 bg-sky-500/10"
          : "border-white/10 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]"
      } ${disabled ? "cursor-default" : ""}`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="mt-1 block truncate text-xs text-slate-400">
          {summary}
        </span>
      </span>

      {!disabled && (
        <span className={isOpen ? "text-sky-300" : "text-slate-500"}>
          <ChevronIcon isOpen={isOpen} />
        </span>
      )}
    </button>
  );
}

interface MatchModeButtonProps {
  isSelected: boolean;
  label: string;
  description: string;
  onClick: () => void;
}

function MatchModeButton({
  isSelected,
  label,
  description,
  onClick,
}: MatchModeButtonProps) {
  return (
    <div className="group relative min-w-0">
      <button
        type="button"
        aria-pressed={isSelected}
        title={description}
        onClick={onClick}
        className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
          isSelected
            ? "bg-sky-500 text-white"
            : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
        }`}
      >
        {label}
        <span
          aria-hidden="true"
          className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[0.65rem] font-black ${
            isSelected
              ? "border-white/25 bg-white/10 text-white"
              : "border-white/15 text-slate-500"
          }`}
        >
          i
        </span>
      </button>

      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-30 hidden w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-center text-xs leading-5 text-slate-200 shadow-xl shadow-black/40 group-hover:block group-focus-within:block"
      >
        {description}
      </span>
    </div>
  );
}

function SearchFilterPanel({
  scope,
  filters,
  onFiltersChange,
  onApply,
  onReset,
  hasPendingChanges = false,
  variant = "sidebar",
  applyLabel = variant === "sidebar" ? "Search & apply" : "Apply filters",
  className = "",
}: SearchFilterPanelProps) {
  const baseId = useId().replace(/:/g, "");
  const [genreSearch, setGenreSearch] = useState("");
  const [openSection, setOpenSection] = useState<FilterSection | null>(() => {
    if (filters.genres.length > 0) {
      return "genres";
    }

    if (filters.language !== "all") {
      return "language";
    }

    if (filters.minRating !== "all") {
      return "rating";
    }

    return null;
  });

  const genreOptions = getGenreOptions(scope);
  const canFilterLanguage = supportsLanguageFilter(scope);

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

  const fixedLanguageLabel =
    scope === "anime" ? "Japanese (fixed)" : "Korean (fixed)";

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

    const genres = toggleArrayValue(filters.genres, genre);

    updateFilters({
      genres,
      genreMode: genres.length > 1 ? filters.genreMode : "all",
    });
  }

  function toggleSection(section: FilterSection) {
    setOpenSection((currentSection) =>
      currentSection === section ? null : section,
    );
  }

  const genreSummary =
    filters.genres.length === 0
      ? "Any genre"
      : filters.genres.length === 1
        ? filters.genres[0]
        : `${filters.genres.length} selected · Match ${filters.genreMode}`;

  const languageSummary = canFilterLanguage
    ? filters.language === "all"
      ? "Any original language"
      : getLanguageLabel(filters.language)
    : fixedLanguageLabel;

  const ratingSummary = getRatingLabel(filters.minRating);

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      {variant === "sidebar" && (
        <div className="shrink-0 border-b border-white/10 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-white">Refine results</h2>

            {activeFilterCount > 0 && (
              <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-200">
                {activeFilterCount} active
              </span>
            )}
          </div>
        </div>
      )}

      <div className="search-filter-scrollbar min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <div className="space-y-3">
          <section>
            <FilterSectionButton
              id={`${baseId}-genres-trigger`}
              controlsId={`${baseId}-genres-panel`}
              title="Genres"
              summary={genreSummary}
              isOpen={openSection === "genres"}
              onClick={() => toggleSection("genres")}
            />

            {openSection === "genres" && (
              <div
                id={`${baseId}-genres-panel`}
                role="region"
                aria-labelledby={`${baseId}-genres-trigger`}
                className="mt-2 rounded-2xl border border-white/10 bg-slate-950/55 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-slate-500">
                    Select up to {MAX_SELECTED_GENRES} genres.
                  </p>

                  {filters.genres.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        updateFilters({ genres: [], genreMode: "all" })
                      }
                      className="min-h-9 rounded-full px-3 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/10 hover:text-sky-200"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <label htmlFor={`${baseId}-genre-search`} className="sr-only">
                  Find a genre
                </label>
                <input
                  id={`${baseId}-genre-search`}
                  type="search"
                  value={genreSearch}
                  onChange={(event) => setGenreSearch(event.target.value)}
                  placeholder="Find a genre..."
                  className="mt-3 min-h-11 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/15"
                />

                <div className="mt-3 space-y-1">
                  {visibleGenreOptions.map((option) => {
                    const isSelected = filters.genres.includes(option.value);
                    const isDisabled =
                      !isSelected &&
                      filters.genres.length >= MAX_SELECTED_GENRES;

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
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Genre matching
                    </p>

                    <div
                      role="group"
                      aria-label="Genre matching mode"
                      className="mt-2 grid grid-cols-2 rounded-2xl border border-white/10 bg-slate-950/65 p-1"
                    >
                      <MatchModeButton
                        isSelected={filters.genreMode === "all"}
                        label="Match all"
                        description="Every result must include every selected genre."
                        onClick={() => updateFilters({ genreMode: "all" })}
                      />
                      <MatchModeButton
                        isSelected={filters.genreMode === "any"}
                        label="Match any"
                        description="Results may include any one of the selected genres."
                        onClick={() => updateFilters({ genreMode: "any" })}
                      />
                    </div>

                    <p className="mt-2 text-xs leading-5 text-slate-500">
                      {filters.genreMode === "all"
                        ? "Every result must include every selected genre."
                        : "Results may include any one of the selected genres."}
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          <section>
            <FilterSectionButton
              id={`${baseId}-language-trigger`}
              controlsId={`${baseId}-language-panel`}
              title="Original language"
              summary={languageSummary}
              isOpen={openSection === "language"}
              disabled={!canFilterLanguage}
              onClick={() => toggleSection("language")}
            />

            {canFilterLanguage && openSection === "language" && (
              <div
                id={`${baseId}-language-panel`}
                role="region"
                aria-labelledby={`${baseId}-language-trigger`}
                className="mt-2 space-y-1 rounded-2xl border border-white/10 bg-slate-950/55 p-2"
              >
                <button
                  type="button"
                  aria-pressed={filters.language === "all"}
                  onClick={() => updateFilters({ language: "all" })}
                  className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-semibold transition ${
                    filters.language === "all"
                      ? "bg-sky-500/15 text-sky-100"
                      : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  Any language
                  <span
                    aria-hidden="true"
                    className={`h-3 w-3 rounded-full border ${
                      filters.language === "all"
                        ? "border-sky-200 bg-sky-400"
                        : "border-white/20"
                    }`}
                  />
                </button>

                {languageOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filters.language === option.value}
                    onClick={() => updateFilters({ language: option.value })}
                    className={`flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-sm font-semibold transition ${
                      filters.language === option.value
                        ? "bg-sky-500/15 text-sky-100"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    {option.label}
                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 rounded-full border ${
                        filters.language === option.value
                          ? "border-sky-200 bg-sky-400"
                          : "border-white/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <FilterSectionButton
              id={`${baseId}-rating-trigger`}
              controlsId={`${baseId}-rating-panel`}
              title="Audience rating"
              summary={ratingSummary}
              isOpen={openSection === "rating"}
              onClick={() => toggleSection("rating")}
            />

            {openSection === "rating" && (
              <div
                id={`${baseId}-rating-panel`}
                role="region"
                aria-labelledby={`${baseId}-rating-trigger`}
                className="mt-2 space-y-1 rounded-2xl border border-white/10 bg-slate-950/55 p-2"
              >
                {ratingOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filters.minRating === option.value}
                    onClick={() => updateFilters({ minRating: option.value })}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 text-left transition ${
                      filters.minRating === option.value
                        ? "bg-sky-500/15 text-white"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
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
                          ? "border-sky-200 bg-sky-400"
                          : "border-white/20"
                      }`}
                    />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <div
        className={`shrink-0 border-t border-white/10 bg-slate-950/85 px-4 pt-3 backdrop-blur-md ${
          variant === "sheet"
            ? "pb-[max(1rem,env(safe-area-inset-bottom))]"
            : "pb-4"
        }`}
      >
        {hasPendingChanges && (
  <p
    role="status"
    className="mb-3 text-xs font-medium leading-5 text-amber-300"
  >
    Changes are not applied yet. Press {applyLabel} to refresh the results.
  </p>
)}

        <div className="grid grid-cols-2 gap-3">
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
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SearchFilterPanel;
