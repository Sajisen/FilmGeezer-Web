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
    <div className="space-y-3 p-4" aria-label="Loading support requests">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="skeleton-placeholder h-32 rounded-2xl"
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
    <aside className="overflow-hidden rounded-2xl border border-white/9 bg-slate-900/62 shadow-lg shadow-black/10">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-4 sm:px-5">
        <div>
          <p className="text-sm font-black text-white">Requests</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {totalItems} matching request{totalItems === 1 ? "" : "s"}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-slate-950/40 px-2.5 py-1 text-xs font-black text-slate-400">
          {page}/{totalPages}
        </span>
      </div>

      {isLoading ? (
        <LoadingList />
      ) : errorMessage ? (
        <p className="m-4 rounded-xl border border-red-300/20 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-100">
          {errorMessage}
        </p>
      ) : items.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-sm font-black text-white">No requests found</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Change the queue filters or search for another reference.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/7">
          {items.map((item) => {
            const selected = item.referenceId === selectedReferenceId;

            return (
              <button
                key={item.referenceId}
                type="button"
                onClick={() => onSelect(item.referenceId)}
                className={`block w-full px-4 py-4 text-left transition sm:px-5 ${
                  selected
                    ? "bg-sky-400/[0.09]"
                    : "hover:bg-white/[0.025]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-black leading-5 text-white">
                      {item.subject}
                    </p>
                    <p className="mt-1 truncate text-xs font-bold text-sky-300">
                      {item.referenceId}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[0.67rem] font-black ${getSupportStatusClasses(
                      item.status,
                    )}`}
                  >
                    {SUPPORT_STATUS_LABELS[item.status]}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                  {item.preview}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem] font-bold text-slate-500">
                  <span>{SUPPORT_CATEGORY_LABELS[item.category]}</span>
                  <span aria-hidden="true">•</span>
                  <span>
                    {item.requester.linkedToAccount ? "Account" : "Guest"}
                  </span>
                  <span aria-hidden="true">•</span>
                  <span>{formatAdminShortDate(item.lastMessageAt)}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-white/8 p-4">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
          className="min-h-9 rounded-full border border-white/10 px-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
          className="min-h-9 rounded-full border border-white/10 px-3 text-xs font-black text-slate-300 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-35"
        >
          Next
        </button>
      </div>
    </aside>
  );
}
