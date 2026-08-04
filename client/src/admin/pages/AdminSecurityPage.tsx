import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useAdminAuth } from "../auth/adminAuthContext";
import {
  AdminApiError,
  completeAdminPasskeyReauthentication,
  disableAdminMfa,
  getAdminMfaStatus,
  getAdminPasskeys,
  reauthenticateAdmin,
  regenerateAdminMfaRecoveryCodesWithRecentAuthentication,
  revokeAdminPasskey,
  startAdminPasskeyReauthentication,
} from "../services/adminService";
import AdminMfaSetupFlow from "../security/AdminMfaSetupFlow";
import AdminPasskeySetupFlow from "../security/AdminPasskeySetupFlow";
import AdminRecoveryCodesPanel from "../security/AdminRecoveryCodesPanel";
import {
  authenticateAdminPasskey,
  isPasskeyPromptCancellation,
  supportsAdminPasskeys,
} from "../security/adminPasskeyBrowser";
import type {
  AdminMfaStatusResponse,
  AdminPasskeySummary,
} from "../types/admin";

interface ProofFields {
  password: string;
  method: "totp" | "recovery";
  code: string;
}

function SecurityKeyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M8.5 14.5a5.5 5.5 0 1 1 4.8 2.75V20m0 0h2.2m-2.2 0h-2.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="9" r="1.2" fill="currentColor" />
    </svg>
  );
}

