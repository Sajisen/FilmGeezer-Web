import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";

import { useModalAccessibility } from "../../hooks/useModalAccessibility";

import AdminIcon from "../components/AdminIcon";
import { searchAdminContentTmdb } from "../services/adminService";
import type {
  AdminContentMediaSnapshot,
  AdminContentMediaType,
} from "../types/admin";

interface AdminContentLookupDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (mediaType: AdminContentMediaType, tmdbId: number) => void;
}

export default function AdminContentLookupDialog({
  open,
  onClose,
  onSelect,
}: AdminContentLookupDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <OpenAdminContentLookupDialog
      onClose={onClose}
      onSelect={onSelect}
    />
  );
}

function OpenAdminContentLookupDialog({
  onClose,
  onSelect,
}: Omit<AdminContentLookupDialogProps, "open">) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const [mediaType, setMediaType] =
    useState<AdminContentMediaType>("movie");
  const [query, setQuery] = useState("");
  const [results, setResults] =
    useState<AdminContentMediaSnapshot[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalItems: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useModalAccessibility({
    isOpen: true,
    dialogRef,
    initialFocusSelector: "[data-admin-content-lookup-initial]",
    onEscape: onClose,
    escapeEnabled: !isLoading,
  });

  async function runSearch(page: number) {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      setErrorMessage("Enter at least two characters to search TMDB.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await searchAdminContentTmdb({
        mediaType,
        query: normalizedQuery,
        page,
      });
      setResults(response.items);
      setPagination(response.pagination);
    } catch (error) {
      setResults([]);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "TMDB title search could not be completed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runSearch(1);
  }

  const exactTmdbId = /^\d+$/u.test(query.trim())
    ? Number(query.trim())
    : null;

  return createPortal(
    <div
      className="fixed inset-0 z-[115] grid place-items-center overflow-y-auto bg-slate-950/80 px-4 py-8 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) {
          onCloseRef.current();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-content-lookup-title"
        aria-describedby="admin-content-lookup-description"
        aria-busy={isLoading}
        className="w-full max-w-4xl overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-slate-900 shadow-2xl shadow-black/55"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-200">
              <AdminIcon name="search" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.2em] text-sky-300">
                Canonical title lookup
              </p>
              <h2
                id="admin-content-lookup-title"
                className="mt-1 text-xl font-black text-white"
              >
                Find a title on TMDB
              </h2>
              <p
                id="admin-content-lookup-description"
                className="mt-2 max-w-2xl text-sm leading-6 text-slate-400"
              >
                FilmGeezer stores content links against the TMDB media type and
                TMDB ID. Search by title or open an exact numeric ID.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close TMDB lookup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
          >
            <AdminIcon name="close" className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <form
            onSubmit={handleSubmit}
            className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)_auto]"
          >
            <select
              aria-label="Media type"
              value={mediaType}
              onChange={(event) => {
                setMediaType(event.target.value as AdminContentMediaType);
                setResults([]);
                setPagination({ page: 1, totalItems: 0, totalPages: 1 });
                setErrorMessage(null);
              }}
              disabled={isLoading}
              className="min-h-12 rounded-2xl border border-white/[0.08] bg-slate-950/45 px-3 text-sm font-bold text-slate-200 outline-none focus:border-sky-300/40"
            >
              <option value="movie">Movie</option>
              <option value="tv">TV series</option>
            </select>

            <label className="relative block">
              <span className="sr-only">TMDB title or ID</span>
              <AdminIcon
                name="search"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
              />
              <input
                type="search"
                data-admin-content-lookup-initial
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                disabled={isLoading}
                maxLength={120}
                placeholder="Search title or enter exact TMDB ID"
                className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/45 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/40"
              />
            </label>

            <button
              type="submit"
              disabled={isLoading || query.trim().length < 2}
              className="min-h-12 rounded-2xl bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-50"
            >
              {isLoading ? "Searching…" : "Search TMDB"}
            </button>
          </form>

          {exactTmdbId && Number.isSafeInteger(exactTmdbId) ? (
            <button
              type="button"
              onClick={() => {
                onSelect(mediaType, exactTmdbId);
                onClose();
              }}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-sky-300/15 bg-sky-400/[0.06] px-4 py-3 text-left transition hover:bg-sky-400/[0.1]"
            >
              <span>
                <span className="block text-xs font-black uppercase tracking-[0.14em] text-sky-300">
                  Exact identity
                </span>
                <span className="mt-1 block text-sm font-bold text-white">
                  Open {mediaType === "movie" ? "movie" : "TV series"} TMDB
                  ID {exactTmdbId}
                </span>
              </span>
              <AdminIcon name="chevronRight" className="h-4 w-4 text-sky-300" />
            </button>
          ) : null}

          {errorMessage ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-300/15 bg-red-400/[0.08] px-4 py-3 text-sm font-bold text-red-100"
            >
              {errorMessage}
            </div>
          ) : null}

          {results.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-500">
                  {pagination.totalItems.toLocaleString()} TMDB result
                  {pagination.totalItems === 1 ? "" : "s"}
                </p>
                <span className="text-xs font-bold text-slate-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
              </div>

              <div className="admin-scrollbar grid max-h-[28rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {results.map((result) => (
                  <button
                    key={`${result.mediaType}:${result.tmdbId}`}
                    type="button"
                    onClick={() => {
                      onSelect(result.mediaType, result.tmdbId);
                      onClose();
                    }}
                    className="flex min-h-28 gap-3 rounded-2xl border border-white/[0.07] bg-slate-950/28 p-3 text-left transition hover:border-sky-300/20 hover:bg-sky-400/[0.055]"
                  >
                    {result.posterUrl ? (
                      <img
                        src={result.posterUrl}
                        alt=""
                        className="h-24 w-16 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="grid h-24 w-16 shrink-0 place-items-center rounded-xl bg-slate-950/60 text-slate-600">
                        <AdminIcon name="content" className="h-5 w-5" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-white">
                        {result.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {result.year} · TMDB {result.tmdbId}
                      </span>
                      <span className="mt-2 line-clamp-3 block text-xs leading-5 text-slate-600">
                        {result.overview}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex justify-between gap-3">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={() => void runSearch(pagination.page - 1)}
                  className="min-h-10 rounded-xl border border-white/[0.08] px-4 text-xs font-black text-slate-400 transition hover:text-white disabled:opacity-35"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={
                    pagination.page >= pagination.totalPages || isLoading
                  }
                  onClick={() => void runSearch(pagination.page + 1)}
                  className="min-h-10 rounded-xl border border-white/[0.08] px-4 text-xs font-black text-slate-400 transition hover:text-white disabled:opacity-35"
                >
                  Next
                </button>
              </div>
            </div>
          ) : query.trim().length >= 2 && !isLoading && !errorMessage ? (
            <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-white/[0.08] bg-slate-950/20 px-5 text-center">
              <div>
                <p className="text-sm font-black text-white">
                  No TMDB results yet
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Run the search or open the exact numeric TMDB ID.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
