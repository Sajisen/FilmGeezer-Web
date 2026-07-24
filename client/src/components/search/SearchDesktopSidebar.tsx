import type { FormEvent } from "react";
import type { SearchScope } from "../../types/media";
import type { SearchFilterValues } from "../../types/search";
import { SearchIcon } from "../navigation/NavigationIcons";
import SearchFilterPanel from "./SearchFilterPanel";

interface SearchDesktopSidebarProps {
  searchText: string;
  scope: SearchScope;
  filters: SearchFilterValues;
  hasPendingChanges: boolean;
  onSearchTextChange: (value: string) => void;
  onScopeChange: (scope: SearchScope) => void;
  onFiltersChange: (filters: SearchFilterValues) => void;
  onApply: () => void;
  onResetFilters: () => void;
}

const scopeOptions: Array<{ value: SearchScope; label: string }> = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "tv", label: "TV" },
  { value: "anime", label: "Anime" },
  { value: "k-drama", label: "K-Drama" },
];

function SearchDesktopSidebar({
  searchText,
  scope,
  filters,
  hasPendingChanges,
  onSearchTextChange,
  onScopeChange,
  onFiltersChange,
  onApply,
  onResetFilters,
}: SearchDesktopSidebarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasPendingChanges) {
      return;
    }

    onApply();
  }

  return (
    <aside className="sticky top-24 hidden h-[calc(100dvh-7rem)] overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-2xl shadow-black/20 lg:flex lg:flex-col">
      <form
        role="search"
        aria-label="Search FilmGeezer"
        onSubmit={handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="shrink-0 border-b border-white/10 px-4 py-4">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-sky-300/70" />

            <label htmlFor="desktop-search-page-query" className="sr-only">
              Search titles
            </label>

            <input
              id="desktop-search-page-query"
              type="search"
              value={searchText}
              maxLength={100}
              onChange={(event) => onSearchTextChange(event.target.value)}
              placeholder="Search titles..."
              className="min-h-11 w-full rounded-2xl border border-sky-400/25 bg-slate-950/85 pl-11 pr-3 text-sm text-white shadow-[0_0_0_1px_rgba(56,189,248,0.06)] outline-none transition placeholder:text-slate-500 hover:border-sky-400/40 focus:border-sky-300/70 focus:ring-2 focus:ring-sky-400/20"
            />
          </div>

          <div
            role="group"
            aria-label="Content category"
            className="mt-3 grid grid-cols-[0.72fr_1.05fr_0.62fr_0.9fr_1.15fr] gap-1.5"
          >
            {scopeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={scope === option.value}
                onClick={() => onScopeChange(option.value)}
                className={`min-h-9 min-w-0 rounded-full border px-1 text-[0.64rem] font-semibold leading-none transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 xl:text-[0.68rem] ${
                  scope === option.value
                    ? "border-sky-300/35 bg-sky-500/15 text-sky-100"
                    : "border-white/10 bg-slate-950/55 text-slate-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span className="block truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <SearchFilterPanel
          scope={scope}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onReset={onResetFilters}
          hasPendingChanges={hasPendingChanges}
          variant="sidebar"
          applyLabel="Search & apply"
          className="min-h-0 flex-1"
        />
      </form>
    </aside>
  );
}

export default SearchDesktopSidebar;
