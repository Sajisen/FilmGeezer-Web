import AdminIcon from "../components/AdminIcon";
import type {
  AdminAuditCategoryFilter,
  AdminAuditEventFilter,
  AdminAuditOutcomeFilter,
} from "../types/admin";
import {
  auditCategoryLabel,
  eventsForAuditCategory,
} from "./auditPresentation";

export interface AdminAuditFilterDraft {
  category: AdminAuditCategoryFilter;
  event: AdminAuditEventFilter;
  outcome: AdminAuditOutcomeFilter;
  actor: string;
  target: string;
  from: string;
  to: string;
}

export default function AdminAuditFilters({
  value,
  isLoading,
  onChange,
  onApply,
  onReset,
}: {
  value: AdminAuditFilterDraft;
  isLoading: boolean;
  onChange: (value: AdminAuditFilterDraft) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const eventOptions = eventsForAuditCategory(value.category);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
      className="rounded-[1.5rem] border border-white/[0.075] bg-slate-900/45 p-4 shadow-xl shadow-black/[0.06]"
    >
      <div className="flex items-center gap-2 text-[0.64rem] font-black uppercase tracking-[0.18em] text-slate-500">
        <AdminIcon name="filter" className="h-3.5 w-3.5" />
        Audit filters
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-4">
        <label>
          <span className="mb-1.5 block text-xs font-bold text-slate-500">
            Category
          </span>
          <select
            value={value.category}
            onChange={(event) => {
              const category = event.target
                .value as AdminAuditCategoryFilter;
              const availableEvents = eventsForAuditCategory(category);
              const selectedEventStillAvailable =
                value.event === "all" ||
                availableEvents.some(
                  (option) => option.value === value.event,
                );

              onChange({
                ...value,
                category,
                event: selectedEventStillAvailable
                  ? value.event
                  : "all",
              });
            }}
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/40 px-3 text-sm font-bold text-slate-300 outline-none focus:border-sky-300/35"
          >
            <option value="all">All categories</option>
            {(
              [
                "authentication",
                "security",
                "sessions",
                "roles",
                "support",
                "users",
                "content",
              ] as const
            ).map((category) => (
              <option key={category} value={category}>
                {auditCategoryLabel(category)}
              </option>
            ))}
          </select>
        </label>

        <label className="xl:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-slate-500">
            Event
          </span>
          <select
            value={value.event}
            onChange={(event) =>
              onChange({
                ...value,
                event: event.target.value as AdminAuditEventFilter,
              })
            }
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/40 px-3 text-sm font-bold text-slate-300 outline-none focus:border-sky-300/35"
          >
            <option value="all">All events</option>
            {eventOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-bold text-slate-500">
            Outcome
          </span>
          <select
            value={value.outcome}
            onChange={(event) =>
              onChange({
                ...value,
                outcome: event.target.value as AdminAuditOutcomeFilter,
              })
            }
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/40 px-3 text-sm font-bold text-slate-300 outline-none focus:border-sky-300/35"
          >
            <option value="all">All outcomes</option>
            <option value="success">Succeeded</option>
            <option value="failure">Failed</option>
          </select>
        </label>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
        <label className="relative block">
          <span className="mb-1.5 block text-xs font-bold text-slate-500">
            Actor
          </span>
          <AdminIcon
            name="search"
            className="pointer-events-none absolute bottom-3.5 left-3.5 h-4 w-4 text-slate-600"
          />
          <input
            type="search"
            value={value.actor}
            onChange={(event) =>
              onChange({ ...value, actor: event.target.value })
            }
            maxLength={120}
            placeholder="System, name, email, or user ID"
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/40 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/35"
          />
        </label>

        <label className="relative block">
          <span className="mb-1.5 block text-xs font-bold text-slate-500">
            Target
          </span>
          <AdminIcon
            name="search"
            className="pointer-events-none absolute bottom-3.5 left-3.5 h-4 w-4 text-slate-600"
          />
          <input
            type="search"
            value={value.target}
            onChange={(event) =>
              onChange({ ...value, target: event.target.value })
            }
            maxLength={120}
            placeholder="Name, email, user ID, or none"
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/40 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/35"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-bold text-slate-500">
            From
          </span>
          <input
            type="date"
            value={value.from}
            onChange={(event) =>
              onChange({ ...value, from: event.target.value })
            }
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/40 px-3 text-sm font-bold text-slate-300 outline-none focus:border-sky-300/35"
          />
        </label>

        <label>
          <span className="mb-1.5 block text-xs font-bold text-slate-500">
            To
          </span>
          <input
            type="date"
            value={value.to}
            onChange={(event) =>
              onChange({ ...value, to: event.target.value })
            }
            min={value.from || undefined}
            className="min-h-11 w-full rounded-xl border border-white/[0.08] bg-slate-950/40 px-3 text-sm font-bold text-slate-300 outline-none focus:border-sky-300/35"
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="min-h-10 rounded-xl border border-white/[0.08] px-4 text-sm font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-60"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="min-h-10 rounded-xl bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 disabled:opacity-60"
        >
          Apply filters
        </button>
      </div>
    </form>
  );
}
