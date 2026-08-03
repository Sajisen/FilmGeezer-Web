import {
  useState,
  type FormEvent,
} from "react";

import { copyTextToClipboard } from "../../../utils/copyTextToClipboard";
import type {
  AdminSupportConversationThread,
  AdminSupportStatus,
} from "../../types/admin";
import {
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUS_LABELS,
  formatAdminDate,
  getSupportStatusClasses,
} from "../supportPresentation";

interface AdminSupportConversationPanelProps {
  thread: AdminSupportConversationThread | null;
  isLoading: boolean;
  errorMessage: string | null;
  mutationMessage: string | null;
  isMutating: boolean;
  onRefresh: () => void;
  onReply: (message: string) => Promise<boolean>;
  onStatusChange: (status: AdminSupportStatus) => Promise<void>;
}

function ThreadSkeleton() {
  return (
    <div className="space-y-4 p-5 sm:p-6" aria-label="Loading support conversation">
      <div className="skeleton-placeholder h-24 rounded-2xl" />
      <div className="skeleton-placeholder ml-auto h-28 w-[78%] rounded-2xl" />
      <div className="skeleton-placeholder h-24 w-[72%] rounded-2xl" />
      <div className="skeleton-placeholder h-32 rounded-2xl" />
    </div>
  );
}

