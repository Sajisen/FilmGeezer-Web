import ProfileAvatar from "../../components/ProfileAvatar";
import AdminIcon from "../components/AdminIcon";
import type { AdminAuditEntry } from "../types/admin";
import {
  auditCategoryClass,
  auditCategoryLabel,
  auditEventLabel,
  auditIdentityPrimary,
  formatAuditRelativeTime,
} from "./auditPresentation";

function AuditListSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border border-white/[0.05] bg-slate-950/20 p-3"
        >
          <div className="flex items-start gap-3">
            <span className="h-10 w-10 rounded-full bg-white/[0.06]" />
            <span className="min-w-0 flex-1">
              <span className="block h-3 w-3/5 rounded bg-white/[0.06]" />
              <span className="mt-2 block h-2.5 w-4/5 rounded bg-white/[0.04]" />
              <span className="mt-3 block h-2 w-2/5 rounded bg-white/[0.035]" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminAuditList({
  items,
  selectedEventId,
  isLoading,
  pagination,
  onSelect,
  onPageChange,
}: {
  items: AdminAuditEntry[];
  selectedEventId: string | null;
  isLoading: boolean;
  pagination: {
    page: number;
    totalItems: number;
    totalPages: number;
  };
  onSelect: (eventId: string) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[1.6rem] border border-white/[0.075] bg-slate-900/45 shadow-xl shadow-black/[0.08]">
      <header className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4">
        <div>
          <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-600">
            Immutable activity trail
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {pagination.totalItems.toLocaleString()} record
            {pagination.totalItems === 1 ? "" : "s"}
          </p>
        </div>
        <span className="rounded-full border border-white/[0.07] bg-slate-950/35 px-3 py-1 text-[0.62rem] font-black uppercase tracking-[0.14em] text-slate-500">
          Page {pagination.page} of {pagination.totalPages}
        </span>
      </header>

      {isLoading ? (
        <AuditListSkeleton />
      ) : items.length === 0 ? (
        <div className="grid min-h-72 place-items-center px-5 py-10 text-center">
          <div>
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/[0.07] bg-slate-950/35 text-slate-500">
              <AdminIcon name="search" className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-black text-white">
              No audit records matched
            </p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
              Change the actor, target, event, outcome, or date filters.
            </p>
          </div>
        </div>
      ) : (
        <div className="max-h-[58rem] space-y-1.5 overflow-y-auto p-2.5 admin-scrollbar">
          {items.map((item) => {
            const selected = item.auditEventId === selectedEventId;

            return (
              <button
                key={item.auditEventId}
                type="button"
                onClick={() => onSelect(item.auditEventId)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  selected
                    ? "border-sky-300/20 bg-sky-400/[0.09] shadow-lg shadow-sky-950/10"
                    : "border-transparent hover:border-white/[0.06] hover:bg-white/[0.025]"
                }`}
              >
                <div className="flex items-start gap-3">
                  {item.actor.kind === "user" ? (
                    <ProfileAvatar
                      displayName={item.actor.displayName}
                      profileImagePath={item.actor.profileImagePath}
                      className="h-10 w-10"
                      initialsClassName="text-[0.65rem]"
                    />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/[0.07] bg-slate-950/40 text-slate-500">
                      <AdminIcon
                        name={
                          item.actor.kind === "system"
                            ? "settings"
                            : "users"
                        }
                        className="h-4 w-4"
                      />
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm font-black leading-5 text-white">
                        {auditEventLabel(item.eventType)}
                      </p>
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                          item.outcome === "success"
                            ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]"
                            : "bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.45)]"
                        }`}
                        aria-label={
                          item.outcome === "success"
                            ? "Successful event"
                            : "Failed event"
                        }
                      />
                    </div>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {auditIdentityPrimary(item.actor)}
                      {item.target
                        ? ` → ${auditIdentityPrimary(item.target)}`
                        : ""}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[0.54rem] font-black uppercase tracking-[0.1em] ${auditCategoryClass(item.category)}`}
                      >
                        {auditCategoryLabel(item.category)}
                      </span>
                      <span className="text-[0.6rem] font-bold text-slate-600">
                        {formatAuditRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
        <button
          type="button"
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={isLoading || pagination.page <= 1}
          className="min-h-9 rounded-xl border border-white/[0.08] px-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Previous
        </button>
        <span className="text-[0.62rem] font-bold text-slate-600">
          Showing up to 25 records
        </span>
        <button
          type="button"
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={
            isLoading || pagination.page >= pagination.totalPages
          }
          className="min-h-9 rounded-xl border border-white/[0.08] px-3 text-xs font-black text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
        </button>
      </footer>
    </section>
  );
}
