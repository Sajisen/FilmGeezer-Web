import {
  CONTACT_CATEGORY_LABELS,
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

function ConversationActionIcon({
  selected,
}: {
  selected: boolean;
}) {
  return selected ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
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
      aria-hidden="true"
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
  );
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
    const skeletonCount = compact ? 3 : 5;

    return (
      <div aria-live="polite" className="space-y-2">
        <p className="sr-only">Loading recent support requests…</p>
        {Array.from({ length: skeletonCount }, (_, item) => (
          <div
            key={item}
            className={`skeleton-placeholder rounded-2xl ${
              compact ? "h-[5.1rem]" : "h-[5.35rem]"
            }`}
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
          className="mt-3 min-h-10 rounded-full border border-red-200/20 px-4 text-sm font-bold text-red-100 transition hover:bg-red-300/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
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
    <div className={compact ? "space-y-2" : "space-y-2"}>
      {conversations.map((conversation) => {
        const selected =
          selectedReferenceId === conversation.referenceId;
        const status =
          CONTACT_STATUS_PRESENTATION[conversation.status];

        if (compact) {
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
              className={`group grid w-full grid-cols-[minmax(0,1fr)_2rem] items-center gap-3 rounded-2xl border p-3.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                selected
                  ? "border-sky-300/40 bg-sky-400/12 shadow-sm shadow-sky-950/30"
                  : "border-white/10 bg-slate-900/55 hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <span className="min-w-0">
                <span className="flex min-w-0 items-start justify-between gap-2">
                  <span className="line-clamp-2 min-w-0 [overflow-wrap:anywhere] text-sm font-bold leading-5 text-white">
                    {conversation.subject}
                  </span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.63rem] font-bold ${status.className}`}
                  >
                    {status.label}
                  </span>
                </span>

                <span className="mt-1.5 flex min-w-0 items-center justify-between gap-2 text-[0.68rem] font-semibold text-slate-500">
                  <span className="min-w-0 truncate">
                    {CONTACT_CATEGORY_LABELS[conversation.category]}
                  </span>
                  <time
                    dateTime={conversation.lastMessageAt}
                    className="shrink-0"
                  >
                    {formatContactDate(conversation.lastMessageAt)}
                  </time>
                </span>

                <code className="mt-1.5 block truncate text-[0.66rem] font-semibold text-sky-300/80">
                  {conversation.referenceId}
                </code>
              </span>

              <span
                aria-hidden="true"
                className={`grid h-8 w-8 shrink-0 place-items-center self-center rounded-full border transition ${
                  selected
                    ? "border-sky-300/25 bg-sky-400/15 text-sky-100"
                    : "border-white/10 text-slate-500 group-hover:text-slate-200"
                }`}
              >
                <ConversationActionIcon selected={selected} />
              </span>
            </button>
          );
        }

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
            className={`group grid min-h-[5.35rem] w-full grid-cols-[minmax(0,1fr)_2rem] items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
              selected
                ? "border-sky-300/40 bg-sky-400/12 shadow-sm shadow-sky-950/30"
                : "border-white/10 bg-slate-950/28 hover:border-white/20 hover:bg-white/[0.04]"
            }`}
          >
            <span className="min-w-0">
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span className="truncate text-[0.66rem] font-bold uppercase tracking-[0.08em] text-slate-500">
                  {CONTACT_CATEGORY_LABELS[conversation.category]}
                </span>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[0.61rem] font-bold ${status.className}`}
                >
                  {status.label}
                </span>
              </span>

              <span className="mt-1 block h-10 line-clamp-2 [overflow-wrap:anywhere] text-sm font-bold leading-5 text-white">
                {conversation.subject}
              </span>

              <span className="mt-1 flex min-w-0 items-center justify-between gap-2 text-[0.63rem] font-semibold">
                <code className="min-w-0 truncate text-sky-300/80">
                  {conversation.referenceId}
                </code>
                <time
                  dateTime={conversation.lastMessageAt}
                  className="shrink-0 text-slate-500"
                >
                  {formatContactDate(conversation.lastMessageAt)}
                </time>
              </span>
            </span>

            <span
              aria-hidden="true"
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition ${
                selected
                  ? "border-sky-300/25 bg-sky-400/15 text-sky-100"
                  : "border-white/10 text-slate-500 group-hover:border-white/20 group-hover:text-slate-200"
              }`}
            >
              <ConversationActionIcon selected={selected} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default ContactConversationList;
