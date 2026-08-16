import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router";

import AccountControls from "../features/account/components/AccountControls";
import AccountDeactivationDialog from "../features/account/components/AccountDeactivationDialog";
import {
  getAccountSection,
  isAccountTab,
  type AccountTab,
} from "../features/account/accountNavigation";
import AccountHero from "../features/account/components/AccountHero";
import AccountNavigation from "../features/account/components/AccountNavigation";
import ChangePasswordPanel from "../features/account/components/ChangePasswordPanel";
import EmailChangePanel from "../features/account/components/EmailChangePanel";
import EmailPreferencesPanel from "../features/account/components/EmailPreferencesPanel";
import ProfileEditor from "../features/account/components/ProfileEditor";
import RecentPasswordDialog from "../features/account/components/RecentPasswordDialog";
import GoogleConnectionDialog from "../features/account/components/GoogleConnectionDialog";
import SessionManager from "../features/account/components/SessionManager";
import AccountIcon from "../features/account/components/AccountSectionIcons";

import {
  useAuth,
} from "../features/auth/authContext";

import {
  getAccountDetails,
  getAccountEmailChangeStatus,
  getAccountSessions,
  requestAccountPasswordSetup,
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

type SensitiveAction =
  | "change-password"
  | "change-email"
  | "sign-out-all"
  | "deactivate-account"
  | "revoke-session"
  | "manage-google";

function formatDateOnly(
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

function AccountPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] =
    useSearchParams();
  const refreshAuthSession =
    auth.refreshSession;
  const updateAuthUser =
    auth.updateUser;

  const requestedSection =
    searchParams.get("section");

  const activeTab: AccountTab =
    isAccountTab(requestedSection)
      ? requestedSection
      : "profile";

  const setActiveTab = useCallback(
    (tab: AccountTab) => {
      setSearchParams(
        (current) => {
          const next =
            new URLSearchParams(current);

          next.set("section", tab);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

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

  const [showAccountDeactivation, setShowAccountDeactivation] =
    useState(false);

  const [showGoogleConnection, setShowGoogleConnection] =
    useState(false);

  const [isRequestingPasswordSetup, setIsRequestingPasswordSetup] =
    useState(false);

  const [pendingSensitiveAction, setPendingSensitiveAction] =
    useState<SensitiveAction | null>(
      null,
    );

  const [pendingSessionToRevoke, setPendingSessionToRevoke] =
    useState<AccountSession | null>(
      null,
    );

  const [isSigningOutCurrent, setIsSigningOutCurrent] =
    useState(false);

  const [currentSignOutError, setCurrentSignOutError] =
    useState<string | null>(null);

  const [isSigningOutAll, setIsSigningOutAll] =
    useState(false);

  const currentSignOutRedirectRef =
    useRef(false);

  const [revokingSessionReference, setRevokingSessionReference] =
    useState<string | null>(null);

  useEffect(() => {
    if (!securityMessage) {
      return;
    }

    const timer = window.setTimeout(() => {
      setSecurityMessage(null);
    }, 5_000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [securityMessage]);

  useEffect(() => {
    if (auth.status !== "guest") {
      return;
    }

    if (currentSignOutRedirectRef.current) {
      navigate("/", { replace: true });
      return;
    }

    navigate(
      "/login",
      {
        replace: true,
        state: {
          returnTo: `/account?section=${activeTab}`,
        },
      },
    );
  }, [auth.status, activeTab, navigate]);

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

  const recentAuthenticationIsActive =
    isFutureDate(
      details?.security
        .recentAuthenticationExpiresAt ??
        null,
    );

  const csrfToken = auth.csrfToken;

  const activeTabDetails =
    getAccountSection(activeTab);

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

  async function handleSignOutCurrentDevice() {
    if (isSigningOutCurrent) {
      return;
    }

    currentSignOutRedirectRef.current = true;
    setIsSigningOutCurrent(true);
    setCurrentSignOutError(null);

    try {
      await auth.signOut();
    } catch (error) {
      currentSignOutRedirectRef.current = false;
      setIsSigningOutCurrent(false);
      setCurrentSignOutError(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not sign you out.",
      );
    }
  }

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

  async function handlePasswordSetupRequest() {
    if (isRequestingPasswordSetup || !csrfToken) {
      return;
    }

    setIsRequestingPasswordSetup(true);
    setSecurityError(null);
    setSecurityMessage(null);

    try {
      const response = await requestAccountPasswordSetup(csrfToken);
      setSecurityMessage(
        `${response.message} Open the link in your inbox to create the password; FilmGeezer will sign out existing sessions when setup finishes.`,
      );
    } catch (error) {
      setSecurityError(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not start secure password setup.",
      );
    } finally {
      setIsRequestingPasswordSetup(false);
    }
  }

  function beginSensitiveAction(
    action: SensitiveAction,
    session: AccountSession | null = null,
  ) {
    setSecurityError(null);
    setSecurityMessage(null);

    if (!details?.security.passwordConfigured) {
      if (action === "change-password") {
        void handlePasswordSetupRequest();
      } else {
        setActiveTab("security");
        setSecurityError(
          "Add a FilmGeezer password before making sensitive account changes. Password setup is verified through your FilmGeezer email, not an existing Google browser session.",
        );
      }
      return;
    }

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
    } else if (action === "deactivate-account") {
      setShowAccountDeactivation(true);
    } else if (action === "manage-google") {
      setShowGoogleConnection(true);
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
      ? details?.security.passwordConfigured
        ? "Confirm password change"
        : "Confirm password setup"
      : pendingSensitiveAction ===
          "change-email"
        ? "Confirm email change"
        : pendingSensitiveAction ===
            "sign-out-all"
          ? "Confirm sign out"
          : pendingSensitiveAction ===
              "deactivate-account"
            ? "Confirm account deactivation"
            : pendingSensitiveAction === "manage-google"
              ? "Confirm Google sign-in change"
              : "Confirm device sign out";

  const recentPasswordDialogDescription =
    pendingSensitiveAction ===
      "change-password"
      ? details?.security.passwordConfigured
        ? "Confirm your identity before choosing a new FilmGeezer password."
        : "Confirm your identity before adding a FilmGeezer password to this account."
      : pendingSensitiveAction ===
          "change-email"
        ? "Confirm your identity before sending a code to a new email address."
        : pendingSensitiveAction ===
            "sign-out-all"
          ? "Confirm your identity before signing out every device."
          : pendingSensitiveAction ===
              "deactivate-account"
            ? "Confirm your identity before deactivating your FilmGeezer account."
            : pendingSensitiveAction === "manage-google"
              ? "Enter your current FilmGeezer password before connecting or disconnecting Google sign-in."
              : "Confirm your identity before signing out this device.";

  if (
    auth.status === "loading" ||
    isLoading
  ) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-slate-950 text-white"
      >
        <div className="mx-auto w-full max-w-[1080px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="space-y-5 lg:space-y-6">
            <div className="h-36 rounded-[1.75rem] border border-white/8 bg-white/[0.035]" />
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
              <div className="hidden h-72 rounded-2xl border border-white/8 bg-white/[0.025] lg:block" />
              <div className="h-96 rounded-2xl border border-white/8 bg-white/[0.025]" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (auth.status !== "authenticated") {
    return null;
  }

  if (!details || !csrfToken) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-slate-950 text-white"
      >
        <div className="mx-auto w-full max-w-[1080px] px-4 py-16 sm:px-6 lg:px-8">
          <section className="mx-auto max-w-xl rounded-2xl border border-rose-400/20 bg-slate-900/80 p-7 text-center shadow-2xl shadow-black/30">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-rose-300/20 bg-rose-400/10 text-rose-200">
              <AccountIcon name="warning" />
            </span>
            <h1 className="mt-4 text-2xl font-black">
              We could not open your account
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
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-hidden bg-slate-950 pb-16 text-white"
    >
      <h1 className="sr-only">Account settings</h1>

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_12%_0%,rgba(14,165,233,0.12),transparent_36%),radial-gradient(circle_at_88%_8%,rgba(79,70,229,0.08),transparent_34%)]" />

      <div className="relative mx-auto w-full max-w-[1080px] px-4 py-7 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <header className="mb-5 flex items-end justify-between gap-3 px-1 lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
              FilmGeezer account
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Account settings
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              void handleSignOutCurrentDevice();
            }}
            disabled={isSigningOutCurrent}
            aria-busy={isSigningOutCurrent}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 text-sm font-bold text-rose-100 shadow-lg shadow-black/10 transition hover:border-rose-300/35 hover:bg-rose-400/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-70"
          >
            {isSigningOutCurrent ? (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-rose-100/30 border-t-rose-100 motion-reduce:animate-none"
              />
            ) : (
              <AccountIcon
                name="logout"
                className="h-4 w-4"
              />
            )}
            <span>Sign out</span>
          </button>
        </header>

        <div className="space-y-4 lg:space-y-6">
          <AccountHero
            displayName={details.account.displayName}
            email={details.account.email}
            profileImagePath={details.account.profileImagePath}
            memberSinceLabel={formatDateOnly(
              details.account.memberSince,
            )}
            isSigningOut={isSigningOutCurrent}
            onSignOut={() => {
              void handleSignOutCurrentDevice();
            }}
          />

          {currentSignOutError && activeTab !== "account" && (
            <p
              role="alert"
              className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
            >
              {currentSignOutError}
            </p>
          )}

          <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6">
            <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:block lg:self-start">
              <AccountNavigation
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            </aside>

            <div className="min-w-0">
              <div className="mb-4 lg:hidden">
                <AccountNavigation
                  activeTab={activeTab}
                  onChange={setActiveTab}
                />
              </div>

              <section className="min-w-0">
                <header className="mb-4 px-1 lg:hidden">
                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                    {activeTabDetails.label}
                  </h2>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                    {activeTabDetails.description}
                  </p>
                </header>

              {securityError && (
                <div
                  role="alert"
                  className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
                >
                  <span className="min-w-0 leading-6">
                    {securityError}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSecurityError(null)}
                    className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-rose-100/80 transition hover:bg-rose-300/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {securityMessage && (
                <p
                  role="status"
                  className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100"
                >
                  {securityMessage}
                </p>
              )}

              {activeTab === "profile" && (
                <ProfileEditor
                  key={details.account.displayName}
                  displayName={details.account.displayName}
                  profileImagePath={details.account.profileImagePath}
                  csrfToken={csrfToken}
                  onDisplayNameUpdated={async (
                    displayName,
                    message,
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
                    updateAuthUser({ displayName });
                    setSecurityMessage(message);
                  }}
                  onProfileImageUpdated={async (
                    profileImagePath,
                  ) => {
                    setDetails((current) =>
                      current
                        ? {
                            ...current,
                            account: {
                              ...current.account,
                              profileImagePath,
                            },
                          }
                        : current,
                    );
                    updateAuthUser({ profileImagePath });
                  }}
                />
              )}

              {activeTab === "security" && (
                <div className="w-full space-y-4">
                  {showEmailChange ? (
                    <EmailChangePanel
                      currentEmail={details.account.email}
                      googleConnected={details.security.googleConnected}
                      csrfToken={csrfToken}
                      initialPending={pendingEmailChange}
                      onPendingChange={setPendingEmailChange}
                      onCancelPanel={() => {
                        setShowEmailChange(false);
                      }}
                      onChanged={async (message) => {
                        await refreshAccountAfterMutation();
                        setShowEmailChange(false);
                        setSecurityMessage(message);
                      }}
                      onRecentAuthenticationRequired={() => {
                        setShowEmailChange(false);
                        setPendingSensitiveAction(
                          "change-email",
                        );
                      }}
                    />
                  ) : (
                    <section className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/15 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-400/10 text-emerald-300">
                          <AccountIcon name="mail" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-bold text-white">
                            Email address
                          </h3>
                          <p className="mt-1 break-all text-sm font-medium text-slate-300">
                            {details.account.email}
                          </p>
                          {pendingEmailChange ? (
                            <p className="mt-2 text-sm text-amber-200">
                              Waiting for verification: {pendingEmailChange.targetEmail}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm text-slate-500">
                              {details.security.passwordConfigured
                                ? "Used to sign in and recover your account."
                                : "Used for account communication and security notices."}
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={openEmailChange}
                        className="mt-auto min-h-10 w-full rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 text-sm font-bold text-sky-100 transition hover:bg-sky-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 lg:mt-0 lg:w-auto lg:min-w-36"
                      >
                        {pendingEmailChange
                          ? "Continue change"
                          : "Change email"}
                      </button>
                    </section>
                  )}

                  <section className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/15 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-400/10 text-sky-200">
                        <AccountIcon name="check" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white">
                          Google sign-in
                        </h3>
                        <p className="mt-1 break-all text-sm font-medium text-slate-300">
                          {details.security.googleConnected
                            ? details.security.googleEmail ?? "Connected Google account"
                            : "Not connected"}
                        </p>
                        {details.security.googleConnected &&
                        details.security.googleEmail &&
                        details.security.googleEmail.trim().toLowerCase() !==
                          details.account.email.trim().toLowerCase() ? (
                          <div className="mt-2 rounded-lg border border-amber-300/20 bg-amber-400/[0.07] px-3 py-2">
                            <p className="text-xs font-semibold leading-5 text-amber-100">
                              This Google connection uses a different email from your FilmGeezer account.
                            </p>
                            <p className="mt-1 text-xs leading-5 text-amber-100/70">
                              Reconnect Google using {details.account.email}, or disconnect Google sign-in.
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-slate-500">
                            {details.security.googleConnected
                              ? "Use Google as an additional sign-in method for this same FilmGeezer email."
                              : "Connect Google as an optional second sign-in method. The Google email must match your FilmGeezer email."}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        beginSensitiveAction("manage-google");
                      }}
                      className="mt-auto min-h-10 w-full rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 text-sm font-bold text-sky-100 transition hover:bg-sky-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 lg:mt-0 lg:w-auto lg:min-w-36"
                    >
                      {details.security.googleConnected
                        ? "Manage Google"
                        : "Connect Google"}
                    </button>
                  </section>

                  {showChangePassword ? (
                    <ChangePasswordPanel
                      mode={
                        details.security.passwordConfigured
                          ? "change"
                          : "add"
                      }
                      csrfToken={csrfToken}
                      email={details.account.email}
                      displayName={details.account.displayName}
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
                  ) : (
                    <section className="flex h-full flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/15 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                      <div className="flex min-w-0 items-start gap-3.5">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-violet-300/15 bg-violet-400/10 text-violet-300">
                          <AccountIcon name="key" />
                        </span>
                        <div>
                          <h3 className="font-bold text-white">
                            Password
                          </h3>
                          <p className="mt-1 text-sm text-slate-300">
                            {details.security.passwordConfigured
                              ? `Last changed ${formatDateOnly(
                                  details.security.passwordChangedAt,
                                )}`
                              : "No FilmGeezer password is set yet."}
                          </p>
                          <p className="mt-2 text-sm text-slate-500">
                            {details.security.passwordConfigured
                              ? "Use a password you do not use on another service."
                              : "Add one if you also want to sign in with your FilmGeezer email and password."}
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
                        disabled={isRequestingPasswordSetup}
                        className="mt-auto min-h-10 w-full rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 text-sm font-bold text-sky-100 transition hover:bg-sky-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-60 lg:mt-0 lg:w-auto lg:min-w-36"
                      >
                        {details.security.passwordConfigured
                          ? "Change password"
                          : isRequestingPasswordSetup
                            ? "Sending link…"
                            : "Add password"}
                      </button>
                    </section>
                  )}
                </div>
              )}

              {activeTab === "devices" && (
                <SessionManager
                  sessions={sessions}
                  maximumActiveSessions={maximumActiveSessions}
                  isLoading={isLoadingSessions}
                  errorMessage={sessionsError}
                  successMessage={null}
                  revokingSessionReference={revokingSessionReference}
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
              )}

              {activeTab === "account" && (
                <div className="w-full space-y-4">
                  <EmailPreferencesPanel
                    csrfToken={csrfToken}
                  />

                  <AccountControls
                    isSigningOutCurrent={isSigningOutCurrent}
                    currentSignOutError={currentSignOutError}
                    onSignOutCurrent={() => {
                      void handleSignOutCurrentDevice();
                    }}
                    isSigningOutAll={isSigningOutAll}
                    onSignOutAll={() => {
                      beginSensitiveAction(
                        "sign-out-all",
                      );
                    }}
                    onDeactivate={() => {
                      beginSensitiveAction(
                        "deactivate-account",
                      );
                    }}
                  />
                </div>
              )}
              </section>
            </div>
          </div>
        </div>
      </div>

      {showAccountDeactivation && (
        <AccountDeactivationDialog
          csrfToken={csrfToken}
          onCancel={() => {
            setShowAccountDeactivation(false);
          }}
          onRecentAuthenticationRequired={() => {
            setShowAccountDeactivation(false);
            setPendingSensitiveAction(
              "deactivate-account",
            );
          }}
          onDeactivated={async () => {
            setShowAccountDeactivation(false);
            await auth.refreshSession();
            navigate("/", {
              replace: true,
            });
          }}
        />
      )}

      {showGoogleConnection && (
        <GoogleConnectionDialog
          csrfToken={csrfToken}
          connected={details.security.googleConnected}
          accountEmail={details.account.email}
          googleEmail={details.security.googleEmail}
          onCancel={() => {
            setShowGoogleConnection(false);
          }}
          onChanged={async (response) => {
            setShowGoogleConnection(false);
            setSecurityMessage(response.message);

            if (details.account.provider === "google" && response.sessionsRevoked > 0) {
              await refreshAuthSession();
              navigate("/", { replace: true });
              return;
            }

            await refreshAccountAfterMutation();
          }}
          onDisconnected={async (response) => {
            setShowGoogleConnection(false);
            setSecurityMessage(response.message);

            if (details.account.provider === "google") {
              await refreshAuthSession();
              navigate("/", { replace: true });
              return;
            }

            await refreshAccountAfterMutation();
          }}
        />
      )}

      {pendingSensitiveAction && (
        <RecentPasswordDialog
          csrfToken={csrfToken}
          title={recentPasswordDialogTitle}
          description={recentPasswordDialogDescription}
          passwordConfigured={details.security.passwordConfigured}
          onCancel={() => {
            setPendingSensitiveAction(null);
            setPendingSessionToRevoke(null);
          }}
          onConfirmed={(expiresAt) => {
            const action = pendingSensitiveAction;
            const session = pendingSessionToRevoke;

            updateRecentAuthenticationExpiry(expiresAt);

            setPendingSensitiveAction(null);
            setPendingSessionToRevoke(null);

            if (action === "change-password") {
              setShowChangePassword(true);
            } else if (action === "change-email") {
              setShowEmailChange(true);
            } else if (action === "sign-out-all") {
              void handleSignOutAll();
            } else if (action === "deactivate-account") {
              setShowAccountDeactivation(true);
            } else if (action === "manage-google") {
              setShowGoogleConnection(true);
            } else if (
              action === "revoke-session" &&
              session
            ) {
              void handleRevokeSession(session);
            }
          }}
        />
      )}
    </main>
  );
}

export default AccountPage;
