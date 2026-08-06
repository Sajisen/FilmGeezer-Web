import {
  useState,
  type FormEvent,
} from "react";

import {
  completeAdminMfaSetup,
  startAdminMfaSetup,
} from "../services/adminService";
import type { AdminMfaSetupResponse } from "../types/admin";
import { copyTextToClipboard } from "../../utils/copyTextToClipboard";

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
  const [hasSavedCodes, setHasSavedCodes] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    } finally {
      setIsWorking(false);
    }
  }

  async function handleCopyCodes() {
    if (!recoveryCodes) {
      return;
    }

    const copied = await copyTextToClipboard(recoveryCodes.join("\n"));
    setCopyStatus(copied ? "Copied" : "Copy failed");
  }

  if (recoveryCodes) {
    return (
      <section className="rounded-[1.75rem] border border-emerald-300/15 bg-emerald-400/[0.05] p-5 shadow-xl shadow-black/[0.08] sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
          MFA enabled
        </p>
        <h2 className="mt-2 text-xl font-black text-white">
          Save your recovery codes now
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Each code works once. FilmGeezer will not show this set again. Store them outside this browser and outside the device that holds your authenticator app.
        </p>

        <div className="mt-5 grid gap-2 rounded-2xl border border-white/[0.08] bg-slate-950/45 p-4 font-mono text-sm text-slate-200 sm:grid-cols-2">
          {recoveryCodes.map((recoveryCode) => (
            <code key={recoveryCode} className="rounded-lg bg-white/[0.035] px-3 py-2">
              {recoveryCode}
            </code>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => void handleCopyCodes()}
            className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-200 transition hover:bg-white/[0.04]"
          >
            {copyStatus ?? "Copy all codes"}
          </button>
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-300">
            <input
              type="checkbox"
              checked={hasSavedCodes}
              onChange={(event) => setHasSavedCodes(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-950"
            />
            I stored these codes somewhere safe.
          </label>
        </div>

        <button
          type="button"
          disabled={!hasSavedCodes || isWorking}
          onClick={() => {
            setIsWorking(true);
            void onComplete().finally(() => setIsWorking(false));
          }}
          className="mt-5 min-h-12 w-full rounded-2xl bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isWorking ? "Finishing…" : "Continue to administration"}
        </button>
      </section>
    );
  }

  if (setup) {
    return (
      <section className="rounded-[1.75rem] border border-white/[0.075] bg-slate-900/55 p-5 shadow-xl shadow-black/[0.08] sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
          Authenticator setup
        </p>
        <h2 className="mt-2 text-xl font-black text-white">
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

            <form onSubmit={handleVerify} className="mt-5">
              <label className="block">
                <span className="text-sm font-bold text-slate-200">
                  Six-digit authenticator code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  required
                  maxLength={6}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 text-sm text-white outline-none focus:border-sky-300/45 focus:ring-2 focus:ring-sky-400/15"
                  placeholder="000000"
                />
              </label>
              <button
                type="submit"
                disabled={isWorking}
                className="mt-4 min-h-12 w-full rounded-2xl bg-sky-500 px-5 text-sm font-black text-white transition hover:bg-sky-400 disabled:opacity-50"
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
    <form onSubmit={handleStart} className="rounded-[1.75rem] border border-white/[0.075] bg-slate-900/55 p-5 shadow-xl shadow-black/[0.08] sm:p-6">
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
            required
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 text-sm text-white outline-none focus:border-sky-300/45 focus:ring-2 focus:ring-sky-400/15"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={isWorking}
        className="mt-5 min-h-12 rounded-2xl bg-sky-500 px-6 text-sm font-black text-white transition hover:bg-sky-400 disabled:opacity-50"
      >
        {isWorking ? "Preparing…" : "Start MFA setup"}
      </button>
    </form>
  );
}
