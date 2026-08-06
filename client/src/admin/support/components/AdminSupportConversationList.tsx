import AdminIcon from "../../components/AdminIcon";
import type {
  AdminSupportConversationSummary,
} from "../../types/admin";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  formatAdminShortDate,
  getSupportStatusClasses,
} from "../supportPresentation";

interface AdminSupportConversationListProps {
  items: AdminSupportConversationSummary[];
  selectedReferenceId: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  page: number;
  totalPages: number;
  totalItems: number;
  onSelect: (referenceId: string) => void;
  onPageChange: (page: number) => void;
}

function LoadingList() {
  return (
    <div className="space-y-2.5 p-3.5" aria-label="Loading support requests">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="skeleton-placeholder h-[8.25rem] rounded-2xl"
        />
      ))}
    </div>
  );
}

export default function AdminSupportConversationList({
  items,
  selectedReferenceId,
  isLoading,
  errorMessage,
  page,
  totalPages,
  totalItems,
  onSelect,
  onPageChange,
}: AdminSupportConversationListProps) {
  return (
    <aside className="overflow-hidden rounded-[1.5rem] border border-white/[0.075] bg-slate-900/55 shadow-xl shadow-black/[0.08]">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-slate-950/35 text-slate-400">
            <AdminIcon name="inbox" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-black text-white">Request queue</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {totalItems} matching request{totalItems === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <span className="rounded-xl border border-white/[0.07] bg-slate-950/35 px-2.5 py-1.5 text-[0.68rem] font-black text-slate-400">
          {page}/{totalPages}
        </span>
      </div>

      {isLoading ? (
        <LoadingList />
      ) : errorMessage ? (
        <div className="p-4">
          <div className="rounded-2xl border border-red-300/15 bg-red-400/[0.06] px-4 py-4 text-sm leading-6 text-red-100">
            <div className="flex items-start gap-3">
              <AdminIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/[0.07] bg-slate-950/35 text-slate-600">
            <AdminIcon name="search" className="h-5 w-5" />
          </span>
          <p className="mt-4 text-sm font-black text-white">No requests found</p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
            Change the queue filters or search for another reference.
          </p>
        </div>
      ) : (
        <div className="admin-support-list-scrollbar max-h-[calc(100vh-16rem)] space-y-1 overflow-y-auto p-2.5 xl:max-h-[calc(100vh-13rem)]">
          {items.map((item) => {
            const selected = item.referenceId === selectedReferenceId;

            return (
              <button
                key={item.referenceId}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(item.referenceId)}
                className={`group relative block w-full overflow-hidden rounded-2xl border px-3.5 py-3.5 text-left transition duration-200 sm:px-4 ${
                  selected
                    ? "border-sky-300/15 bg-sky-400/[0.085] shadow-lg shadow-sky-950/10"
                    : "border-transparent hover:border-white/[0.065] hover:bg-white/[0.025]"
                }`}
              >
                {selected ? (
                  <span className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-sky-300" />
                ) : null}

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-black leading-5 text-white">
                      {item.subject}
                    </p>
                    <p className="mt-1 truncate text-[0.68rem] font-black uppercase tracking-[0.1em] text-sky-300">
                      {item.referenceId}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.62rem] font-black ${getSupportStatusClasses(
                      item.status,
                    )}`}
                  >
                    {SUPPORT_STATUS_LABELS[item.status]}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                  {item.preview}
                </p>

                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.045] pt-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.68rem] font-bold text-slate-400">
                      {item.requester.name}
                    </p>
                    <p className="mt-0.5 truncate text-[0.62rem] text-slate-600">
                      {SUPPORT_CATEGORY_LABELS[item.category]} · {item.requester.linkedToAccount ? "Account" : "Guest"}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[0.64rem] font-bold text-slate-600">
                    <AdminIcon name="clock" className="h-3.5 w-3.5" />
                    {formatAdminShortDate(item.lastMessageAt)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] p-3.5">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-white/[0.07] bg-slate-950/25 px-3 text-xs font-black text-slate-400 transition hover:border-white/[0.13] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          <AdminIcon
            name="chevronRight"
            className="h-3.5 w-3.5 rotate-180"
          />
          Previous
        </button>
        <p className="text-[0.68rem] font-bold text-slate-600">
          Page {page} of {totalPages}
        </p>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-white/[0.07] bg-slate-950/25 px-3 text-xs font-black text-slate-400 transition hover:border-white/[0.13] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
          <AdminIcon name="chevronRight" className="h-3.5 w-3.5" />
        </button>
      </div>
    </aside>
  );
}
