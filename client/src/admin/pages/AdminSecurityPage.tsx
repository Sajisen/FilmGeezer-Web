import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useAdminAuth } from "../auth/adminAuthContext";
import {
  disableAdminMfa,
  getAdminMfaStatus,
  reauthenticateAdmin,
  regenerateAdminMfaRecoveryCodes,
} from "../services/adminService";
import AdminMfaSetupFlow from "../security/AdminMfaSetupFlow";
import type { AdminMfaStatusResponse } from "../types/admin";
import { copyTextToClipboard } from "../../utils/copyTextToClipboard";

interface ProofFields {
  password: string;
  method: "totp" | "recovery";
  code: string;
}

const EMPTY_PROOF: ProofFields = {
  password: "",
  method: "totp",
  code: "",
};

function ProofForm({
  title,
  description,
  submitLabel,
  danger = false,
  isWorking,
  onSubmit,
}: {
  title: string;
  description: string;
  submitLabel: string;
  danger?: boolean;
  isWorking: boolean;
  onSubmit: (fields: ProofFields) => Promise<void>;
}) {
  const [fields, setFields] = useState<ProofFields>(EMPTY_PROOF);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit(fields);
    setFields(EMPTY_PROOF);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-slate-950/35 p-4">
      <h3 className="text-sm font-black text-white">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>

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
        <label className="text-xs font-bold text-slate-400">
          Verification method
          <select
            value={fields.method}
            onChange={(event) =>
              setFields((current) => ({
                ...current,
                method: event.target.value as "totp" | "recovery",
              }))
            }
            className="ml-2 rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-slate-200"
          >
            <option value="totp">Authenticator</option>
            <option value="recovery">Recovery code</option>
          </select>
        </label>

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

export default function AdminSecurityPage() {
  const {
    csrfToken,
    session,
    refreshSession,
    signOut,
  } = useAdminAuth();
  const [status, setStatus] =
    useState<AdminMfaStatusResponse["security"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const loadStatus = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await getAdminMfaStatus(signal);
      setStatus(response.security);
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
      void loadStatus(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadStatus]);

  if (!csrfToken) {
    return null;
  }

  async function runAction(action: () => Promise<void>) {
    setIsWorking(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await action();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The administrator security change could not be completed.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300">
          Administration security
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          MFA and recent authentication
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          Protect privileged sessions before FilmGeezer adds user suspension, role changes, content edits, and other sensitive operations.
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
        <div className="skeleton-placeholder h-56 rounded-3xl" />
      ) : !status?.configured ? (
        <section className="rounded-3xl border border-amber-300/20 bg-amber-400/[0.06] p-5 sm:p-6">
          <h2 className="text-lg font-black text-amber-100">
            Server MFA secrets are not configured
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Run the server MFA-secret generator, add both values to the server environment, and restart the API before enrolling an authenticator.
          </p>
        </section>
      ) : !status.mfaEnabled ? (
        <AdminMfaSetupFlow
          csrfToken={csrfToken}
          requirePassword
          onComplete={async () => {
            await refreshSession();
            await loadStatus();
          }}
        />
      ) : (
        <>
          <section className="rounded-3xl border border-white/10 bg-slate-900/65 p-5 shadow-xl shadow-black/15 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  Authenticator active
                </p>
                <h2 className="mt-2 text-xl font-black text-white">
                  Administrator MFA is enabled
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Recovery codes remaining: {status.recoveryCodesRemaining}. Keep at least two secure copies outside this browser.
                </p>
              </div>
              <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-black text-emerald-200">
                Protected
              </span>
            </div>
          </section>

          {recoveryCodes && (
            <section className="rounded-3xl border border-sky-300/20 bg-sky-400/[0.06] p-5 sm:p-6">
              <h2 className="text-lg font-black text-white">
                Save the new recovery codes
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                The previous recovery-code set is now invalid.
              </p>
              <div className="mt-4 grid gap-2 rounded-2xl bg-slate-950/60 p-4 font-mono text-sm sm:grid-cols-2">
                {recoveryCodes.map((code) => (
                  <code key={code} className="rounded-lg bg-white/[0.035] px-3 py-2 text-sky-100">
                    {code}
                  </code>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  void copyTextToClipboard(recoveryCodes.join("\n")).then(
                    (copied) => setCopyStatus(copied ? "Copied" : "Copy failed"),
                  );
                }}
                className="mt-4 min-h-10 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-200"
              >
                {copyStatus ?? "Copy all codes"}
              </button>
            </section>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <ProofForm
              title="Generate a new recovery-code set"
              description="Every previous recovery code becomes invalid immediately."
              submitLabel="Generate codes"
              isWorking={isWorking}
              onSubmit={async (fields) => {
                await runAction(async () => {
                  const response = await regenerateAdminMfaRecoveryCodes(
                    fields,
                    csrfToken,
                  );
                  setRecoveryCodes(response.recoveryCodes);
                  setSuccessMessage(response.message);
                  await refreshSession();
                  await loadStatus();
                });
              }}
            />

            <ProofForm
              title="Confirm identity for sensitive actions"
              description="Creates a ten-minute recent-authentication window for upcoming protected operations."
              submitLabel="Confirm identity"
              isWorking={isWorking}
              onSubmit={async (fields) => {
                await runAction(async () => {
                  const response = await reauthenticateAdmin(fields, csrfToken);
                  setSuccessMessage(response.message);
                  await refreshSession();
                });
              }}
            />
          </div>

          {!status.mfaRequiredByPolicy && (
            <ProofForm
              title="Disable administrator MFA"
              description="All administrator sessions will close. This option disappears when production policy requires MFA."
              submitLabel="Disable and sign out"
              danger
              isWorking={isWorking}
              onSubmit={async (fields) => {
                await runAction(async () => {
                  await disableAdminMfa(fields, csrfToken);
                  await signOut();
                });
              }}
            />
          )}
        </>
      )}

      <section className="rounded-3xl border border-white/10 bg-slate-900/45 p-5 sm:p-6">
        <h2 className="text-sm font-black text-white">Current session</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Access</dt>
            <dd className="mt-1 font-bold text-slate-200">{session?.accessLevel ?? "Unknown"}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Recently confirmed</dt>
            <dd className="mt-1 font-bold text-slate-200">
              {session ? new Date(session.recentAuthenticationAt).toLocaleString() : "Unknown"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Session expires</dt>
            <dd className="mt-1 font-bold text-slate-200">
              {session ? new Date(session.expiresAt).toLocaleString() : "Unknown"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
