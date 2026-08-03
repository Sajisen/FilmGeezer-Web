import type {
  AdminSupportListFilters,
  AdminSupportRequesterFilter,
  AdminSupportStatusFilter,
} from "../../types/admin";

interface AdminSupportFiltersProps {
  filters: AdminSupportListFilters;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onApplySearch: () => void;
  onStatusChange: (value: AdminSupportStatusFilter) => void;
  onCategoryChange: (
    value: AdminSupportListFilters["category"],
  ) => void;
  onRequesterChange: (value: AdminSupportRequesterFilter) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

const STATUS_OPTIONS: Array<{
  value: AdminSupportStatusFilter;
  label: string;
}> = [
  { value: "open", label: "Open" },
  { value: "new", label: "New" },
  { value: "in-review", label: "In review" },
  { value: "resolved", label: "Resolved" },
  { value: "spam", label: "Spam" },
  { value: "all", label: "All" },
];

export default function AdminSupportFilters({
  filters,
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  onStatusChange,
  onCategoryChange,
  onRequesterChange,
  onRefresh,
  isLoading,
}: AdminSupportFiltersProps) {
  return (
    <section className="rounded-2xl border border-white/9 bg-slate-900/62 p-4 shadow-lg shadow-black/10 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
            Support queue
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Contact support inbox
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Review requests, continue signed-in conversations, and keep every
            operational change auditable.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="min-h-10 shrink-0 rounded-full border border-white/10 px-4 text-sm font-bold text-slate-300 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
        >
          {isLoading ? "Refreshing…" : "Refresh inbox"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(15rem,1fr)_auto_auto]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onApplySearch();
          }}
          className="flex min-w-0 gap-2"
        >
          <label className="sr-only" htmlFor="admin-support-search">
            Search support requests
          </label>
          <input
            id="admin-support-search"
            value={searchDraft}
            onChange={(event) => onSearchDraftChange(event.target.value)}
            placeholder="Reference, subject, name, or email"
            maxLength={120}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/55 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/40 focus:ring-2 focus:ring-sky-400/10"
          />
          <button
            type="submit"
            className="min-h-11 whitespace-nowrap rounded-xl bg-sky-500 px-4 text-sm font-black text-white transition hover:bg-sky-400"
          >
            Search
          </button>
        </form>

        <label className="grid gap-1 text-xs font-bold text-slate-500">
          Category
          <select
            value={filters.category}
            onChange={(event) =>
              onCategoryChange(
                event.target.value as AdminSupportListFilters["category"],
              )
            }
            className="min-h-11 rounded-xl border border-white/10 bg-slate-950/55 px-3 text-sm font-bold text-slate-200 outline-none focus:border-sky-300/40"
          >
            <option value="all">All categories</option>
            <option value="general">Question or feedback</option>
            <option value="bug">Problem report</option>
            <option value="content">Content or link issue</option>
            <option value="account">Account help</option>
            <option value="feedback">Legacy feedback</option>
          </select>
        </label>

        <label className="grid gap-1 text-xs font-bold text-slate-500">
          Requester
          <select
            value={filters.requester}
            onChange={(event) =>
              onRequesterChange(
                event.target.value as AdminSupportRequesterFilter,
              )
            }
            className="min-h-11 rounded-xl border border-white/10 bg-slate-950/55 px-3 text-sm font-bold text-slate-200 outline-none focus:border-sky-300/40"
          >
            <option value="all">All requesters</option>
            <option value="account">Signed-in accounts</option>
            <option value="guest">Guests</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Support status filter">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filters.status === option.value}
            onClick={() => onStatusChange(option.value)}
            className={`min-h-9 rounded-full border px-3.5 text-xs font-black transition ${
              filters.status === option.value
                ? "border-sky-300/30 bg-sky-400/12 text-sky-100"
                : "border-white/9 bg-slate-950/30 text-slate-400 hover:border-white/16 hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
