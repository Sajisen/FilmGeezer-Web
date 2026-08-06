import AdminIcon from "../components/AdminIcon";
import type {
  AdminContentMediaType,
  AdminContentSummary,
} from "../types/admin";

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return "Legacy entry";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Update time unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function createContentKey(
  mediaType: AdminContentMediaType,
  tmdbId: number,
): string {
  return `${mediaType}:${tmdbId}`;
}

function ContentListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 7 }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-white/[0.05] bg-slate-950/20 p-3"
        >
          <span className="block h-3 w-2/5 rounded bg-white/[0.06]" />
          <span className="mt-2 block h-2.5 w-3/5 rounded bg-white/[0.04]" />
          <span className="mt-3 block h-2 w-4/5 rounded bg-white/[0.035]" />
        </div>
      ))}
    </div>
  );
}

export default function AdminContentList({
  items,
  selectedKey,
  isLoading,
  pagination,
  onSelect,
  onPageChange,
}: {
  items: AdminContentSummary[];
  selectedKey: string | null;
  isLoading: boolean;
  pagination: {
    page: number;
    totalItems: number;
    totalPages: number;
  };
  onSelect: (mediaType: AdminContentMediaType, tmdbId: number) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45 shadow-xl shadow-black/[0.08]">
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4">
        <div>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-600">
            Managed catalog
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {pagination.totalItems.toLocaleString()} content entr
            {pagination.totalItems === 1 ? "y" : "ies"}
          </p>
        </div>
        <span className="rounded-full border border-white/[0.07] bg-slate-950/35 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-slate-500">
          Page {pagination.page} of {pagination.totalPages}
        </span>
      </header>

      {isLoading ? (
        <ContentListSkeleton />
      ) : items.length === 0 ? (
        <div className="grid min-h-72 place-items-center px-5 py-10 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/[0.07] bg-slate-950/35 text-slate-500">
              <AdminIcon name="content" className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-black text-white">
              No content entries matched
            </p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
              Change the filters or locate a TMDB title to create a new entry.
            </p>
          </div>
        </div>
      ) : (
        <div className="admin-scrollbar max-h-[60rem] space-y-1.5 overflow-y-auto p-2.5">
          {items.map((item) => {
            const key = createContentKey(item.mediaType, item.tmdbId);
            const selected = key === selectedKey;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(item.mediaType, item.tmdbId)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selected
                    ? "border-sky-300/20 bg-sky-400/[0.09] shadow-lg shadow-sky-950/10"
                    : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.025]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-slate-950/35 text-sky-300">
                    <AdminIcon name="content" className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {item.mediaType === "movie" ? "Movie" : "TV series"}
                          {item.year !== "Unknown" ? ` · ${item.year}` : ""}
                          {` · TMDB ${item.tmdbId}`}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-1 text-[0.55rem] font-black uppercase tracking-[0.1em] ${
                          item.active
                            ? "border-emerald-300/15 bg-emerald-400/[0.08] text-emerald-200"
                            : "border-slate-300/10 bg-slate-400/[0.06] text-slate-400"
                        }`}
                      >
                        {item.active ? "Active" : "Disabled"}
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.62rem] font-bold text-slate-600">
                      <span>
                        {item.sourceCount} source
                        {item.sourceCount === 1 ? "" : "s"}
                      </span>
                      <span>
                        {item.linkCount} link
                        {item.linkCount === 1 ? "" : "s"}
                      </span>
                      <span>Revision {item.revision}</span>
                    </div>
                    <p className="mt-2 truncate text-[0.62rem] text-slate-700">
                      {formatUpdatedAt(item.updatedAt)}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-3 py-3">
        <button
          type="button"
          disabled={pagination.page <= 1 || isLoading}
          onClick={() => onPageChange(pagination.page - 1)}
          className="min-h-9 rounded-xl border border-white/[0.07] px-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages || isLoading}
          onClick={() => onPageChange(pagination.page + 1)}
          className="min-h-9 rounded-xl border border-white/[0.07] px-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
        </button>
      </footer>
    </section>
  );
}