export default function AdminSupportConversationPanel({
  thread,
  isLoading,
  errorMessage,
  mutationMessage,
  isMutating,
  onRefresh,
  onReply,
  onStatusChange,
}: AdminSupportConversationPanelProps) {
  const [reply, setReply] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copy reference");

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitted = await onReply(reply);

    if (submitted) {
      setReply("");
    }
  }

  if (isLoading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-white/9 bg-slate-900/62 shadow-lg shadow-black/10">
        <ThreadSkeleton />
      </section>
    );
  }

  if (errorMessage && !thread) {
    return (
      <section className="rounded-2xl border border-red-300/20 bg-red-400/[0.07] p-6 text-sm leading-6 text-red-100">
        <p>{errorMessage}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-4 min-h-10 rounded-full border border-red-200/20 px-4 font-black transition hover:bg-red-300/10"
        >
          Try again
        </button>
      </section>
    );
  }

  if (!thread) {
    return (
      <section className="grid min-h-[32rem] place-items-center rounded-2xl border border-dashed border-white/12 bg-slate-900/35 px-6 text-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-sky-300">
            Conversation review
          </p>
          <h2 className="mt-3 text-2xl font-black text-white">
            Select a support request
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Choose a request from the queue to review its requester, messages,
            delivery route, and current operational status.
          </p>
        </div>
      </section>
    );
  }

  const { conversation } = thread;
  const replyAvailable =
    thread.delivery.available && conversation.status !== "spam";

  return (
    <section className="overflow-hidden rounded-2xl border border-white/9 bg-slate-900/62 shadow-lg shadow-black/10">
      <header className="border-b border-white/8 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-black ${getSupportStatusClasses(
                  conversation.status,
                )}`}
              >
                {SUPPORT_STATUS_LABELS[conversation.status]}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[0.68rem] font-black text-slate-400">
                {SUPPORT_CATEGORY_LABELS[conversation.category]}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-[0.68rem] font-black text-slate-400">
                {conversation.requester.linkedToAccount
                  ? "Signed-in account"
                  : "Guest request"}
              </span>
            </div>

            <h2 className="mt-3 break-words text-xl font-black leading-tight text-white sm:text-2xl">
              {conversation.subject}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="font-black text-sky-300">
                {conversation.referenceId}
              </span>
              <span>{conversation.messageCount} messages</span>
              <span>Updated {formatAdminDate(conversation.lastMessageAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <button
              type="button"
              onClick={async () => {
                const copied = await copyTextToClipboard(
                  conversation.referenceId,
                );
                setCopyLabel(copied ? "Copied" : "Copy failed");
                window.setTimeout(() => setCopyLabel("Copy reference"), 1_600);
              }}
              className="min-h-10 rounded-full border border-white/10 px-4 text-xs font-black text-slate-300 transition hover:bg-white/[0.04] hover:text-white"
            >
              {copyLabel}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isMutating}
              className="min-h-10 rounded-full border border-white/10 px-4 text-xs font-black text-slate-300 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-white/8 bg-slate-950/30 p-4 sm:grid-cols-2">
          <div>
            <p className="text-[0.67rem] font-black uppercase tracking-[0.18em] text-slate-600">
              Requester
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {conversation.requester.name}
            </p>
            <p className="mt-1 break-all text-xs text-slate-400">
              {conversation.requester.email}
            </p>
          </div>
          <div>
            <p className="text-[0.67rem] font-black uppercase tracking-[0.18em] text-slate-600">
              Reply delivery
            </p>
            <p className="mt-1 text-sm font-black text-white">
              {thread.delivery.channel === "in-app"
                ? "FilmGeezer conversation"
                : "Email required"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {thread.delivery.message}
            </p>
          </div>
        </div>
      </header>

      <div className="border-b border-white/8 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2" aria-label="Support request status">
          {(["new", "in-review", "resolved"] as const).map((status) => (
            <button
              key={status}
              type="button"
              disabled={isMutating || conversation.status === status}
              onClick={() => void onStatusChange(status)}
              className={`min-h-9 rounded-full border px-3.5 text-xs font-black transition disabled:cursor-not-allowed ${
                conversation.status === status
                  ? getSupportStatusClasses(status)
                  : "border-white/10 text-slate-400 hover:bg-white/[0.04] hover:text-white disabled:opacity-55"
              }`}
            >
              {SUPPORT_STATUS_LABELS[status]}
            </button>
          ))}
          <button
            type="button"
            disabled={isMutating || conversation.status === "spam"}
            onClick={() => void onStatusChange("spam")}
            className="min-h-9 rounded-full border border-red-300/15 px-3.5 text-xs font-black text-red-200 transition hover:bg-red-400/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
          >
            Mark spam
          </button>
        </div>
      </div>

      {(errorMessage || mutationMessage) && (
        <div className="mx-5 mt-5 space-y-3 sm:mx-6">
          {errorMessage && (
            <p className="rounded-xl border border-red-300/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-100">
              {errorMessage}
            </p>
          )}
          {mutationMessage && (
            <p className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] px-4 py-3 text-sm text-emerald-100">
              {mutationMessage}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4 px-5 py-6 sm:px-6">
        {thread.messages.map((message) => {
          const fromAdmin = message.senderRole === "admin";

          return (
            <article
              key={message.id}
              className={`max-w-[86%] rounded-2xl border px-4 py-3 ${
                fromAdmin
                  ? "ml-auto border-sky-300/20 bg-sky-400/10"
                  : "border-white/9 bg-slate-950/40"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black text-white">
                  {fromAdmin ? "FilmGeezer support" : conversation.requester.name}
                </p>
                <time className="text-[0.68rem] text-slate-500">
                  {formatAdminDate(message.createdAt)}
                </time>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-300">
                {message.body}
              </p>
            </article>
          );
        })}
      </div>

      <footer className="border-t border-white/8 bg-slate-950/20 p-5 sm:p-6">
        {replyAvailable ? (
          <form onSubmit={(event) => void handleReply(event)}>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="admin-support-reply" className="text-sm font-black text-white">
                Reply as FilmGeezer support
              </label>
              <span className="text-xs text-slate-600">{reply.length}/3000</span>
            </div>
            <textarea
              id="admin-support-reply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={4}
              maxLength={3_000}
              placeholder="Write a clear response for the requester…"
              className="mt-3 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/40 focus:ring-2 focus:ring-sky-400/10"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={isMutating || reply.trim().length < 2}
                className="min-h-11 rounded-full bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {isMutating ? "Saving…" : "Send reply"}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-amber-300/18 bg-amber-300/[0.05] p-4">
            <p className="text-sm font-black text-amber-100">
              {conversation.status === "spam"
                ? "Replies are disabled while this request is marked as spam."
                : "Guest email delivery is not configured yet."}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {conversation.status === "spam"
                ? "Restore the request to New or In review before responding."
                : "You may review and classify this request, but do not create a response that the guest cannot receive. Transactional email is a later production milestone."}
            </p>
          </div>
        )}
      </footer>
    </section>
  );
}
