import {
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  completeAdminMfaSetup,
  startAdminMfaSetup,
} from "../services/adminService";
import type { AdminMfaSetupResponse } from "../types/admin";
import AdminRecoveryCodesPanel from "./AdminRecoveryCodesPanel";

interface AdminMfaSetupFlowProps {
  csrfToken: string;
  requirePassword: boolean;
  onComplete: () => Promise<void>;
}

export default function AdminMfaSetupFlow({
  csrfToken,
  requirePassword,
  onComplete,
}: AdminMfaSetupFlowProps) {
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<AdminMfaSetupResponse["setup"] | null>(null);
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);

  async function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isWorking) {
      return;
    }

    setIsWorking(true);
    setErrorMessage(null);

    try {
      const response = await startAdminMfaSetup(
        requirePassword ? { password } : {},
        csrfToken,
      );
      setSetup(response.setup);
      setPassword("");

      window.setTimeout(() => {
        codeInputRef.current?.focus();
      }, 0);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Administrator MFA setup could not be started.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!setup || isWorking) {
      return;
    }

    setIsWorking(true);
    setErrorMessage(null);

    try {
      const response = await completeAdminMfaSetup(
        { setupId: setup.setupId, code },
        csrfToken,
      );
      setRecoveryCodes(response.recoveryCodes);
      setSetup(null);
      setCode("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The authenticator code could not be verified.",
      );

      window.setTimeout(() => {
        codeInputRef.current?.focus();
      }, 0);
    } finally {
      setIsWorking(false);
    }
  }

  if (recoveryCodes) {
    return (
      <AdminRecoveryCodesPanel
        recoveryCodes={recoveryCodes}
        title="Save your administrator recovery codes now"
        description="MFA is enabled. Each code works once, and FilmGeezer will not show this set again. Store the codes outside this browser and outside the device that holds your authenticator app."
        requireAcknowledgement
        continueLabel="Continue to administration"
        isWorking={isWorking}
        onContinue={async () => {
          setIsWorking(true);

          try {
            await onComplete();
          } finally {
            setIsWorking(false);
          }
        }}
      />
    );
  }

  if (setup) {
    return (
      <section
        aria-labelledby="admin-mfa-verify-title"
        aria-busy={isWorking}
        className="rounded-[1.75rem] border border-white/[0.075] bg-slate-900/55 p-5 shadow-xl shadow-black/[0.08] sm:p-6"
      >
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
          Authenticator setup
        </p>
        <h2 id="admin-mfa-verify-title" className="mt-2 text-xl font-black text-white">
          Scan, then verify one code
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Use Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden, or another TOTP-compatible app.
        </p>

        {errorMessage && (
          <p role="alert" className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-100">
            {errorMessage}
          </p>
        )}

        <div className="mt-5 grid gap-5 lg:grid-cols-[17rem_1fr] lg:items-center">
          <div className="rounded-2xl bg-white p-3">
            <img
              src={setup.qrDataUrl}
              alt="FilmGeezer administrator MFA QR code"
              className="mx-auto aspect-square w-full max-w-64"
            />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-200">
              Cannot scan the QR code?
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Enter this secret manually. Treat it like a password.
            </p>
            <code className="mt-3 block break-all rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 py-3 text-sm font-bold tracking-[0.12em] text-sky-200">
              {setup.secret}
            </code>

            <form
              onSubmit={handleVerify}
              aria-busy={isWorking}
              className="mt-5"
            >
              <label className="block">
                <span className="text-sm font-bold text-slate-200">
                  Six-digit authenticator code
                </span>
                <input
                  ref={codeInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  disabled={isWorking}
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 text-sm text-white outline-none focus:border-sky-300/45 focus:ring-2 focus:ring-sky-400/15 disabled:cursor-wait disabled:opacity-60"
                  placeholder="000000"
                />
              </label>
              <button
                type="submit"
                disabled={isWorking || code.length !== 6}
                className="mt-4 min-h-12 w-full rounded-2xl bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
              >
                {isWorking ? "Verifying…" : "Enable administrator MFA"}
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={handleStart}
      aria-busy={isWorking}
      className="rounded-[1.75rem] border border-white/[0.075] bg-slate-900/55 p-5 shadow-xl shadow-black/[0.08] sm:p-6"
    >
      <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
        Authenticator app
      </p>
      <h2 className="mt-2 text-xl font-black text-white">
        Protect administrator access with MFA
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        After setup, a password alone cannot create a privileged administrator session.
      </p>

      {errorMessage && (
        <p role="alert" className="mt-4 rounded-2xl border border-red-300/20 bg-red-400/[0.07] px-4 py-3 text-sm text-red-100">
          {errorMessage}
        </p>
      )}

      {requirePassword && (
        <label className="mt-5 block">
          <span className="text-sm font-bold text-slate-200">
            Confirm your FilmGeezer password
          </span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isWorking}
            required
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 text-sm text-white outline-none focus:border-sky-300/45 focus:ring-2 focus:ring-sky-400/15 disabled:cursor-wait disabled:opacity-60"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={isWorking}
        className="mt-5 min-h-12 rounded-2xl bg-sky-500 px-6 text-sm font-black text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:opacity-50"
      >
        {isWorking ? "Preparing…" : "Start MFA setup"}
      </button>
    </form>
  );
}
