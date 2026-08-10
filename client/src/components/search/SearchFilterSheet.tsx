import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useModalAccessibility } from "../../hooks/useModalAccessibility";
import { createDefaultSearchFilters } from "../../config/searchFilters";
import type { SearchScope } from "../../types/media";
import type { SearchFilterValues } from "../../types/search";
import { CloseIcon } from "../navigation/NavigationIcons";
import SearchFilterPanel from "./SearchFilterPanel";

interface SearchFilterSheetProps {
  scope: SearchScope;
  initialFilters: SearchFilterValues;
  onApply: (filters: SearchFilterValues) => void;
  onClose: () => void;
}

function areFiltersEqual(
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

function SearchFilterSheet({
  scope,
  initialFilters,
  onApply,
  onClose,
}: SearchFilterSheetProps) {
  const [draftFilters, setDraftFilters] =
    useState<SearchFilterValues>(initialFilters);

  const sheetRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const hasPendingChanges = !areFiltersEqual(
    draftFilters,
    initialFilters,
  );

  useModalAccessibility({
    isOpen: true,
    dialogRef: sheetRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  });

  function resetDraftFilters() {
    setDraftFilters(createDefaultSearchFilters(scope));
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close search filters"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/[0.84] backdrop-blur-md"
      />

      <aside
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-search-filters-title"
        className="absolute inset-x-2 bottom-2 flex max-h-[92dvh] min-h-0 flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/70"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
              Search
            </p>

            <h2
              id="mobile-search-filters-title"
              className="mt-1 text-lg font-bold text-white"
            >
              Refine results
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close search filters without applying changes"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-100 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <CloseIcon />
          </button>
        </div>

        <SearchFilterPanel
          scope={scope}
          filters={draftFilters}
          onFiltersChange={setDraftFilters}
          onApply={() => onApply(draftFilters)}
          onReset={resetDraftFilters}
          hasPendingChanges={hasPendingChanges}
          variant="sheet"
          className="min-h-0"
        />
      </aside>
    </div>,
    document.body,
  );
}

export default SearchFilterSheet;
