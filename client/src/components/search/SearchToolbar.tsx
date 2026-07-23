import type { FormEvent } from "react";
import type { SearchScope } from "../../types/media";
import { FilterIcon, SearchIcon } from "../navigation/NavigationIcons";

interface SearchToolbarProps {
  searchText: string;
  scope: SearchScope;
  activeFilterCount: number;
  canSubmit: boolean;
  autoFocus?: boolean;
  onSearchTextChange: (value: string) => void;
  onScopeChange: (scope: SearchScope) => void;
  onSubmit: () => void;
  onOpenFilters: () => void;
}

const scopeOptions: Array<{ value: SearchScope; label: string }> = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
  { value: "anime", label: "Anime" },
  { value: "k-drama", label: "K-Drama" },
];

function SearchToolbar({
  searchText,
  scope,
  activeFilterCount,
  canSubmit,
  autoFocus = false,
  onSearchTextChange,
  onScopeChange,
  onSubmit,
  onOpenFilters,
}: SearchToolbarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    onSubmit();
  }

  return (
    <form
      role="search"
      aria-label="Search FilmGeezer"
      onSubmit={handleSubmit}
      className="rounded-3xl border border-white/10 bg-slate-900/70 p-3 shadow-xl shadow-black/15 sm:p-4"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="relative min-w-0">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

          <label htmlFor="search-page-query" className="sr-only">
            Search titles
          </label>

          <input
            id="search-page-query"
            type="search"
            value={searchText}
            maxLength={100}
            autoFocus={autoFocus}
            onChange={(event) => onSearchTextChange(event.target.value)}
            placeholder="Search by title, or explore with filters..."
            className="min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/80 pl-12 pr-4 text-white outline-none placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/15"
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <button
            type="button"
            onClick={onOpenFilters}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 lg:hidden"
          >
            <FilterIcon className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-xs text-sky-200">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="submit"
            disabled={!canSubmit}
            className="min-h-12 rounded-2xl bg-sky-500 px-5 font-semibold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Search
          </button>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto search-filter-scrollbar">
        <div
          role="group"
          aria-label="Content category"
          className="flex w-max min-w-full gap-2"
        >
          {scopeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={scope === option.value}
              onClick={() => onScopeChange(option.value)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                scope === option.value
                  ? "border-sky-300/35 bg-sky-500/15 text-sky-100"
                  : "border-white/10 bg-slate-950/55 text-slate-400 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}

export default SearchToolbar;
