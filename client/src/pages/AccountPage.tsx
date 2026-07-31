import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import ContentContainer from "../components/layout/ContentContainer";

import ChangePasswordPanel from "../features/account/components/ChangePasswordPanel";
import EmailChangePanel from "../features/account/components/EmailChangePanel";
import ProfileEditor from "../features/account/components/ProfileEditor";
import RecentPasswordDialog from "../features/account/components/RecentPasswordDialog";
import SessionManager from "../features/account/components/SessionManager";

import {
  useAuth,
} from "../features/auth/authContext";

import {
  getAccountDetails,
  getAccountEmailChangeStatus,
  getAccountSessions,
  revokeAccountSession,
} from "../services/accountService";

import {
  AuthApiError,
} from "../services/authService";

import type {
  AccountDetailsResponse,
  AccountEmailChangeReceipt,
  AccountSession,
} from "../types/account";

type AccountTab =
  | "overview"
  | "profile"
  | "devices"
  | "security";

type SensitiveAction =
  | "change-password"
  | "change-email"
  | "sign-out-all"
  | "revoke-session";

const ACCOUNT_TABS: Array<{
  id: AccountTab;
  label: string;
}> = [
  { id: "overview", label: "Overview" },
  { id: "profile", label: "Profile" },
  { id: "devices", label: "Devices" },
  { id: "security", label: "Security" },
];

