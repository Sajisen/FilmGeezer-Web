import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  const hasPendingChanges = !areFiltersEqual(
    draftFilters,
    initialFilters,
  );

  useEffect(() => {
    previouslyFocusedElementRef.current =
      document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !sheetRef.current) {
        return;
      }

      const focusableElements = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>(
          [
            "button:not([disabled])",
            "input:not([disabled])",
            '[tabindex]:not([tabindex="-1"])',
          ].join(","),
        ),
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        event.preventDefault();
        sheetRef.current.focus();
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElementRef.current?.focus();
    };
  }, [onClose]);

  function resetDraftFilters() {
    setDraftFilters({
      genres: [],
      genreMode: "all",
      language: "all",
      minRating: "all",
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] lg:hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close search filters"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/[0.82] backdrop-blur-md"
      />

      <aside
        ref={sheetRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-search-filters-title"
        className="absolute inset-x-2 bottom-2 max-h-[92dvh] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/70"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
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

        <div className="max-h-[calc(92dvh-5rem)] overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] search-filter-scrollbar">
          <SearchFilterPanel
            scope={scope}
            filters={draftFilters}
            onFiltersChange={setDraftFilters}
            onApply={() => onApply(draftFilters)}
            onReset={resetDraftFilters}
            hasPendingChanges={hasPendingChanges}
            variant="sheet"
          />
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export default SearchFilterSheet;
