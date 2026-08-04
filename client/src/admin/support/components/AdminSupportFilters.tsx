import AdminIcon from "../../components/AdminIcon";
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
  { value: "all", label: "All requests" },
];

export default function AdminSupportFilters({
  filters,
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  onStatusChange,
  onCategoryChange,
  onRequesterChange,
}: AdminSupportFiltersProps) {
  return (
    <section className="rounded-[1.5rem] border border-white/[0.075] bg-slate-900/55 p-4 shadow-xl shadow-black/[0.08] sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-slate-950/35 text-slate-400">
          <AdminIcon name="filter" className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-black text-white">Queue filters</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Narrow the inbox without changing conversation data.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(18rem,1.25fr)_minmax(12rem,0.55fr)_minmax(12rem,0.55fr)]">
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
          <div className="relative min-w-0 flex-1">
            <AdminIcon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
            />
            <input
              id="admin-support-search"
              value={searchDraft}
              onChange={(event) => onSearchDraftChange(event.target.value)}
              placeholder="Reference, subject, name, or email"
              maxLength={120}
              className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/45 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 hover:border-white/[0.12] focus:border-sky-300/35 focus:ring-2 focus:ring-sky-400/10"
            />
          </div>
          <button
            type="submit"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-sky-500 px-4 text-xs font-black text-white shadow-lg shadow-sky-950/20 transition hover:bg-sky-400"
          >
            Search
          </button>
        </form>

        <label className="grid gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-600">
          Category
          <select
            value={filters.category}
            onChange={(event) =>
              onCategoryChange(
                event.target.value as AdminSupportListFilters["category"],
              )
            }
            className="min-h-11 rounded-xl border border-white/[0.08] bg-slate-950/45 px-3 text-sm font-bold normal-case tracking-normal text-slate-200 outline-none transition hover:border-white/[0.12] focus:border-sky-300/35"
          >
            <option value="all">All categories</option>
            <option value="general">Question or feedback</option>
            <option value="bug">Problem report</option>
            <option value="content">Content or link issue</option>
            <option value="account">Account help</option>
            <option value="feedback">Legacy feedback</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-[0.65rem] font-black uppercase tracking-[0.14em] text-slate-600">
          Requester
          <select
            value={filters.requester}
            onChange={(event) =>
              onRequesterChange(
                event.target.value as AdminSupportRequesterFilter,
              )
            }
            className="min-h-11 rounded-xl border border-white/[0.08] bg-slate-950/45 px-3 text-sm font-bold normal-case tracking-normal text-slate-200 outline-none transition hover:border-white/[0.12] focus:border-sky-300/35"
          >
            <option value="all">All requesters</option>
            <option value="account">Signed-in accounts</option>
            <option value="guest">Guests</option>
          </select>
        </label>
      </div>

      <div
        className="admin-horizontal-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1"
        aria-label="Support status filter"
      >
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filters.status === option.value}
            onClick={() => onStatusChange(option.value)}
            className={`min-h-9 shrink-0 rounded-xl border px-3.5 text-xs font-black transition ${
              filters.status === option.value
                ? "border-sky-300/20 bg-sky-400/[0.1] text-sky-100 shadow-sm shadow-sky-950/20"
                : "border-white/[0.065] bg-slate-950/25 text-slate-500 hover:border-white/[0.12] hover:text-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