function createInitials(
  displayName: string,
): string {
  const parts = displayName
    .trim()
    .split(/\s+/u)
    .filter(Boolean);

  if (parts.length === 0) {
    return "FG";
  }

  if (parts.length === 1) {
    return Array.from(parts[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  const first =
    Array.from(parts[0])[0] ?? "";

  const last =
    Array.from(parts.at(-1) ?? "")[0] ?? "";

  return `${first}${last}`.toUpperCase();
}

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function isFutureDate(
  value: string | null,
): boolean {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() > Date.now()
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M12 3.5 19 6v5.4c0 4.45-2.75 7.75-7 9.1-4.25-1.35-7-4.65-7-9.1V6l7-2.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m8.8 12 2.05 2.05 4.35-4.35"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AccountPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const refreshAuthSession =
    auth.refreshSession;

  const [activeTab, setActiveTab] =
    useState<AccountTab>("overview");

  const [details, setDetails] =
    useState<AccountDetailsResponse | null>(
      null,
    );

  const [sessions, setSessions] =
    useState<AccountSession[]>([]);

  const [maximumActiveSessions, setMaximumActiveSessions] =
    useState(5);

  const [pendingEmailChange, setPendingEmailChange] =
    useState<AccountEmailChangeReceipt | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [isLoadingSessions, setIsLoadingSessions] =
    useState(false);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [sessionsError, setSessionsError] =
    useState<string | null>(null);

  const [securityMessage, setSecurityMessage] =
    useState<string | null>(null);

  const [securityError, setSecurityError] =
    useState<string | null>(null);

  const [showChangePassword, setShowChangePassword] =
    useState(false);

  const [showEmailChange, setShowEmailChange] =
    useState(false);

  const [pendingSensitiveAction, setPendingSensitiveAction] =
    useState<SensitiveAction | null>(
      null,
    );

  const [pendingSessionToRevoke, setPendingSessionToRevoke] =
    useState<AccountSession | null>(
      null,
    );

  const [isSigningOutAll, setIsSigningOutAll] =
    useState(false);

  const [revokingSessionReference, setRevokingSessionReference] =
    useState<string | null>(null);

  useEffect(() => {
    if (auth.status === "guest") {
      navigate(
        "/login",
        {
          replace: true,
          state: {
            returnTo: "/account",
          },
        },
      );
    }
  }, [auth.status, navigate]);

  const loadDetails = useCallback(
    async (
      signal?: AbortSignal,
    ) => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const response =
          await getAccountDetails(signal);

        if (!signal?.aborted) {
          setDetails(response);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        if (!signal?.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "FilmGeezer could not load your account.",
          );
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  const loadSessions = useCallback(
    async (
      signal?: AbortSignal,
    ) => {
      setIsLoadingSessions(true);
      setSessionsError(null);

      try {
        const response =
          await getAccountSessions(signal);

        if (!signal?.aborted) {
          setSessions(response.sessions);
          setMaximumActiveSessions(
            response.maximumActiveSessions,
          );
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        if (!signal?.aborted) {
          setSessionsError(
            error instanceof Error
              ? error.message
              : "FilmGeezer could not load your devices.",
          );
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoadingSessions(false);
        }
      }
    },
    [],
  );

  const loadEmailChangeStatus = useCallback(
    async (
      signal?: AbortSignal,
    ) => {
      try {
        const response =
          await getAccountEmailChangeStatus(
            signal,
          );

        if (!signal?.aborted) {
          setPendingEmailChange(
            response.pending,
          );
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        if (!signal?.aborted) {
          setSecurityError(
            error instanceof Error
              ? error.message
              : "FilmGeezer could not check your pending email change.",
          );
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (auth.status !== "authenticated") {
      return;
    }

    const controller =
      new AbortController();

    const timer = window.setTimeout(
      () => {
        void loadDetails(
          controller.signal,
        );
        void loadSessions(
          controller.signal,
        );
        void loadEmailChangeStatus(
          controller.signal,
        );
      },
      0,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    auth.status,
    loadDetails,
    loadEmailChangeStatus,
    loadSessions,
  ]);

  const initials = useMemo(
    () =>
      createInitials(
        details?.account.displayName ??
          auth.user?.displayName ??
          "FilmGeezer",
      ),
    [
      auth.user?.displayName,
      details?.account.displayName,
    ],
  );

  const recentAuthenticationIsActive =
    isFutureDate(
      details?.security
        .recentAuthenticationExpiresAt ??
        null,
    );

  const csrfToken = auth.csrfToken;

  const updateRecentAuthenticationExpiry =
    useCallback(
      (expiresAt: string) => {
        setDetails((current) =>
          current
            ? {
                ...current,
                security: {
                  ...current.security,
                  recentAuthenticationExpiresAt:
                    expiresAt,
                },
              }
            : current,
        );
      },
      [],
    );

  const refreshAccountAfterMutation =
    useCallback(
      async () => {
        await refreshAuthSession();
        await Promise.all([
          loadDetails(),
          loadSessions(),
          loadEmailChangeStatus(),
        ]);
      },
      [
        refreshAuthSession,
        loadDetails,
        loadEmailChangeStatus,
        loadSessions,
      ],
    );

  async function handleSignOutAll() {
    if (isSigningOutAll) {
      return;
    }

    setIsSigningOutAll(true);
    setSecurityError(null);
    setSecurityMessage(null);

    try {
      await auth.signOutAll();
      navigate("/", { replace: true });
    } catch (error) {
      if (
        error instanceof AuthApiError &&
        error.code ===
          "AUTH_RECENT_AUTHENTICATION_REQUIRED"
      ) {
        setPendingSensitiveAction(
          "sign-out-all",
        );
        return;
      }

      setSecurityError(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not sign out your devices.",
      );
    } finally {
      setIsSigningOutAll(false);
    }
  }

  async function handleRevokeSession(
    session: AccountSession,
  ) {
    if (
      revokingSessionReference !== null ||
      !csrfToken
    ) {
      return;
    }

    setRevokingSessionReference(
      session.sessionReference,
    );
    setSecurityError(null);
    setSecurityMessage(null);

    try {
      const response =
        await revokeAccountSession(
          session.sessionReference,
          csrfToken,
        );

      setSessions((current) =>
        current.filter(
          (item) =>
            item.sessionReference !==
            response.sessionReference,
        ),
      );

      setSecurityMessage(
        response.message,
      );
    } catch (error) {
      if (
        error instanceof AuthApiError &&
        error.code ===
          "AUTH_RECENT_AUTHENTICATION_REQUIRED"
      ) {
        setPendingSessionToRevoke(
          session,
        );
        setPendingSensitiveAction(
          "revoke-session",
        );
        return;
      }

      setSessionsError(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not sign out that device.",
      );
    } finally {
      setRevokingSessionReference(null);
    }
  }

  function beginSensitiveAction(
    action: SensitiveAction,
    session: AccountSession | null = null,
  ) {
    setSecurityError(null);
    setSecurityMessage(null);

    if (session) {
      setPendingSessionToRevoke(session);
    }

    if (!recentAuthenticationIsActive) {
      setPendingSensitiveAction(action);
      return;
    }

    if (action === "change-password") {
      setShowChangePassword(true);
    } else if (action === "change-email") {
      setShowEmailChange(true);
    } else if (action === "sign-out-all") {
      void handleSignOutAll();
    } else if (
      action === "revoke-session" &&
      session
    ) {
      void handleRevokeSession(session);
    }
  }

  function openEmailChange() {
    setActiveTab("security");

    if (pendingEmailChange) {
      setShowEmailChange(true);
      return;
    }

    beginSensitiveAction(
      "change-email",
    );
  }

  const recentPasswordDialogTitle =
    pendingSensitiveAction ===
      "change-password"
      ? "Confirm password change"
      : pendingSensitiveAction ===
          "change-email"
        ? "Confirm email change"
        : pendingSensitiveAction ===
            "sign-out-all"
          ? "Confirm sign out"
          : "Confirm device sign out";

  const recentPasswordDialogDescription =
    pendingSensitiveAction ===
      "change-password"
      ? "Enter your current password before choosing a new one."
      : pendingSensitiveAction ===
          "change-email"
        ? "Enter your current password before sending a code to a new email address."
        : pendingSensitiveAction ===
            "sign-out-all"
          ? "Enter your current password before signing out every device."
          : "Enter your current password before signing out this device.";

  if (
    auth.status === "loading" ||
    isLoading
  ) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <ContentContainer className="py-16">
          <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
            <p className="text-slate-400">
              Loading your FilmGeezer account…
            </p>
          </div>
        </ContentContainer>
      </main>
    );
  }

  if (auth.status !== "authenticated") {
    return null;
  }

  if (!details || !csrfToken) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <ContentContainer className="py-16">
          <section className="mx-auto max-w-2xl rounded-3xl border border-rose-400/20 bg-rose-400/[0.06] p-7 text-center">
            <h1 className="text-2xl font-black">
              Account unavailable
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {loadError ??
                "FilmGeezer could not load your account right now."}
            </p>
            <button
              type="button"
              onClick={() => {
                void loadDetails();
              }}
              className="mt-5 min-h-11 rounded-xl bg-sky-500 px-5 font-bold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            >
              Try again
            </button>
          </section>
        </ContentContainer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-16 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950 py-10 sm:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_38%),radial-gradient(circle_at_75%_20%,rgba(59,130,246,0.1),transparent_34%)]" />

        <ContentContainer className="relative">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[1.75rem] border border-sky-300/25 bg-sky-400/10 text-2xl font-black text-sky-100 shadow-xl shadow-sky-950/30 sm:h-24 sm:w-24 sm:text-3xl">
              {initials}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words text-3xl font-black tracking-tight sm:text-4xl">
                  {details.account.displayName}
                </h1>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-200">
                  Verified
                </span>
              </div>

              <p className="mt-2 break-all text-sm text-slate-400 sm:text-base">
                {details.account.email}
              </p>
            </div>
          </div>
        </ContentContainer>
      </section>

      <ContentContainer className="pt-7">
        <nav
          aria-label="Account sections"
          className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-2"
        >
          {ACCOUNT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={
                activeTab === tab.id
                  ? "page"
                  : undefined
              }
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`min-h-11 shrink-0 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                activeTab === tab.id
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-950/25"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
            <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-7">
              <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-400/10 text-sky-300">
                  <ShieldIcon />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                    Account overview
                  </p>
                  <h2 className="mt-1 text-2xl font-black">
                    Your FilmGeezer account
                  </h2>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Member since
                  </dt>
                  <dd className="mt-2 font-semibold text-slate-200">
                    {formatDate(
                      details.account.memberSince,
                    )}
                  </dd>
                </div>

                <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Last sign in
                  </dt>
                  <dd className="mt-2 font-semibold text-slate-200">
                    {formatDate(
                      details.account.lastLoginAt,
                    )}
                  </dd>
                </div>

                <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Password updated
                  </dt>
                  <dd className="mt-2 font-semibold text-slate-200">
                    {formatDate(
                      details.security.passwordChangedAt,
                    )}
                  </dd>
                </div>

                <div className="rounded-2xl border border-white/8 bg-slate-950/55 p-4">
                  <dt className="text-xs uppercase tracking-[0.16em] text-slate-500">
                    Signed-in devices
                  </dt>
                  <dd className="mt-2 font-semibold text-slate-200">
                    {sessions.length} of {maximumActiveSessions}
                  </dd>
                </div>
              </dl>
            </section>

            <aside className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("profile");
                }}
                className="flex w-full items-center justify-between rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:border-sky-300/25 hover:bg-sky-400/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <span>
                  <span className="font-bold text-white">
                    Update profile
                  </span>
                  <span className="mt-1 block text-sm text-slate-400">
                    Change your display name.
                  </span>
                </span>
                <span className="text-xl text-sky-300">→</span>
              </button>

              <button
                type="button"
                onClick={openEmailChange}
                className="flex w-full items-center justify-between rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:border-sky-300/25 hover:bg-sky-400/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <span>
                  <span className="font-bold text-white">
                    {pendingEmailChange
                      ? "Finish email change"
                      : "Change email"}
                  </span>
                  <span className="mt-1 block text-sm text-slate-400">
                    {pendingEmailChange
                      ? `Verification is waiting for ${pendingEmailChange.targetEmail}.`
                      : "Verify a new sign-in email address."}
                  </span>
                </span>
                <span className="text-xl text-sky-300">→</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("devices");
                }}
                className="flex w-full items-center justify-between rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-left transition hover:border-sky-300/25 hover:bg-sky-400/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
              >
                <span>
                  <span className="font-bold text-white">
                    Review devices
                  </span>
                  <span className="mt-1 block text-sm text-slate-400">
                    See where your account is signed in.
                  </span>
                </span>
                <span className="text-xl text-sky-300">→</span>
              </button>
            </aside>
          </div>
        )}

        {activeTab === "profile" && (
          <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-7">
            <ProfileEditor
              displayName={
                details.account.displayName
              }
              email={details.account.email}
              csrfToken={csrfToken}
              onUpdated={async (
                displayName,
              ) => {
                setDetails((current) =>
                  current
                    ? {
                        ...current,
                        account: {
                          ...current.account,
                          displayName,
                        },
                      }
                    : current,
                );

                await auth.refreshSession();
              }}
            />
          </section>
        )}

        {activeTab === "devices" && (
          <div className="mt-6">
            <SessionManager
              sessions={sessions}
              maximumActiveSessions={
                maximumActiveSessions
              }
              isLoading={isLoadingSessions}
              errorMessage={sessionsError}
              successMessage={securityMessage}
              revokingSessionReference={
                revokingSessionReference
              }
              onRefresh={() => {
                void loadSessions();
              }}
              onRevoke={(session) => {
                beginSensitiveAction(
                  "revoke-session",
                  session,
                );
              }}
            />
          </div>
        )}

        {activeTab === "security" && (
          <div className="mt-6 space-y-6">
            {securityMessage && (
              <p
                role="status"
                className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
              >
                {securityMessage}
              </p>
            )}

            {securityError && (
              <p
                role="alert"
                className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
              >
                {securityError}
              </p>
            )}

            {showEmailChange ? (
              <EmailChangePanel
                currentEmail={
                  details.account.email
                }
                csrfToken={csrfToken}
                initialPending={
                  pendingEmailChange
                }
                onCancelPanel={() => {
                  setShowEmailChange(false);
                }}
                onPendingChange={
                  setPendingEmailChange
                }
                onRecentAuthenticationRequired={() => {
                  setShowEmailChange(false);
                  setPendingSensitiveAction(
                    "change-email",
                  );
                }}
                onChanged={async (
                  message,
                  newEmail,
                ) => {
                  setPendingEmailChange(null);
                  setShowEmailChange(false);
                  setDetails((current) =>
                    current
                      ? {
                          ...current,
                          account: {
                            ...current.account,
                            email: newEmail,
                            emailVerifiedAt:
                              new Date().toISOString(),
                          },
                        }
                      : current,
                  );
                  await refreshAccountAfterMutation();
                  setSecurityMessage(message);
                }}
              />
            ) : (
              <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                  Email address
                </p>
                <h2 className="mt-2 break-all text-xl font-black">
                  {details.account.email}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                  Change the address you use to sign in. FilmGeezer keeps your current address until the new one is verified.
                </p>
                {pendingEmailChange && (
                  <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                    Verification is waiting for {pendingEmailChange.targetEmail}.
                  </p>
                )}
                <button
                  type="button"
                  onClick={openEmailChange}
                  className="mt-5 min-h-11 rounded-xl bg-sky-500 px-5 font-bold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                >
                  {pendingEmailChange
                    ? "Continue email change"
                    : "Change email"}
                </button>
              </section>
            )}

            <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-400/10 text-sky-300">
                    <ShieldIcon />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                      Password
                    </p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight">
                      Protect your account
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                      Confirm your current password before changing sensitive account details.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    beginSensitiveAction(
                      "change-password",
                    );
                  }}
                  className="min-h-11 rounded-xl bg-sky-500 px-5 font-bold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                >
                  Change password
                </button>
              </div>

              <p className="mt-5 rounded-2xl border border-white/8 bg-slate-950/55 px-4 py-3 text-sm text-slate-400">
                Last changed {formatDate(
                  details.security.passwordChangedAt,
                )}
              </p>
            </section>

            {showChangePassword && (
              <ChangePasswordPanel
                csrfToken={csrfToken}
                email={details.account.email}
                displayName={
                  details.account.displayName
                }
                onCancel={() => {
                  setShowChangePassword(false);
                }}
                onChanged={async (message) => {
                  await refreshAccountAfterMutation();
                  setShowChangePassword(false);
                  setSecurityMessage(message);
                }}
                onRecentAuthenticationRequired={() => {
                  setShowChangePassword(false);
                  setPendingSensitiveAction(
                    "change-password",
                  );
                }}
              />
            )}

            <section className="rounded-3xl border border-rose-400/15 bg-rose-400/[0.045] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">
                All devices
              </p>
              <h2 className="mt-2 text-xl font-black">
                Sign out everywhere
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
                Sign out every device using this FilmGeezer account, including this one.
              </p>
              <button
                type="button"
                disabled={isSigningOutAll}
                onClick={() => {
                  beginSensitiveAction(
                    "sign-out-all",
                  );
                }}
                className="mt-5 min-h-11 rounded-xl border border-rose-300/25 bg-rose-400/10 px-5 font-bold text-rose-100 transition hover:bg-rose-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-50"
              >
                {isSigningOutAll
                  ? "Signing out…"
                  : "Sign out from all devices"}
              </button>
            </section>
          </div>
        )}
      </ContentContainer>

      {pendingSensitiveAction && (
        <RecentPasswordDialog
          csrfToken={csrfToken}
          title={recentPasswordDialogTitle}
          description={
            recentPasswordDialogDescription
          }
          onCancel={() => {
            setPendingSensitiveAction(null);
            setPendingSessionToRevoke(null);
          }}
          onConfirmed={(expiresAt) => {
            const action =
              pendingSensitiveAction;
            const session =
              pendingSessionToRevoke;

            updateRecentAuthenticationExpiry(
              expiresAt,
            );

            setPendingSensitiveAction(null);
            setPendingSessionToRevoke(null);

            if (
              action === "change-password"
            ) {
              setShowChangePassword(true);
            } else if (
              action === "change-email"
            ) {
              setShowEmailChange(true);
            } else if (
              action === "sign-out-all"
            ) {
              void handleSignOutAll();
            } else if (
              action === "revoke-session" &&
              session
            ) {
              void handleRevokeSession(
                session,
              );
            }
          }}
        />
      )}
    </main>
  );
}

export default AccountPage;
