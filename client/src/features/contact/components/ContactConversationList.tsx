import {
  CONTACT_STATUS_PRESENTATION,
  formatContactDate,
} from "../contactPresentation";

import type {
  ContactConversationSummary,
} from "../../../types/contact";

interface ContactConversationListProps {
  conversations: ContactConversationSummary[];
  selectedReferenceId: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  onSelect: (referenceId: string) => void;
  onRetry: () => void;
  compact?: boolean;
}

function ContactConversationList({
  conversations,
  selectedReferenceId,
  isLoading,
  errorMessage,
  onSelect,
  onRetry,
  compact = false,
}: ContactConversationListProps) {
  if (isLoading) {
    return (
      <div aria-live="polite" className="space-y-2">
        <p className="sr-only">Loading recent support requests…</p>
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="skeleton-placeholder h-[5.7rem] rounded-2xl"
          />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-2xl border border-red-300/20 bg-red-400/[0.07] p-4">
        <p className="text-sm leading-6 text-red-100">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-10 rounded-full border border-red-200/20 px-4 text-sm font-bold text-red-100 transition hover:bg-red-300/10 focus:outline-none focus:ring-2 focus:ring-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  if (conversations.length === 0) {
    return null;
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-2.5"}>
      {conversations.map((conversation) => {
        const selected =
          selectedReferenceId === conversation.referenceId;
        const status =
          CONTACT_STATUS_PRESENTATION[conversation.status];

        return (
          <button
            key={conversation.referenceId}
            type="button"
            aria-pressed={selected}
            title={
              selected
                ? "Close this conversation and return to the form"
                : "Open this conversation"
            }
            onClick={() => onSelect(conversation.referenceId)}
            className={`group w-full rounded-2xl border p-3.5 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-300 ${
              selected
                ? "border-sky-300/40 bg-sky-400/12 shadow-sm shadow-sky-950/30"
                : "border-white/10 bg-slate-900/55 hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-bold text-white">
                    {conversation.subject}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.63rem] font-bold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-400">
                  {conversation.preview}
                </p>

                <div className="mt-2 flex min-w-0 items-center justify-between gap-2 text-[0.66rem] font-semibold text-slate-500">
                  <code className="min-w-0 truncate text-sky-300/80">
                    {conversation.referenceId}
                  </code>
                  <span className="shrink-0">
                    {formatContactDate(conversation.lastMessageAt)}
                  </span>
                </div>
              </div>

              <span
                aria-hidden="true"
                className={`mt-7 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition ${
                  selected
                    ? "border-sky-300/25 bg-sky-400/15 text-sky-100"
                    : "border-white/10 text-slate-500 group-hover:text-slate-200"
                }`}
              >
                {selected ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                  >
                    <path
                      d="M7 7l10 10M17 7L7 17"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default ContactConversationList;
