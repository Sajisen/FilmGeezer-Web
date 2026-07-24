import { useId, useMemo, useState } from "react";
import {
  formatOptions,
  getFixedFormat,
  getFormatLabel,
  getGenreOptions,
  getLanguageLabel,
  getRatingLabel,
  getReleasePeriodLabel,
  getSortLabel,
  languageOptions,
  MAX_RELEASE_YEAR,
  MIN_RELEASE_YEAR,
  ratingOptions,
  sortOptions,
  supportsFormatFilter,
  supportsLanguageFilter,
  type FilterOption,
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

type FilterSection =
  | "genres"
  | "format"
  | "release"
  | "language"
  | "rating"
  | "sort";

const MAX_SELECTED_GENRES = 6;

function toggleArrayValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((currentValue) => currentValue !== value)
    : [...values, value];
}

function getGenreGroupOrder(groupName: string) {
  const groupOrder = ["Movies & series", "Movies", "Series", ""];
  const index = groupOrder.indexOf(groupName);

  return index === -1 ? groupOrder.length : index;
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

interface ReleaseYearRangeProps {
  idPrefix: string;
  fromYear: number | null;
  toYear: number | null;
  onChange: (fromYear: number | null, toYear: number | null) => void;
}

function ReleaseYearRange({
  idPrefix,
  fromYear,
  toYear,
  onChange,
}: ReleaseYearRangeProps) {
  const minimumValue = fromYear ?? MIN_RELEASE_YEAR;
  const maximumValue = toYear ?? MAX_RELEASE_YEAR;
  const totalSpan = MAX_RELEASE_YEAR - MIN_RELEASE_YEAR;
  const leftPosition = ((minimumValue - MIN_RELEASE_YEAR) / totalSpan) * 100;
  const rightPosition = ((maximumValue - MIN_RELEASE_YEAR) / totalSpan) * 100;

  function changeMinimum(value: number) {
    const boundedValue = Math.min(value, maximumValue);

    onChange(
      boundedValue === MIN_RELEASE_YEAR ? null : boundedValue,
      toYear,
    );
  }

  function changeMaximum(value: number) {
    const boundedValue = Math.max(value, minimumValue);

    onChange(
      fromYear,
      boundedValue === MAX_RELEASE_YEAR ? null : boundedValue,
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            From
          </p>
          <p className="mt-1 text-base font-bold text-white">
            {fromYear ?? "Any"}
          </p>
        </div>

        <div className="h-px flex-1 bg-gradient-to-r from-sky-500/15 via-sky-300/50 to-sky-500/15" />

        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            To
          </p>
          <p className="mt-1 text-base font-bold text-white">
            {toYear ?? "Any"}
          </p>
        </div>
      </div>

      <div className="relative mt-5 h-9">
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-800" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-600 via-sky-400 to-cyan-300"
          style={{
            left: `${leftPosition}%`,
            width: `${Math.max(0, rightPosition - leftPosition)}%`,
          }}
        />

        <label htmlFor={`${idPrefix}-from`} className="sr-only">
          Earliest release year
        </label>
        <input
          id={`${idPrefix}-from`}
          type="range"
          min={MIN_RELEASE_YEAR}
          max={MAX_RELEASE_YEAR}
          step={1}
          value={minimumValue}
          onChange={(event) => changeMinimum(Number(event.target.value))}
          className="release-year-range-input release-year-range-input--from"
        />

        <label htmlFor={`${idPrefix}-to`} className="sr-only">
          Latest release year
        </label>
        <input
          id={`${idPrefix}-to`}
          type="range"
          min={MIN_RELEASE_YEAR}
          max={MAX_RELEASE_YEAR}
          step={1}
          value={maximumValue}
          onChange={(event) => changeMaximum(Number(event.target.value))}
          className="release-year-range-input release-year-range-input--to"
        />
      </div>

      <div className="mt-1 flex justify-between text-[0.65rem] font-medium text-slate-600">
        <span>{MIN_RELEASE_YEAR}</span>
        <span>{MAX_RELEASE_YEAR}</span>
      </div>
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

    if (filters.releaseYearFrom !== null || filters.releaseYearTo !== null) {
      return "release";
    }

    if (filters.language !== "all") {
      return "language";
    }

    if (filters.minRating !== "all") {
      return "rating";
    }

    if (filters.sortBy !== "best-match") {
      return "sort";
    }

    return null;
  });

  const genreOptions = useMemo(() => getGenreOptions(scope), [scope]);
  const canFilterLanguage = supportsLanguageFilter(scope);
  const canFilterFormat = supportsFormatFilter(scope);
  const fixedFormat = getFixedFormat(scope);

  const visibleGenreOptions = useMemo(() => {
    const normalizedSearch = genreSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return genreOptions;
    }

    return genreOptions.filter((option) => {
      const searchableText = `${option.label} ${option.group ?? ""}`.toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [genreOptions, genreSearch]);

  const groupedGenreOptions = useMemo(() => {
    const groups = new Map<string, FilterOption[]>();

    visibleGenreOptions.forEach((option) => {
      const groupName = option.group ?? "";
      const existingOptions = groups.get(groupName) ?? [];

      groups.set(groupName, [...existingOptions, option]);
    });

    return Array.from(groups.entries()).sort(
      ([firstGroup], [secondGroup]) =>
        getGenreGroupOrder(firstGroup) - getGenreGroupOrder(secondGroup),
    );
  }, [visibleGenreOptions]);

  const activeFilterCount =
    filters.genres.length +
    Number(canFilterFormat && filters.format !== "all") +
    Number(
      filters.releaseYearFrom !== null || filters.releaseYearTo !== null,
    ) +
    Number(canFilterLanguage && filters.language !== "all") +
    Number(filters.minRating !== "all") +
    Number(filters.sortBy !== "best-match") +
    Number(filters.establishedOnly);

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

  const formatSummary = fixedFormat
    ? `${getFormatLabel(fixedFormat)} (fixed)`
    : getFormatLabel(filters.format);

  const releaseSummary = getReleasePeriodLabel(
    filters.releaseYearFrom,
    filters.releaseYearTo,
  );

  const languageSummary = canFilterLanguage
    ? filters.language === "all"
      ? "Any original language"
      : getLanguageLabel(filters.language)
    : fixedLanguageLabel;

  const ratingSummary = getRatingLabel(filters.minRating);
  const sortSummary = getSortLabel(filters.sortBy);

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
                    {genreOptions.some((option) => option.group)
                      ? `Choose from shared, Movie, or Series genres. Select up to ${MAX_SELECTED_GENRES}.`
                      : `Select up to ${MAX_SELECTED_GENRES} genres.`}
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

                <div className="mt-3 space-y-4">
                  {groupedGenreOptions.map(([groupName, options]) => (
                    <div key={groupName || "genres"}>
                      {groupName && (
                        <p className="mb-1.5 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          {groupName}
                        </p>
                      )}

                      <div className="space-y-1">
                        {options.map((option) => {
                          const isSelected = filters.genres.includes(
                            option.value,
                          );
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
                              <span className="min-w-0 truncate">
                                {option.label}
                              </span>

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
                      </div>
                    </div>
                  ))}

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
              id={`${baseId}-format-trigger`}
              controlsId={`${baseId}-format-panel`}
              title="Format"
              summary={formatSummary}
              isOpen={openSection === "format"}
              disabled={!canFilterFormat}
              onClick={() => toggleSection("format")}
            />

            {canFilterFormat && openSection === "format" && (
              <div
                id={`${baseId}-format-panel`}
                role="region"
                aria-labelledby={`${baseId}-format-trigger`}
                className="mt-2 space-y-1 rounded-2xl border border-white/10 bg-slate-950/55 p-2"
              >
                {formatOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filters.format === option.value}
                    onClick={() => updateFilters({ format: option.value })}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 text-left transition ${
                      filters.format === option.value
                        ? "bg-sky-500/15 text-white"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {option.description}
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 shrink-0 rounded-full border ${
                        filters.format === option.value
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
              id={`${baseId}-release-trigger`}
              controlsId={`${baseId}-release-panel`}
              title="Release period"
              summary={releaseSummary}
              isOpen={openSection === "release"}
              onClick={() => toggleSection("release")}
            />

            {openSection === "release" && (
              <div
                id={`${baseId}-release-panel`}
                role="region"
                aria-labelledby={`${baseId}-release-trigger`}
                className="mt-2 rounded-2xl border border-white/10 bg-slate-950/55 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs leading-5 text-slate-500">
                    Drag either handle to choose an open or closed year range.
                  </p>

                  {(filters.releaseYearFrom !== null ||
                    filters.releaseYearTo !== null) && (
                    <button
                      type="button"
                      onClick={() =>
                        updateFilters({
                          releaseYearFrom: null,
                          releaseYearTo: null,
                        })
                      }
                      className="min-h-9 rounded-full px-3 text-xs font-semibold text-sky-300 transition hover:bg-sky-500/10 hover:text-sky-200"
                    >
                      Any year
                    </button>
                  )}
                </div>

                <div className="mt-4">
                  <ReleaseYearRange
                    idPrefix={`${baseId}-release-year`}
                    fromYear={filters.releaseYearFrom}
                    toYear={filters.releaseYearTo}
                    onChange={(releaseYearFrom, releaseYearTo) =>
                      updateFilters({ releaseYearFrom, releaseYearTo })
                    }
                  />
                </div>
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

          <section>
            <FilterSectionButton
              id={`${baseId}-sort-trigger`}
              controlsId={`${baseId}-sort-panel`}
              title="Sort results"
              summary={sortSummary}
              isOpen={openSection === "sort"}
              onClick={() => toggleSection("sort")}
            />

            {openSection === "sort" && (
              <div
                id={`${baseId}-sort-panel`}
                role="region"
                aria-labelledby={`${baseId}-sort-trigger`}
                className="mt-2 space-y-1 rounded-2xl border border-white/10 bg-slate-950/55 p-2"
              >
                {sortOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={filters.sortBy === option.value}
                    onClick={() => updateFilters({ sortBy: option.value })}
                    className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 text-left transition ${
                      filters.sortBy === option.value
                        ? "bg-sky-500/15 text-white"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-semibold">
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {option.description}
                      </span>
                    </span>

                    <span
                      aria-hidden="true"
                      className={`h-3 w-3 shrink-0 rounded-full border ${
                        filters.sortBy === option.value
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
            <button
              type="button"
              role="switch"
              aria-checked={filters.establishedOnly}
              onClick={() =>
                updateFilters({
                  establishedOnly: !filters.establishedOnly,
                })
              }
              className={`flex min-h-20 w-full items-center justify-between gap-4 rounded-2xl border px-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                filters.establishedOnly
                  ? "border-sky-400/30 bg-sky-500/10"
                  : "border-white/10 bg-white/[0.025] hover:border-white/15 hover:bg-white/[0.045]"
              }`}
            >
              <span>
                <span className="block text-sm font-semibold text-white">
                  Established titles
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-400">
                  Hide titles with too few audience votes for a reliable score.
                </span>
              </span>

              <span
                aria-hidden="true"
                className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                  filters.establishedOnly
                    ? "border-sky-300/40 bg-sky-500"
                    : "border-white/15 bg-slate-800"
                }`}
              >
                <span
                  className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition ${
                    filters.establishedOnly ? "left-6" : "left-1"
                  }`}
                />
              </span>
            </button>
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
            Changes are not applied yet. Press {applyLabel} to refresh the
            results.
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
