import AdminIcon from "../components/AdminIcon";
import type {
  AdminContentMediaTypeFilter,
  AdminContentStatusFilter,
} from "../types/admin";

export interface AdminContentFilterDraft {
  search: string;
  mediaType: AdminContentMediaTypeFilter;
  status: AdminContentStatusFilter;
}

export default function AdminContentFilters({
  value,
  isLoading,
  onChange,
  onApply,
  onReset,
}: {
  value: AdminContentFilterDraft;
  isLoading: boolean;
  onChange: (value: AdminContentFilterDraft) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
      className="rounded-[1.5rem] border border-white/[0.075] bg-slate-900/45 p-4 shadow-xl shadow-black/[0.06]"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_11rem_11rem_auto]">
        <label className="relative block">
          <span className="sr-only">Search content entries</span>
          <AdminIcon
            name="search"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"
          />
          <input
            type="search"
            value={value.search}
            onChange={(event) =>
              onChange({ ...value, search: event.target.value })
            }
            maxLength={120}
            placeholder="Title or exact TMDB ID"
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/40 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/35"
          />
        </label>

        <label>
          <span className="sr-only">Media type</span>
          <select
            value={value.mediaType}
            onChange={(event) =>
              onChange({
                ...value,
                mediaType: event.target
                  .value as AdminContentMediaTypeFilter,
              })
            }
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/40 px-3 text-sm font-bold text-slate-300 outline-none focus:border-sky-300/35"
          >
            <option value="all">Movies and TV</option>
            <option value="movie">Movies</option>
            <option value="tv">TV series</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Content status</span>
          <select
            value={value.status}
            onChange={(event) =>
              onChange({
                ...value,
                status: event.target.value as AdminContentStatusFilter,
              })
            }
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/40 px-3 text-sm font-bold text-slate-300 outline-none focus:border-sky-300/35"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Disabled</option>
          </select>
        </label>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isLoading}
            className="min-h-11 flex-1 rounded-xl bg-sky-500 px-4 text-sm font-black text-white transition hover:bg-sky-400 disabled:opacity-60 lg:flex-none"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="min-h-11 rounded-xl border border-white/[0.08] px-3 text-sm font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </div>
    </form>
  );
}
