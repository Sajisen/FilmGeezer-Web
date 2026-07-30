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

import {
  useAuth,
} from "../features/auth/authContext";

import {
  getAccountDetails,
} from "../services/accountService";

import {
  AuthApiError,
} from "../services/authService";

import type {
  AccountDetailsResponse,
} from "../types/account";

import ChangePasswordPanel from "../features/account/components/ChangePasswordPanel";
import ProfileEditor from "../features/account/components/ProfileEditor";
import RecentPasswordDialog from "../features/account/components/RecentPasswordDialog";

type AccountTab =
  | "overview"
  | "profile"
  | "security";

type SensitiveAction =
  | "change-password"
  | "sign-out-all";

const ACCOUNT_TABS: Array<{
  id: AccountTab;
  label: string;
}> = [
  {
    id: "overview",
    label: "Overview",
  },
  {
    id: "profile",
    label: "Profile",
  },
  {
    id: "security",
    label: "Security",
  },
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
    Array.from(
      parts.at(-1) ?? "",
    )[0] ?? "";

  return `${first}${last}`.toUpperCase();
}

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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

function ProfileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <circle
        cx="12"
        cy="8"
        r="3.25"
        stroke="currentColor"
        strokeWidth="1.7"
      />

      <path
        d="M5.5 19c.8-3.25 3-5 6.5-5s5.7 1.75 6.5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AccountPage() {
  const auth = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] =
    useState<AccountTab>("overview");

  const [details, setDetails] =
    useState<AccountDetailsResponse | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [securityMessage, setSecurityMessage] =
    useState<string | null>(null);

  const [securityError, setSecurityError] =
    useState<string | null>(null);

  const [showChangePassword, setShowChangePassword] =
    useState(false);

  const [pendingSensitiveAction, setPendingSensitiveAction] =
    useState<SensitiveAction | null>(
      null,
    );

  const [isSigningOutAll, setIsSigningOutAll] =
    useState(false);

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

  const loadDetails =
    useCallback(
      async (
        signal?: AbortSignal,
      ) => {
        setIsLoading(true);
        setLoadError(null);

        try {
          const response =
            await getAccountDetails(
              signal,
            );

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

  useEffect(() => {
    if (auth.status !== "authenticated") {
      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(() => {
        void loadDetails(
          controller.signal,
        );
      }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [auth.status, loadDetails]);

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

  if (
    auth.status === "loading" ||
    (
      auth.status === "authenticated" &&
      isLoading &&
      !details
    )
  ) {
    return (
      <main className="min-h-screen bg-slate-950 py-16 text-white">
        <ContentContainer>
          <div
            role="status"
            className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-slate-300"
          >
            Loading your FilmGeezer account…
          </div>
        </ContentContainer>
      </main>
    );
  }

  if (
    auth.status !== "authenticated" ||
    !auth.user ||
    !auth.session
  ) {
    return (
      <main className="min-h-screen bg-slate-950" />
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen bg-slate-950 py-16 text-white">
        <ContentContainer>
          <section className="mx-auto max-w-2xl rounded-3xl border border-rose-400/20 bg-rose-400/[0.06] p-7 text-center">
            <h1 className="text-2xl font-black">
              Account unavailable
            </h1>

            <p className="mt-3 leading-7 text-slate-300">
              {loadError ??
                "FilmGeezer could not load your account details."}
            </p>

            <button
              type="button"
              onClick={() => {
                void loadDetails();
              }}
              className="mt-6 rounded-full bg-sky-500 px-5 py-2.5 font-bold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
            >
              Try again
            </button>
          </section>
        </ContentContainer>
      </main>
    );
  }

  const csrfToken = auth.csrfToken;

  if (!csrfToken) {
    return (
      <main className="min-h-screen bg-slate-950 py-16 text-white">
        <ContentContainer>
          <section className="mx-auto max-w-2xl rounded-3xl border border-amber-400/20 bg-amber-400/[0.06] p-7 text-center">
            <h1 className="text-2xl font-black">
              Refresh your session
            </h1>

            <p className="mt-3 leading-7 text-slate-300">
              FilmGeezer could not prepare secure account changes for this session. Refresh the page and try again.
            </p>
          </section>
        </ContentContainer>
      </main>
    );
  }

  function updateRecentAuthenticationExpiry(
    expiresAt: string,
  ) {
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

      navigate(
        "/",
        {
          replace: true,
        },
      );
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
          : "FilmGeezer could not sign you out from every device.",
      );
    } finally {
      setIsSigningOutAll(false);
    }
  }

  function beginSensitiveAction(
    action: SensitiveAction,
  ) {
    setSecurityError(null);
    setSecurityMessage(null);

    if (recentAuthenticationIsActive) {
      if (action === "change-password") {
        setShowChangePassword(true);
      } else {
        void handleSignOutAll();
      }

      return;
    }

    setPendingSensitiveAction(action);
  }

  async function refreshAccountAfterMutation() {
    const sessionWasLoaded =
      await auth.completeAuthentication();

    if (!sessionWasLoaded) {
      throw new Error(
        "Your updated FilmGeezer session could not be loaded.",
      );
    }

    const response =
      await getAccountDetails();

    setDetails(response);
  }

  const recentPasswordDialogTitle =
    pendingSensitiveAction ===
      "sign-out-all"
      ? "Confirm sign out everywhere"
      : "Confirm your identity";

  const recentPasswordDialogDescription =
    pendingSensitiveAction ===
      "sign-out-all"
      ? "Enter your current password before FilmGeezer revokes every active session."
      : "Enter your current password before choosing a new one.";

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950 py-10 sm:py-14">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(14,165,233,0.2),transparent_32%),radial-gradient(circle_at_10%_100%,rgba(37,99,235,0.12),transparent_34%)]"
        />

        <ContentContainer className="relative">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                <span
                  aria-hidden="true"
                  className="grid h-20 w-20 place-items-center rounded-[1.6rem] border border-sky-200/20 bg-gradient-to-br from-sky-400 via-sky-600 to-blue-900 text-2xl font-black shadow-xl shadow-sky-950/40 sm:h-24 sm:w-24 sm:text-3xl"
                >
                  {initials}
                </span>

                <span
                  aria-hidden="true"
                  className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full border-4 border-slate-950 bg-emerald-400 text-slate-950"
                >
                  ✓
                </span>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300">
                  FilmGeezer account
                </p>

                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  {details.account.displayName}
                </h1>

                <p className="mt-2 break-all text-slate-400">
                  {details.account.email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Verified
              </span>

              <span className="rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-sm font-semibold capitalize text-slate-300">
                {details.account.roles.join(
                  ", ",
                )}
              </span>
            </div>
          </div>
        </ContentContainer>
      </section>

      <ContentContainer className="pt-7 sm:pt-9">
        <nav
          aria-label="Account sections"
          className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] p-1.5"
        >
          {ACCOUNT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
              }}
              aria-current={
                activeTab === tab.id
                  ? "page"
                  : undefined
              }
              className={`min-h-11 min-w-fit flex-1 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 ${
                activeTab === tab.id
                  ? "bg-sky-500 text-white shadow-lg shadow-sky-950/30"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {loadError && (
          <p
            role="alert"
            className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
          >
            {loadError}
          </p>
        )}

        {activeTab === "overview" && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
            <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-400/10 text-sky-300">
                  <ProfileIcon />
                </span>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                    Overview
                  </p>

                  <h2 className="mt-1 text-2xl font-black tracking-tight">
                    Your FilmGeezer account
                  </h2>
                </div>
              </div>

              <dl className="mt-7 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    label: "Member since",
                    value: formatDate(
                      details.account.memberSince,
                    ),
                  },
                  {
                    label: "Last sign in",
                    value: formatDate(
                      details.account.lastLoginAt,
                    ),
                  },
                  {
                    label: "Password updated",
                    value: formatDate(
                      details.security.passwordChangedAt,
                    ),
                  },
                  {
                    label: "Current session expires",
                    value: formatDate(
                      details.session.expiresAt,
                    ),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/8 bg-slate-950/55 p-5"
                  >
                    <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.label}
                    </dt>

                    <dd className="mt-2 font-semibold text-slate-100">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                  Current session
                </p>

                <h2 className="mt-2 text-xl font-black">
                  This device
                </h2>

                <dl className="mt-5 space-y-4 text-sm">
                  <div>
                    <dt className="text-slate-500">
                      Signed in
                    </dt>
                    <dd className="mt-1 font-medium text-slate-200">
                      {formatDate(
                        details.session.createdAt,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Last activity
                    </dt>
                    <dd className="mt-1 font-medium text-slate-200">
                      {formatDate(
                        details.session.lastSeenAt,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500">
                      Idle timeout
                    </dt>
                    <dd className="mt-1 font-medium text-slate-200">
                      {formatDate(
                        details.session.idleExpiresAt,
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

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
                    Change your FilmGeezer display name.
                  </span>
                </span>

                <span className="text-xl text-sky-300">
                  →
                </span>
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

        {activeTab === "security" && (
          <div className="mt-6 space-y-6">
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
                      Your current password is required before sensitive account changes. Confirmation remains valid for five minutes on this session.
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

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
                  Email address
                </p>

                <h2 className="mt-2 text-xl font-black">
                  {details.account.email}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Changing the primary email will require password confirmation and verification of the new address.
                </p>

                <button
                  type="button"
                  disabled
                  className="mt-5 min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-4 font-semibold text-slate-500"
                >
                  Email change coming next
                </button>
              </section>

              <section className="rounded-3xl border border-rose-400/15 bg-rose-400/[0.045] p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">
                  All devices
                </p>

                <h2 className="mt-2 text-xl font-black">
                  Sign out everywhere
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Revoke every active FilmGeezer session, including this device.
                </p>

                <button
                  type="button"
                  disabled={isSigningOutAll}
                  onClick={() => {
                    beginSensitiveAction(
                      "sign-out-all",
                    );
                  }}
                  className="mt-5 min-h-11 w-full rounded-xl border border-rose-300/25 bg-rose-400/10 px-4 font-bold text-rose-100 transition hover:bg-rose-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-50"
                >
                  {isSigningOutAll
                    ? "Signing out…"
                    : "Sign out from all devices"}
                </button>
              </section>
            </div>
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
            }}
            onConfirmed={(expiresAt) => {
              const action =
                pendingSensitiveAction;

              updateRecentAuthenticationExpiry(
                expiresAt,
              );

              setPendingSensitiveAction(null);

              if (
                action === "change-password"
              ) {
                setShowChangePassword(true);
              } else {
                void handleSignOutAll();
              }
            }}
          />
        )}
    </main>
  );
}

export default AccountPage;