function ProofForm({
  title,
  description,
  submitLabel,
  danger = false,
  isWorking,
  totpAvailable,
  recoveryAvailable,
  onSubmit,
}: {
  title: string;
  description: string;
  submitLabel: string;
  danger?: boolean;
  isWorking: boolean;
  totpAvailable: boolean;
  recoveryAvailable: boolean;
  onSubmit: (fields: ProofFields) => Promise<void>;
}) {
  const defaultMethod = totpAvailable ? "totp" : "recovery";
  const [fields, setFields] = useState<ProofFields>({
    password: "",
    method: defaultMethod,
    code: "",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(fields);
    setFields({ password: "", method: defaultMethod, code: "" });
  }

  if (!totpAvailable && !recoveryAvailable) {
    return null;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
    >
      <h3 className="text-sm font-black text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input
          type="password"
          autoComplete="current-password"
          value={fields.password}
          onChange={(event) =>
            setFields((current) => ({
              ...current,
              password: event.target.value,
            }))
          }
          required
          className="min-h-11 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-sky-300/45"
          placeholder="Current password"
        />
        <input
          type="text"
          inputMode={fields.method === "totp" ? "numeric" : "text"}
          autoComplete="one-time-code"
          value={fields.code}
          onChange={(event) =>
            setFields((current) => ({
              ...current,
              code: event.target.value,
            }))
          }
          required
          className="min-h-11 rounded-xl border border-white/10 bg-slate-950/70 px-3 text-sm text-white outline-none focus:border-sky-300/45"
          placeholder={
            fields.method === "totp"
              ? "Six-digit code"
              : "Recovery code"
          }
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {totpAvailable && recoveryAvailable ? (
          <label className="text-xs font-bold text-slate-400">
            Verification method
            <select
              value={fields.method}
              onChange={(event) =>
                setFields((current) => ({
                  ...current,
                  method: event.target.value as "totp" | "recovery",
                  code: "",
                }))
              }
              className="ml-2 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-slate-200"
            >
              <option value="totp">Authenticator</option>
              <option value="recovery">Recovery code</option>
            </select>
          </label>
        ) : (
          <span className="text-xs font-bold text-slate-500">
            {totpAvailable ? "Authenticator code" : "Recovery code"}
          </span>
        )}

        <button
          type="submit"
          disabled={isWorking}
          className={`min-h-10 rounded-xl px-4 text-sm font-black transition disabled:opacity-50 ${
            danger
              ? "border border-red-300/20 bg-red-400/10 text-red-100 hover:bg-red-400/15"
              : "bg-sky-500 text-white hover:bg-sky-400"
          }`}
        >
          {isWorking ? "Working…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function formatPasskeyKind(passkey: AdminPasskeySummary): string {
  if (passkey.deviceType === "multiDevice") {
    return passkey.backedUp
      ? "Synced passkey"
      : "Multi-device passkey";
  }

  return passkey.attachment === "platform"
    ? "Device passkey"
    : "Security-key passkey";
}

export default function AdminSecurityPage() {
  const {
    csrfToken,
    session,
    refreshSession,
    signOut,
  } = useAdminAuth();
  const [status, setStatus] =
    useState<AdminMfaStatusResponse["security"] | null>(null);
  const [passkeys, setPasskeys] = useState<AdminPasskeySummary[]>([]);
  const [passkeysConfigured, setPasskeysConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [showRecentAuthentication, setShowRecentAuthentication] =
    useState(false);

  const loadSecurity = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const [mfaResponse, passkeyResponse] = await Promise.all([
        getAdminMfaStatus(signal),
        getAdminPasskeys(signal),
      ]);
      setStatus(mfaResponse.security);
      setPasskeys(passkeyResponse.passkeys);
      setPasskeysConfigured(passkeyResponse.configured);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Administrator security could not be loaded.",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadSecurity(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadSecurity]);

  const activeCsrfToken = csrfToken ?? "";

  if (!activeCsrfToken) {
    return null;
  }

  async function runAction(action: () => Promise<void>) {
    setIsWorking(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await action();
    } catch (error) {
      if (
        error instanceof AdminApiError &&
        error.code === "ADMIN_RECENT_AUTHENTICATION_REQUIRED"
      ) {
        setShowRecentAuthentication(true);
      }
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The administrator security change could not be completed.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function confirmWithPasskey() {
    await runAction(async () => {
      const options = await startAdminPasskeyReauthentication(activeCsrfToken);

      try {
        const credential = await authenticateAdminPasskey(options.options);
        const response = await completeAdminPasskeyReauthentication(
          {
            challengeId: options.challengeId,
            response: credential,
          },
          activeCsrfToken,
        );
        setSuccessMessage(response.message);
        setShowRecentAuthentication(false);
        await refreshSession();
      } catch (error) {
        if (isPasskeyPromptCancellation(error)) {
          setSuccessMessage("Passkey confirmation was cancelled.");
          return;
        }
        throw error;
      }
    });
  }

  async function revokePasskey(credentialId: string) {
    await runAction(async () => {
      const response = await revokeAdminPasskey(
        credentialId,
        activeCsrfToken,
      );
      setPendingRevokeId(null);
      setSuccessMessage(response.message);
      await refreshSession();
      await loadSecurity();
    });
  }

  const totpAvailable = Boolean(status?.mfaEnabled);
  const recoveryAvailable =
    (status?.recoveryCodesRemaining ?? 0) > 0;
  const browserPasskeysAvailable =
    passkeysConfigured && supportsAdminPasskeys();
  const hasStrongFactor = totpAvailable || passkeys.length > 0;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
          Administration security
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          Strong verification methods
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Passkeys are preferred for administrator verification. The
          authenticator app remains a fallback, and one-time recovery codes are
          reserved for emergencies.
        </p>
      </header>

      {(errorMessage || successMessage) && (
        <p
          role={errorMessage ? "alert" : "status"}
          className={`rounded-2xl border px-4 py-3 text-sm ${
            errorMessage
              ? "border-red-300/20 bg-red-400/[0.07] text-red-100"
              : "border-emerald-300/20 bg-emerald-400/[0.07] text-emerald-100"
          }`}
        >
          {errorMessage ?? successMessage}
        </p>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="skeleton-placeholder h-36 rounded-3xl" />
          <div className="skeleton-placeholder h-36 rounded-3xl" />
          <div className="skeleton-placeholder h-36 rounded-3xl" />
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl border border-white/10 bg-slate-900/65 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">
              Passkeys
            </p>
            <p className="mt-3 text-3xl font-black text-white">
              {passkeys.length}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {passkeysConfigured
                ? "Preferred verification for sign-in and sensitive actions."
                : "WebAuthn server configuration is not enabled."}
            </p>
          </article>

          <article className="rounded-3xl border border-white/10 bg-slate-900/65 p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-300">
              Authenticator app
            </p>
            <p className="mt-3 text-lg font-black text-white">
              {totpAvailable ? "Active" : "Not enrolled"}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Six-digit rotating codes remain a supported fallback.
            </p>
          </article>

          <article
            className={`rounded-3xl border p-5 ${
              hasStrongFactor
                ? "border-emerald-300/20 bg-emerald-400/[0.06]"
                : "border-amber-300/20 bg-amber-400/[0.06]"
            }`}
          >
            <p
              className={`text-xs font-black uppercase tracking-[0.18em] ${
                hasStrongFactor ? "text-emerald-300" : "text-amber-300"
              }`}
            >
              Protection
            </p>
            <p className="mt-3 text-lg font-black text-white">
              {hasStrongFactor ? "Strong factor active" : "Setup required"}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Recovery codes remaining: {status?.recoveryCodesRemaining ?? 0}
            </p>
          </article>
        </section>
      )}

      {recoveryCodes && (
        <AdminRecoveryCodesPanel
          recoveryCodes={recoveryCodes}
          title="Save the new recovery codes"
          description="Every previous recovery code is now invalid. Store this replacement set securely."
        />
      )}

      <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
              Preferred method
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              Your administrator passkeys
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Register separate passkeys for trusted devices. A credential can
              be device-bound or synchronized by the operating system or
              password manager; FilmGeezer displays only the metadata reported
              by WebAuthn.
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-xs font-black text-slate-300">
            {passkeys.length} registered
          </span>
        </div>

        {!passkeysConfigured ? (
          <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">
            Configure the administrator WebAuthn RP name, RP ID, and exact
            origin on the server before registering passkeys.
          </p>
        ) : !supportsAdminPasskeys() ? (
          <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">
            This browser does not report WebAuthn support. Existing passkeys can
            still be used from a compatible browser.
          </p>
        ) : null}

        {passkeys.length > 0 && (
          <div className="mt-5 grid gap-3">
            {passkeys.map((passkey) => {
              const finalStrongFactor =
                passkeys.length === 1 && !totpAvailable;
              const confirming = pendingRevokeId === passkey.credentialId;

              return (
                <article
                  key={passkey.credentialId}
                  className="rounded-2xl border border-white/10 bg-slate-950/35 p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
                        <SecurityKeyIcon />
                      </span>
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-white">
                          {passkey.label}
                        </h3>
                        <p className="mt-1 text-xs font-bold text-sky-200">
                          {formatPasskeyKind(passkey)}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          Added {new Date(passkey.createdAt).toLocaleString()}
                          {passkey.lastUsedAt
                            ? ` · Last used ${new Date(passkey.lastUsedAt).toLocaleString()}`
                            : " · Not used yet"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {passkey.backedUp
                            ? "Authenticator reports this credential as backed up or synchronized."
                            : "Authenticator does not report this credential as backed up."}
                        </p>
                      </div>
                    </div>

                    {confirming ? (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => void revokePasskey(passkey.credentialId)}
                          className="min-h-10 rounded-xl border border-red-300/20 bg-red-400/10 px-4 text-xs font-black text-red-100 transition hover:bg-red-400/15 disabled:opacity-50"
                        >
                          Confirm removal
                        </button>
                        <button
                          type="button"
                          disabled={isWorking}
                          onClick={() => setPendingRevokeId(null)}
                          className="min-h-10 rounded-xl border border-white/10 px-4 text-xs font-bold text-slate-300 transition hover:bg-white/[0.04]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isWorking || finalStrongFactor}
                        onClick={() => setPendingRevokeId(passkey.credentialId)}
                        className="min-h-10 shrink-0 rounded-xl border border-white/10 px-4 text-xs font-bold text-slate-300 transition hover:border-red-300/20 hover:bg-red-400/[0.06] hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                        title={
                          finalStrongFactor
                            ? "Set up an authenticator app or another passkey first."
                            : undefined
                        }
                      >
                        Remove passkey
                      </button>
                    )}
                  </div>

                  {finalStrongFactor && (
                    <p className="mt-3 rounded-xl border border-amber-300/15 bg-amber-400/[0.05] px-3 py-2 text-xs leading-5 text-amber-100">
                      This is your final strong verification method. Register
                      another passkey or an authenticator app before removing it.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {browserPasskeysAvailable && (
        <AdminPasskeySetupFlow
          csrfToken={activeCsrfToken}
          title={passkeys.length > 0 ? "Add another passkey" : "Register your first passkey"}
          submitLabel="Register passkey"
          completeLabel="Return to security"
          onRecentAuthenticationRequired={() => {
            setShowRecentAuthentication(true);
          }}
          onComplete={async (response) => {
            setRecoveryCodes(response.recoveryCodes);
            setSuccessMessage(response.message);
            await refreshSession();
            await loadSecurity();
          }}
        />
      )}

      <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
          Fallback method
        </p>
        <h2 className="mt-2 text-xl font-black text-white">
          Authenticator app
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Keep a TOTP authenticator as a fallback, especially while you are
          testing passkeys across devices.
        </p>

        {!status?.configured ? (
          <p className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">
            Administrator TOTP encryption and recovery secrets are not
            configured on this server.
          </p>
        ) : !totpAvailable ? (
          <div className="mt-5">
            <AdminMfaSetupFlow
              csrfToken={activeCsrfToken}
              requirePassword
              onComplete={async () => {
                await refreshSession();
                await loadSecurity();
              }}
            />
          </div>
        ) : passkeys.length > 0 ? (
          <div className="mt-5 max-w-2xl">
            <ProofForm
              key="totp-removal"
              title="Remove authenticator-app fallback"
              description="Your registered passkeys remain active. Every administrator session will close after removal."
              submitLabel="Remove and sign out"
              danger
              isWorking={isWorking}
              totpAvailable={totpAvailable}
              recoveryAvailable={recoveryAvailable}
              onSubmit={async (fields) => {
                await runAction(async () => {
                  await disableAdminMfa(fields, activeCsrfToken);
                  await signOut();
                });
              }}
            />
          </div>
        ) : (
          <p className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.06] px-4 py-3 text-sm leading-6 text-emerald-100">
            The authenticator app is your current strong verification method.
            Register a passkey before removing it.
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/55 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">
              Emergency fallback
            </p>
            <h2 className="mt-2 text-xl font-black text-white">
              One-time recovery codes
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Keep these codes offline and use them only when your passkeys and
              authenticator app are unavailable. Generating a replacement set
              immediately invalidates every previous recovery code.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-xs font-black text-slate-300">
            {status?.recoveryCodesRemaining ?? 0} remaining
          </span>
        </div>

        <button
          type="button"
          disabled={isWorking || !hasStrongFactor}
          onClick={() =>
            void runAction(async () => {
              const response =
                await regenerateAdminMfaRecoveryCodesWithRecentAuthentication(
                  activeCsrfToken,
                );
              setRecoveryCodes(response.recoveryCodes);
              setSuccessMessage(response.message);
              await refreshSession();
              await loadSecurity();
            })
          }
          className="mt-5 min-h-11 rounded-xl border border-amber-300/20 bg-amber-400/[0.08] px-4 text-sm font-black text-amber-100 transition hover:bg-amber-400/[0.13] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isWorking ? "Working…" : "Generate replacement codes"}
        </button>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          A recent passkey or password-plus-fallback confirmation is required.
        </p>
      </section>

      <section
        className={`rounded-3xl border p-5 sm:p-6 ${
          showRecentAuthentication
            ? "border-sky-300/25 bg-sky-400/[0.06]"
            : "border-white/10 bg-slate-900/45"
        }`}
      >
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
          Sensitive actions
        </p>
        <h2 className="mt-2 text-xl font-black text-white">
          Confirm recent administrator authentication
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Passkey registration and removal require a recent verification window.
          Passkey confirmation is preferred; password plus authenticator or
          recovery code remains available.
        </p>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {passkeys.length > 0 && supportsAdminPasskeys() && (
            <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
              <h3 className="text-sm font-black text-white">
                Confirm with passkey
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Your device will require fingerprint, face, PIN, or security-key
                verification according to its own secure policy.
              </p>
              <button
                type="button"
                disabled={isWorking}
                onClick={() => void confirmWithPasskey()}
                className="mt-4 min-h-10 rounded-xl bg-sky-500 px-4 text-sm font-black text-white transition hover:bg-sky-400 disabled:opacity-50"
              >
                {isWorking ? "Waiting for your device…" : "Verify with passkey"}
              </button>
            </div>
          )}

          <ProofForm
            key={`recent-${totpAvailable}-${recoveryAvailable}`}
            title="Use another method"
            description="Confirm the FilmGeezer password and a configured fallback method."
            submitLabel="Confirm identity"
            isWorking={isWorking}
            totpAvailable={totpAvailable}
            recoveryAvailable={recoveryAvailable}
            onSubmit={async (fields) => {
              await runAction(async () => {
                const response = await reauthenticateAdmin(
                  fields,
                  activeCsrfToken,
                );
                setSuccessMessage(response.message);
                setShowRecentAuthentication(false);
                await refreshSession();
              });
            }}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-slate-900/45 p-5 sm:p-6">
        <h2 className="text-sm font-black text-white">Current session</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Access
            </dt>
            <dd className="mt-1 font-bold text-slate-200">
              {session?.accessLevel ?? "Unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Recently confirmed
            </dt>
            <dd className="mt-1 font-bold text-slate-200">
              {session
                ? new Date(session.recentAuthenticationAt).toLocaleString()
                : "Unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Session expires
            </dt>
            <dd className="mt-1 font-bold text-slate-200">
              {session
                ? new Date(session.expiresAt).toLocaleString()
                : "Unknown"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
