import {
  useState,
  type FormEvent,
} from "react";

import { copyTextToClipboard } from "../../../utils/copyTextToClipboard";
import AdminIcon from "../../components/AdminIcon";
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
      <div className="skeleton-placeholder h-28 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="skeleton-placeholder h-24 rounded-2xl" />
        <div className="skeleton-placeholder h-24 rounded-2xl" />
      </div>
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
      <section className="overflow-hidden rounded-[1.5rem] border border-white/[0.075] bg-slate-900/55 shadow-xl shadow-black/[0.08]">
        <ThreadSkeleton />
      </section>
    );
  }

  if (errorMessage && !thread) {
    return (
      <section className="rounded-[1.5rem] border border-red-300/15 bg-red-400/[0.06] p-6 text-sm leading-6 text-red-100 shadow-xl shadow-black/[0.08]">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-red-300/15 bg-red-400/10">
            <AdminIcon name="alert" className="h-4 w-4" />
          </span>
          <div>
            <p className="font-black">Conversation unavailable</p>
            <p className="mt-1 text-red-100/80">{errorMessage}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200/20 px-4 text-xs font-black transition hover:bg-red-300/10"
        >
          <AdminIcon name="refresh" className="h-4 w-4" />
          Try again
        </button>
      </section>
    );
  }

  if (!thread) {
    return (
      <section className="relative grid min-h-[35rem] place-items-center overflow-hidden rounded-[1.5rem] border border-dashed border-white/[0.1] bg-slate-900/35 px-6 text-center shadow-xl shadow-black/[0.06]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/[0.055] blur-3xl"
        />
        <div className="relative">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-sky-300/15 bg-sky-400/[0.08] text-sky-200">
            <AdminIcon name="mail" className="h-6 w-6" />
          </span>
          <p className="mt-5 text-[0.66rem] font-black uppercase tracking-[0.22em] text-sky-300">
            Conversation review
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            Select a support request
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
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
    <section className="overflow-hidden rounded-[1.5rem] border border-white/[0.075] bg-slate-900/55 shadow-xl shadow-black/[0.08]">
      <header className="relative overflow-hidden border-b border-white/[0.06] px-5 py-5 sm:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-sky-400/[0.055] blur-3xl"
        />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[0.62rem] font-black ${getSupportStatusClasses(
                  conversation.status,
                )}`}
              >
                {SUPPORT_STATUS_LABELS[conversation.status]}
              </span>
              <span className="rounded-full border border-white/[0.07] bg-slate-950/30 px-2.5 py-1 text-[0.62rem] font-black text-slate-400">
                {SUPPORT_CATEGORY_LABELS[conversation.category]}
              </span>
              <span className="rounded-full border border-white/[0.07] bg-slate-950/30 px-2.5 py-1 text-[0.62rem] font-black text-slate-400">
                {conversation.requester.linkedToAccount
                  ? "Signed-in account"
                  : "Guest request"}
              </span>
            </div>

            <h2 className="mt-3 break-words text-xl font-black leading-tight tracking-tight text-white sm:text-2xl">
              {conversation.subject}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="font-black uppercase tracking-[0.08em] text-sky-300">
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
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-slate-950/25 px-3.5 text-xs font-black text-slate-300 transition hover:border-white/[0.14] hover:text-white"
            >
              <AdminIcon name="copy" className="h-3.5 w-3.5" />
              {copyLabel}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              disabled={isMutating}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-slate-950/25 px-3.5 text-xs font-black text-slate-300 transition hover:border-white/[0.14] hover:text-white disabled:opacity-50"
            >
              <AdminIcon name="refresh" className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.06] bg-slate-950/30 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-400/[0.08] text-sky-200">
                <AdminIcon name="users" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-600">
                  Requester
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {conversation.requester.name}
                </p>
                <p className="mt-1 break-all text-xs text-slate-400">
                  {conversation.requester.email}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-slate-950/30 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-400/[0.08] text-violet-200">
                <AdminIcon name="send" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-600">
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
          </div>
        </div>
      </header>

      <div className="border-b border-white/[0.06] bg-slate-950/15 p-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[0.62rem] font-black uppercase tracking-[0.16em] text-slate-600">
              Request status
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Status changes are recorded in the administrator audit log.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Support request status">
            {(["new", "in-review", "resolved"] as const).map((status) => (
              <button
                key={status}
                type="button"
                disabled={isMutating || conversation.status === status}
                onClick={() => void onStatusChange(status)}
                className={`min-h-9 rounded-xl border px-3.5 text-xs font-black transition disabled:cursor-not-allowed ${
                  conversation.status === status
                    ? getSupportStatusClasses(status)
                    : "border-white/[0.07] bg-slate-950/25 text-slate-500 hover:border-white/[0.13] hover:text-white disabled:opacity-55"
                }`}
              >
                {SUPPORT_STATUS_LABELS[status]}
              </button>
            ))}
            <button
              type="button"
              disabled={isMutating || conversation.status === "spam"}
              onClick={() => void onStatusChange("spam")}
              className="min-h-9 rounded-xl border border-red-300/12 bg-red-400/[0.035] px-3.5 text-xs font-black text-red-200 transition hover:border-red-300/20 hover:bg-red-400/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Mark spam
            </button>
          </div>
        </div>
      </div>

      {(errorMessage || mutationMessage) ? (
        <div className="mx-5 mt-5 space-y-3 sm:mx-6">
          {errorMessage ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-300/15 bg-red-400/[0.06] px-4 py-3 text-sm text-red-100">
              <AdminIcon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          ) : null}
          {mutationMessage ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-100">
              <AdminIcon name="check" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{mutationMessage}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="admin-support-thread-scrollbar max-h-[38rem] space-y-4 overflow-y-auto px-5 py-6 sm:px-6">
        {thread.messages.map((message) => {
          const fromAdmin = message.senderRole === "admin";

          return (
            <article
              key={message.id}
              className={`max-w-[92%] rounded-2xl border px-4 py-3 sm:max-w-[84%] ${
                fromAdmin
                  ? "ml-auto border-sky-300/15 bg-sky-400/[0.075]"
                  : "border-white/[0.07] bg-slate-950/35"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className={`text-xs font-black ${fromAdmin ? "text-sky-100" : "text-white"}`}>
                  {fromAdmin ? "FilmGeezer support" : conversation.requester.name}
                </p>
                <time className="text-[0.64rem] text-slate-600">
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

      <footer className="border-t border-white/[0.06] bg-slate-950/20 p-5 sm:p-6">
        {replyAvailable ? (
          <form onSubmit={(event) => void handleReply(event)}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <label
                  htmlFor="admin-support-reply"
                  className="text-sm font-black text-white"
                >
                  Reply as FilmGeezer support
                </label>
                <p className="mt-1 text-xs text-slate-500">
                  The signed-in requester will see this inside their Contact history.
                </p>
              </div>
              <span className="shrink-0 text-xs font-bold text-slate-600">
                {reply.length}/3000
              </span>
            </div>
            <textarea
              id="admin-support-reply"
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={4}
              maxLength={3_000}
              placeholder="Write a clear, actionable response for the requester…"
              className="mt-3 w-full resize-y rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 hover:border-white/[0.12] focus:border-sky-300/35 focus:ring-2 focus:ring-sky-400/10"
            />
            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={isMutating || reply.trim().length < 2}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-500 px-5 text-sm font-black text-white shadow-lg shadow-sky-950/20 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <AdminIcon name="send" className="h-4 w-4" />
                {isMutating ? "Saving…" : "Send reply"}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.045] p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-400/[0.08] text-amber-200">
                <AdminIcon name="alert" className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-black text-amber-100">
                  {conversation.status === "spam"
                    ? "Replies are disabled while this request is marked as spam."
                    : "Guest email delivery is not configured yet."}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {conversation.status === "spam"
                    ? "Restore the request to New or In review before responding."
                    : "You may review and classify this request, but FilmGeezer will not create a response the guest cannot receive. Transactional email remains a later production milestone."}
                </p>
              </div>
            </div>
          </div>
        )}
      </footer>
    </section>
  );
}
