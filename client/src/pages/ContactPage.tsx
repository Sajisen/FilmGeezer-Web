import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router";

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
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [selectedReferenceId, setSelectedReferenceId] =
    useState<string | null>(null);
  const [conversation, setConversation] =
    useState<ContactConversationDetails | null>(null);
  const [isConversationLoading, setIsConversationLoading] =
    useState(false);
  const [conversationError, setConversationError] =
    useState<string | null>(null);
  const [conversationSuccess, setConversationSuccess] =
    useState<string | null>(null);
  const [guestSubmission, setGuestSubmission] =
    useState<ContactSubmissionResponse | null>(null);

  const conversationAbortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async (signal?: AbortSignal) => {
    setIsHistoryLoading(true);
    setHistoryError(null);

    try {
      const response = await getContactConversations(signal);

      if (!signal?.aborted) {
        setConversations(response.conversations);
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
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
        void loadHistory(controller.signal);
        return;
      }

      setConversations([]);
      setHistoryError(null);
      setIsHistoryLoading(false);
      setSelectedReferenceId(null);
      setConversation(null);
      setConversationError(null);
      setConversationSuccess(null);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadHistory, status]);

  useEffect(() => {
    return () => {
      conversationAbortRef.current?.abort();
    };
  }, []);

  const openConversation = useCallback(
    async (
      referenceId: string,
      successMessage: string | null = null,
    ) => {
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
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
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

  async function handleSubmitted(
    response: ContactSubmissionResponse,
  ) {
    clearContactDraft();
    setDraft(createEmptyContactDraft());

    if (
      status === "authenticated" &&
      response.linkedToAccount
    ) {
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

  const showDesktopSidebar =
    shouldShowHistory || status === "guest";

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

  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6 sm:py-11 lg:px-8"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_12%_4%,rgba(14,165,233,0.16),transparent_36%),radial-gradient(circle_at_88%_2%,rgba(79,70,229,0.12),transparent_30%)]" />

      <div className="relative mx-auto w-full max-w-[1320px]">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/58 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:py-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-sky-300">
                Contact FilmGeezer
              </div>
              <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
                Tell us what needs attention.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base sm:leading-7">
                Report a problem, ask for help, or share an idea. Signed-in
                requests stay connected to your account.
              </p>
            </div>

            <div className="hidden gap-3 md:grid md:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-amber-300/15 bg-amber-400/[0.07] text-amber-200">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path
                      d="M12 3l7 3v5c0 4.4-2.8 7.7-7 10-4.2-2.3-7-5.6-7-10V6l7-3z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h2 className="mt-3 text-sm font-bold text-white">
                  Protect private details
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Never send passwords, codes, tokens, or payment details.
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-sky-300/15 bg-sky-400/[0.07] text-sky-200">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path
                      d="M12 13a4 4 0 100-8 4 4 0 000 8zM5.5 20a6.5 6.5 0 0113 0"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <h2 className="mt-3 text-sm font-bold text-white">
                  Sign in for continuity
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Keep requests, replies, and references together in FilmGeezer.
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] text-emerald-200">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path
                      d="M7 12l3 3 7-7"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                </span>
                <h2 className="mt-3 text-sm font-bold text-white">
                  Account controls stay separate
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  Password, email, and device changes remain in Account settings.
                </p>
              </article>
            </div>

            <details className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 md:hidden">
              <summary className="cursor-pointer text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-300">
                Before you send
              </summary>
              <div className="mt-3 space-y-2 border-t border-white/8 pt-3 text-xs leading-5 text-slate-400">
                <p>
                  Never include passwords, verification codes, session tokens,
                  payment details, or private links.
                </p>
                <p>
                  Signed-in requests stay available in FilmGeezer. Guest
                  follow-up uses the submitted email address.
                </p>
                {status === "authenticated" && (
                  <Link
                    to="/account?section=security"
                    className="inline-flex font-bold text-sky-300 transition hover:text-sky-200"
                  >
                    Open account security settings
                  </Link>
                )}
              </div>
            </details>
          </div>
        </section>

        {shouldShowHistory && (
          <details className="mt-4 rounded-2xl border border-white/10 bg-slate-900/58 px-4 py-3 lg:hidden">
            <summary className="cursor-pointer text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-300">
              Recent requests
              {conversations.length > 0
                ? ` (${conversations.length})`
                : ""}
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
          className={`mt-6 grid min-w-0 gap-6 ${
            showDesktopSidebar
              ? "lg:grid-cols-[21rem_minmax(0,1fr)]"
              : "mx-auto max-w-5xl"
          }`}
        >
          {shouldShowHistory && (
            <aside className="hidden lg:block">
              <section className="rounded-3xl border border-white/10 bg-slate-900/62 p-4 shadow-xl shadow-black/18 backdrop-blur-xl">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300/75">
                      Your support
                    </p>
                    <h2 className="mt-1 text-base font-black text-white">
                      Recent requests
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Select one to open it. Select it again to return to the
                      form.
                    </p>
                  </div>
                  {conversations.length > 0 && (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-bold text-slate-400">
                      {conversations.length}
                    </span>
                  )}
                </div>

                <ContactConversationList
                  conversations={conversations}
                  selectedReferenceId={selectedReferenceId}
                  isLoading={isHistoryLoading}
                  errorMessage={historyError}
                  onSelect={handleConversationSelection}
                  onRetry={() => void loadHistory()}
                />
              </section>
            </aside>
          )}

          {status === "guest" && (
            <aside className="hidden lg:block">
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
                  Keep support in one place
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Sign in to see recent requests, continue conversations, and
                  keep every reference connected to your account.
                </p>
                <button
                  type="button"
                  onClick={requestAuthentication}
                  className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-sky-500 px-5 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  Sign in or register
                </button>
                <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                  Guest sending remains available from the form.
                </p>
              </section>
            </aside>
          )}

          <section className="min-w-0">
            <div className="mb-3 flex min-h-11 items-center justify-between gap-4 px-1">
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
      </div>
    </main>
  );
}

export default ContactPage;
