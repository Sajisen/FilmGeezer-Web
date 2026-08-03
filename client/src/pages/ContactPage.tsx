import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

import {
  ContactApiError,
  getContactConversation,
  getContactConversations,
} from "../services/contactService";

import { useAuth } from "../features/auth/authContext";
import { createAuthRouteState } from "../features/auth/authNavigation";

import ContactComposer from "../features/contact/components/ContactComposer";
import ContactConversationList from "../features/contact/components/ContactConversationList";
import ContactConversationView from "../features/contact/components/ContactConversationView";
import ContactGuestSuccess from "../features/contact/components/ContactGuestSuccess";
import ContactPageSkeleton from "../features/contact/components/ContactPageSkeleton";

import {
  clearContactDraft,
  createEmptyContactDraft,
  readContactDraft,
  saveContactDraft,
} from "../features/contact/contactDraft";

import type {
  ContactComposerDraft,
  ContactConversationDetails,
  ContactConversationSummary,
  ContactSubmissionResponse,
} from "../types/contact";

function ContactBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M5 6.5h14v9H9l-4 3v-12z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 10h7M8.5 13h4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ContactPage() {
  const { status, user, csrfToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [draft, setDraft] = useState<ContactComposerDraft>(
    () => readContactDraft() ?? createEmptyContactDraft(),
  );

  const [conversations, setConversations] = useState<
    ContactConversationSummary[]
  >([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasResolvedInitialHistory, setHasResolvedInitialHistory] =
    useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(
    null,
  );
  const [conversation, setConversation] =
    useState<ContactConversationDetails | null>(null);
  const [isConversationLoading, setIsConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(
    null,
  );
  const [conversationSuccess, setConversationSuccess] = useState<string | null>(
    null,
  );
  const [guestSubmission, setGuestSubmission] =
    useState<ContactSubmissionResponse | null>(null);

  const conversationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("contact-page-scrollbar");

    return () => {
      document.documentElement.classList.remove("contact-page-scrollbar");
    };
  }, []);

  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await getContactConversations(signal);

      if (!signal?.aborted) {
        setConversations(response.conversations);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (!signal?.aborted) {
        setHistoryError(
          error instanceof ContactApiError
            ? error.message
            : "FilmGeezer could not load your recent requests.",
        );
      }
    } finally {
      if (!signal?.aborted) {
        setIsHistoryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      if (status === "authenticated") {
        setHasResolvedInitialHistory(false);

        void loadHistory(controller.signal).finally(() => {
          if (!controller.signal.aborted) {
            setHasResolvedInitialHistory(true);
          }
        });
        return;
      }

      setConversations([]);
      setHistoryError(null);
      setIsHistoryLoading(false);
      setHasResolvedInitialHistory(status !== "loading");
      setSelectedReferenceId(null);
      setConversation(null);
      setConversationError(null);
      setConversationSuccess(null);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadHistory, status, user?.userId]);

  useEffect(() => {
    return () => {
      conversationAbortRef.current?.abort();
    };
  }, []);

  const openConversation = useCallback(
    async (referenceId: string, successMessage: string | null = null) => {
      conversationAbortRef.current?.abort();
      const controller = new AbortController();
      conversationAbortRef.current = controller;

      setSelectedReferenceId(referenceId);
      setGuestSubmission(null);
      setConversation(null);
      setConversationError(null);
      setConversationSuccess(successMessage);
      setIsConversationLoading(true);

      try {
        const response = await getContactConversation(
          referenceId,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setConversation({
            conversation: response.conversation,
            messages: response.messages,
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        if (!controller.signal.aborted) {
          setConversationError(
            error instanceof ContactApiError
              ? error.message
              : "FilmGeezer could not load this support request.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsConversationLoading(false);
        }
      }
    },
    [],
  );

  function showComposer() {
    conversationAbortRef.current?.abort();
    setSelectedReferenceId(null);
    setConversation(null);
    setConversationError(null);
    setConversationSuccess(null);
    setIsConversationLoading(false);
    setGuestSubmission(null);
  }

  function startNewRequest() {
    showComposer();
    clearContactDraft();
    setDraft(createEmptyContactDraft());
  }

  function handleConversationSelection(referenceId: string) {
    if (selectedReferenceId === referenceId) {
      showComposer();
      return;
    }

    void openConversation(referenceId);
  }

  function requestAuthentication() {
    saveContactDraft(draft);

    navigate("/login", {
      state: createAuthRouteState(location),
    });
  }

  async function handleSubmitted(response: ContactSubmissionResponse) {
    clearContactDraft();
    setDraft(createEmptyContactDraft());

    if (status === "authenticated" && response.linkedToAccount) {
      await loadHistory();
      await openConversation(
        response.referenceId,
        "Request sent and saved to your account.",
      );
      return;
    }

    setGuestSubmission(response);
    setSelectedReferenceId(null);
    setConversation(null);
    setConversationError(null);
    setConversationSuccess(null);
  }

  async function handleConversationUpdated(
    nextConversation: ContactConversationDetails,
    message: string | null,
  ) {
    setConversation(nextConversation);
    setConversationSuccess(message);
    await loadHistory();
  }

  const shouldShowHistory =
    status === "authenticated" &&
    (isHistoryLoading || Boolean(historyError) || conversations.length > 0);

  const showDesktopSidebar = shouldShowHistory || status === "guest";

  const workspace = selectedReferenceId ? (
    <ContactConversationView
      conversation={conversation}
      isLoading={isConversationLoading}
      errorMessage={conversationError}
      successMessage={conversationSuccess}
      csrfToken={csrfToken}
      onRetry={() => void openConversation(selectedReferenceId)}
      onRefresh={() => void openConversation(selectedReferenceId)}
      onStartNew={startNewRequest}
      onConversationUpdated={handleConversationUpdated}
    />
  ) : guestSubmission ? (
    <ContactGuestSuccess
      submission={guestSubmission}
      onStartAnother={startNewRequest}
    />
  ) : (
    <ContactComposer
      authStatus={status}
      user={user}
      draft={draft}
      onDraftChange={setDraft}
      onRequestAuthentication={requestAuthentication}
      onSubmitted={handleSubmitted}
    />
  );

  const workspaceLabel = selectedReferenceId
    ? "Viewing support request"
    : guestSubmission
      ? "Guest request sent"
      : "Create a support request";

  const showPageSkeleton =
    status === "loading" ||
    (status === "authenticated" && !hasResolvedInitialHistory);

  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-x-clip bg-slate-950 py-8 text-white sm:py-11"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_12%_4%,rgba(14,165,233,0.16),transparent_36%),radial-gradient(circle_at_88%_2%,rgba(79,70,229,0.12),transparent_30%)]" />

      <div className="relative mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8">
        {showPageSkeleton ? (
          <ContactPageSkeleton />
        ) : (
          <>
            <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/58 shadow-xl shadow-black/20 backdrop-blur-xl">
              <div className="px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-sky-300">
                  <ContactBadgeIcon />
                  Contact FilmGeezer
                </div>

                <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
                  Tell us what needs attention.
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
                  Report a problem, ask for help, or share an idea. Signed-in
                  requests stay connected to your account.
                </p>

                <details className="group mt-5 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 sm:px-5">
                  <summary className="flex cursor-pointer list-none items-center gap-2.5 text-sm font-bold text-white transition hover:text-sky-200 focus:outline-none focus-visible:text-sky-200 group-open:text-sky-200 [&::-webkit-details-marker]:hidden">
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-90"
                    >
                      <path
                        d="M7 4l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <span>Before you send</span>
                  </summary>

                  <div className="mt-3 grid gap-3 border-t border-white/8 pt-3 text-xs leading-5 text-slate-400 sm:grid-cols-2 sm:gap-6">
                    <div>
                      <p className="font-bold text-slate-200">
                        Protect private details
                      </p>
                      <p className="mt-1">
                        Never include passwords, verification codes, session
                        tokens, payment details, or private links.
                      </p>
                    </div>

                    <div>
                      <p className="font-bold text-slate-200">
                        {status === "authenticated"
                          ? "Your support history"
                          : "Guest support"}
                      </p>

                      <p className="mt-1">
                        {status === "authenticated"
                          ? "Your requests and replies remain available inside FilmGeezer."
                          : "Guest requests are not added to FilmGeezer history. Follow-up uses the submitted email address."}
                      </p>
                    </div>

                    {status === "authenticated" && (
                      <Link
                        to="/account?section=security"
                        className="inline-flex font-bold text-sky-300 transition hover:text-sky-200 sm:col-span-2"
                      >
                        Open account security settings
                      </Link>
                    )}
                  </div>
                </details>
              </div>
            </section>

            {shouldShowHistory && (
              <details className="group mt-4 rounded-2xl border border-white/10 bg-slate-900/58 px-4 py-3 lg:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-white transition hover:text-sky-200 focus:[outline:none] focus-visible:[outline:none] group-open:text-sky-200 [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-90"
                    >
                      <path
                        d="M7 4l6 6-6 6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Recent requests</span>
                  </span>

                  {conversations.length > 0 && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[0.68rem] font-bold text-slate-400 group-open:text-sky-200">
                      {conversations.length}
                    </span>
                  )}
                </summary>
                <div className="mt-3 border-t border-white/8 pt-3">
                  <ContactConversationList
                    conversations={conversations}
                    selectedReferenceId={selectedReferenceId}
                    isLoading={isHistoryLoading}
                    errorMessage={historyError}
                    onSelect={handleConversationSelection}
                    onRetry={() => void loadHistory()}
                    compact
                  />
                </div>
              </details>
            )}

            <div
              className={`mt-7 grid min-w-0 items-start gap-6 ${
                showDesktopSidebar
                  ? "lg:grid-cols-[19.5rem_minmax(0,1fr)]"
                  : "mx-auto max-w-5xl"
              }`}
            >
              {shouldShowHistory && (
                <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
                  <section className="rounded-3xl border border-white/10 bg-slate-900/62 p-4 shadow-xl shadow-black/18 backdrop-blur-xl">
                    <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300/75">
                          Your support
                        </p>
                        <h2 className="mt-1 text-base font-black text-white">
                          Recent requests
                        </h2>
                        <p className="mt-1 text-[0.7rem] leading-5 text-slate-500">
                          Select one to open it. Select it again to return.
                        </p>
                      </div>
                      {conversations.length > 0 && (
                        <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-bold text-slate-400">
                          {conversations.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <ContactConversationList
                        conversations={conversations}
                        selectedReferenceId={selectedReferenceId}
                        isLoading={isHistoryLoading}
                        errorMessage={historyError}
                        onSelect={handleConversationSelection}
                        onRetry={() => void loadHistory()}
                      />
                    </div>
                  </section>
                </aside>
              )}

              {status === "guest" && (
                <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
                  <section className="rounded-3xl border border-sky-300/15 bg-[linear-gradient(145deg,rgba(14,165,233,0.1),rgba(15,23,42,0.72))] p-5 shadow-xl shadow-black/18">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-200">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                        className="h-6 w-6"
                      >
                        <path
                          d="M12 13a4 4 0 100-8 4 4 0 000 8zM5.5 20a6.5 6.5 0 0113 0"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <h2 className="mt-4 text-lg font-black text-white">
                      Keep support connected
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Sign in to keep request history, continue conversations,
                      and retain every support reference in FilmGeezer.
                    </p>
                    <button
                      type="button"
                      onClick={requestAuthentication}
                      className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
                    >
                      Sign in or register
                    </button>
                    <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                      Guest sending remains available for account-access issues
                      and other support needs.
                    </p>
                  </section>
                </aside>
              )}

              <section className="min-w-0">
                <div className="mb-3 flex min-h-11 items-center justify-between gap-4 px-1 lg:hidden">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300/75">
                      Support workspace
                    </p>
                    <p className="mt-0.5 text-sm font-semibold text-slate-400">
                      {workspaceLabel}
                    </p>
                  </div>

                  {(selectedReferenceId || guestSubmission) && (
                    <button
                      type="button"
                      onClick={startNewRequest}
                      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-sky-500 px-5 text-sm font-bold text-white shadow-lg shadow-sky-950/25 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
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
                  )}
                </div>

                <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/72 shadow-2xl shadow-black/25 backdrop-blur-xl">
                  {workspace}
                </div>
              </section>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default ContactPage;
