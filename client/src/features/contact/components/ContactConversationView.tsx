import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  ContactApiError,
  replyToContactConversation,
} from "../../../services/contactService";

import {
  copyTextToClipboard,
} from "../../../utils/copyTextToClipboard";

import {
  CONTACT_CATEGORY_LABELS,
  CONTACT_STATUS_PRESENTATION,
  formatContactDate,
} from "../contactPresentation";

import type {
  ContactConversationDetails,
} from "../../../types/contact";

interface ContactConversationViewProps {
  conversation: ContactConversationDetails | null;
  isLoading: boolean;
  errorMessage: string | null;
  successMessage: string | null;
  csrfToken: string | null;
  onRetry: () => void;
  onRefresh: () => void;
  onStartNew: () => void;
  onConversationUpdated: (
    conversation: ContactConversationDetails,
    message: string | null,
  ) => Promise<void>;
}

function ContactConversationView({
  conversation,
  isLoading,
  errorMessage,
  successMessage,
  csrfToken,
  onRetry,
  onRefresh,
  onStartNew,
  onConversationUpdated,
}: ContactConversationViewProps) {
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [copyState, setCopyState] = useState<
    "idle" | "copied" | "failed"
  >("idle");
  const threadScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!conversation || isLoading) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const container = threadScrollRef.current;

      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth",
        });
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [conversation, isLoading]);

  useEffect(() => {
    if (copyState === "idle") {
      return;
    }

    const timer = window.setTimeout(() => {
      setCopyState("idle");
    }, 2_200);

    return () => window.clearTimeout(timer);
  }, [copyState]);

  async function copyReference() {
    if (!conversation) {
      return;
    }

    const copied = await copyTextToClipboard(
      conversation.conversation.referenceId,
    );

    setCopyState(copied ? "copied" : "failed");
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!conversation || isReplying) {
      return;
    }

    const nextReply = reply.trim();

    if (nextReply.length < 2) {
      setReplyError("Enter a reply.");
      return;
    }

    if (!csrfToken) {
      setReplyError(
        "Your secure session is not ready. Refresh the page and try again.",
      );
      return;
    }

    setIsReplying(true);
    setReplyError(null);

    try {
      const response = await replyToContactConversation(
        conversation.conversation.referenceId,
        { message: nextReply },
        csrfToken,
      );

      setReply("");
      await onConversationUpdated(
        {
          conversation: response.conversation,
          messages: response.messages,
        },
        response.message,
      );
    } catch (error) {
      setReplyError(
        error instanceof ContactApiError
          ? error.message
          : "FilmGeezer could not add the reply.",
      );
    } finally {
      setIsReplying(false);
    }
  }

  if (isLoading) {
    return (
      <div aria-live="polite" className="space-y-4 p-5 sm:p-7">
        <p className="sr-only">Loading support conversation…</p>
        <div className="skeleton-placeholder h-20 rounded-2xl" />
        <div className="skeleton-placeholder h-72 rounded-2xl" />
        <div className="skeleton-placeholder h-24 rounded-2xl" />
      </div>
    );
  }

  if (errorMessage || !conversation) {
    return (
      <div className="flex min-h-[28rem] flex-col items-center justify-center px-5 py-10 text-center sm:px-8">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-red-300/20 bg-red-400/10 text-red-200">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-7 w-7"
          >
            <path
              d="M12 8v5M12 17h.01"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M10.2 4.9L3.9 16a2 2 0 001.75 3h12.7a2 2 0 001.75-3L13.8 4.9a2 2 0 00-3.6 0z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 className="mt-4 text-xl font-black">
          Conversation unavailable
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
          {errorMessage ?? "The support request could not be loaded."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={onRetry}
            className="min-h-10 rounded-full bg-sky-500 px-5 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={onStartNew}
            className="min-h-10 rounded-full border border-white/10 px-5 text-sm font-bold text-slate-300 transition hover:bg-white/7 hover:text-white focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            New request
          </button>
        </div>
      </div>
    );
  }

  const { conversation: details, messages } = conversation;
  const status = CONTACT_STATUS_PRESENTATION[details.status];

  return (
    <div className="flex min-h-[33rem] flex-col">
      <header className="border-b border-white/8 px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-1 text-[0.67rem] font-bold ${status.className}`}
              >
                {status.label}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[0.67rem] font-semibold text-slate-400">
                {CONTACT_CATEGORY_LABELS[details.category]}
              </span>
            </div>

            <h2
              title={details.subject}
              className="mt-2.5 line-clamp-3 [overflow-wrap:anywhere] text-xl font-black tracking-tight text-white sm:line-clamp-2 sm:text-[1.35rem]"
            >
              {details.subject}
            </h2>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <code className="font-bold text-sky-300/85">
                {details.referenceId}
              </code>
              <span>
                Started{" "}
                {formatContactDate(details.createdAt, {
                  includeTime: true,
                })}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={onStartNew}
              className="hidden min-h-9 items-center gap-2 rounded-full bg-sky-500 px-4 text-xs font-bold text-white transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 lg:inline-flex"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              New request
            </button>

            <button
              type="button"
              onClick={() => void copyReference()}
              title={
                copyState === "failed"
                  ? "Copy failed. Select the reference ID manually."
                  : "Copy support request reference"
              }
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 px-3.5 text-xs font-bold text-slate-300 transition hover:bg-white/7 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <rect
                  x="8"
                  y="8"
                  width="10"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M6 15H5a2 2 0 01-2-2V5a2 2 0 012-2h8a2 2 0 012 2v1"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
              {copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy ID"}
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 px-3.5 text-xs font-bold text-slate-300 transition hover:bg-white/7 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="h-4 w-4"
              >
                <path
                  d="M19 8a7.5 7.5 0 10.4 7"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M19 4v4h-4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {successMessage && (
          <p
            role="status"
            className="mt-3 inline-flex rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-semibold text-emerald-100"
          >
            {successMessage}
          </p>
        )}
      </header>

      <div className="flex-1 bg-slate-950/25 px-4 py-4 sm:px-6 sm:py-5">
        <div
          ref={threadScrollRef}
          className="contact-scrollbar max-h-[29rem] min-h-[15rem] space-y-3 overflow-y-auto pr-1"
        >
          {messages.map((message) => {
            const isUser = message.senderRole === "user";

            return (
              <div
                key={message.id}
                className={`flex ${
                  isUser ? "justify-end" : "justify-start"
                }`}
              >
                <article
                  className={`max-w-[91%] rounded-2xl border px-4 py-3 sm:max-w-[78%] ${
                    isUser
                      ? "rounded-br-md border-sky-300/25 bg-sky-500/15 text-sky-50"
                      : "rounded-bl-md border-white/10 bg-slate-800/85 text-slate-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.body}
                  </p>
                  <div
                    className={`mt-2 flex flex-wrap items-center gap-2 text-[0.66rem] font-semibold ${
                      isUser
                        ? "justify-end text-sky-200/65"
                        : "text-slate-500"
                    }`}
                  >
                    <span>
                      {isUser ? "You" : "FilmGeezer support"}
                    </span>
                    <span aria-hidden="true">•</span>
                    <time dateTime={message.createdAt}>
                      {formatContactDate(message.createdAt, {
                        includeTime: true,
                      })}
                    </time>
                  </div>
                </article>
              </div>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleReply}
        className="border-t border-white/8 px-5 py-4 sm:px-6"
      >
        {details.status === "resolved" && (
          <p className="mb-3 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] px-3 py-2 text-xs leading-5 text-emerald-100">
            This request is resolved. Sending a reply will reopen it for review.
          </p>
        )}

        <div className="flex items-end justify-between gap-3">
          <label
            htmlFor="contact-thread-reply"
            className="text-sm font-bold text-white"
          >
            Add a reply
          </label>
          <span
            className={`text-xs font-semibold ${
              reply.length > 2_850
                ? "text-amber-300"
                : "text-slate-500"
            }`}
          >
            {reply.length}/3000
          </span>
        </div>

        <textarea
          id="contact-thread-reply"
          rows={2}
          maxLength={3_000}
          value={reply}
          onChange={(event) => {
            setReply(event.target.value);
            setReplyError(null);
          }}
          className="contact-scrollbar mt-2 min-h-[4.75rem] max-h-36 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/50 focus:ring-2 focus:ring-sky-300/20"
          placeholder="Add information or reply to FilmGeezer support."
        />

        {replyError && (
          <p role="alert" className="mt-2 text-sm leading-5 text-red-300">
            {replyError}
          </p>
        )}

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-lg text-xs leading-5 text-slate-500">
            Support replies are not instant. Refresh or revisit this request to
            check for an update.
          </p>
          <button
            type="submit"
            disabled={isReplying || reply.trim().length < 2}
            className="min-h-11 shrink-0 rounded-full bg-sky-500 px-6 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isReplying ? "Sending…" : "Send reply"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ContactConversationView;
