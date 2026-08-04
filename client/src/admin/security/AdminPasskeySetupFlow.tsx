import { useState, type FormEvent } from "react";

import {
  AdminApiError,
  completeAdminPasskeyRegistration,
  startAdminPasskeyRegistration,
} from "../services/adminService";
import type {
  AdminPasskeyAttachment,
  AdminPasskeyRegistrationResponse,
} from "../types/admin";
import {
  createAdminPasskey,
  isPasskeyPromptCancellation,
  supportsAdminPasskeys,
} from "./adminPasskeyBrowser";
import AdminRecoveryCodesPanel from "./AdminRecoveryCodesPanel";

interface AdminPasskeySetupFlowProps {
  csrfToken: string;
  title?: string;
  description?: string;
  submitLabel?: string;
  completeLabel?: string;
  onRecentAuthenticationRequired?: () => void;
  onComplete: (
    response: AdminPasskeyRegistrationResponse,
  ) => Promise<void>;
}

function PasskeyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-6 w-6"
    >
      <path
        d="M8.5 14.5a5.5 5.5 0 1 1 4.8 2.75V20m0 0h2.2m-2.2 0h-2.1"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="9" r="1.25" fill="currentColor" />
    </svg>
  );
}

export default function AdminPasskeySetupFlow({
  csrfToken,
  title = "Register a passkey",
  description = "Use Windows Hello, your phone, or a hardware security key. FilmGeezer stores only the public credential and never receives your fingerprint, face data, device PIN, or private key.",
  submitLabel = "Create passkey",
  completeLabel = "Continue to administration",
  onRecentAuthenticationRequired,
  onComplete,
}: AdminPasskeySetupFlowProps) {
  const [label, setLabel] = useState("");
  const [attachment, setAttachment] =
    useState<AdminPasskeyAttachment>("platform");
  const [registration, setRegistration] =
    useState<AdminPasskeyRegistrationResponse | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const browserSupported = supportsAdminPasskeys();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isWorking || !browserSupported) return;

    setIsWorking(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const options = await startAdminPasskeyRegistration(
        { label, attachment },
        csrfToken,
      );
      const credential = await createAdminPasskey(options.options);
      const response = await completeAdminPasskeyRegistration(
        {
          challengeId: options.challengeId,
          response: credential,
        },
        csrfToken,
      );

      setRegistration(response);
      setLabel("");

      if (!response.recoveryCodes) {
        await onComplete(response);
        setRegistration(null);
      }
    } catch (error) {
      if (isPasskeyPromptCancellation(error)) {
        setStatusMessage("Passkey setup was cancelled. No changes were made.");
        return;
      }

      if (
        error instanceof AdminApiError &&
        error.code === "ADMIN_RECENT_AUTHENTICATION_REQUIRED"
      ) {
        onRecentAuthenticationRequired?.();
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The administrator passkey could not be registered.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  if (registration?.recoveryCodes) {
    return (
      <AdminRecoveryCodesPanel
        recoveryCodes={registration.recoveryCodes}
        requireAcknowledgement
        continueLabel={completeLabel}
        isWorking={isWorking}
        onContinue={async () => {
          setIsWorking(true);
          try {
            await onComplete(registration);
            setRegistration(null);
          } finally {
            setIsWorking(false);
          }
        }}
      />
    );
  }

  return (
    <section className="rounded-[1.75rem] border border-sky-300/15 bg-slate-900/55 p-5 shadow-xl shadow-black/[0.08] sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
          <PasskeyIcon />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
            Recommended
          </p>
          <h2 className="mt-1 text-xl font-black text-white">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>
      </div>

      {!browserSupported ? (
        <p
          role="alert"
          className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.07] px-4 py-3 text-sm leading-6 text-amber-100"
        >
          This browser does not expose WebAuthn passkeys. Use a current version
          of Edge, Chrome, Firefox, or Safari, or choose the authenticator-app
          method.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {(errorMessage || statusMessage) && (
            <p
              role={errorMessage ? "alert" : "status"}
              className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
                errorMessage
                  ? "border-red-300/20 bg-red-400/[0.07] text-red-100"
                  : "border-sky-300/20 bg-sky-400/[0.07] text-sky-100"
              }`}
            >
              {errorMessage ?? statusMessage}
            </p>
          )}

          <label className="block">
            <span className="text-sm font-bold text-slate-200">
              Device label
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-500">
              Use a name you will recognize later, such as “Personal Windows
              laptop” or “Backup security key”.
            </span>
            <input
              type="text"
              autoComplete="off"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              required
              minLength={2}
              maxLength={64}
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/45 focus:ring-2 focus:ring-sky-400/15"
              placeholder="Personal Windows laptop"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-bold text-slate-200">
              Where should this passkey live?
            </legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  attachment === "platform"
                    ? "border-sky-300/35 bg-sky-400/[0.08]"
                    : "border-white/10 bg-slate-950/35 hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="passkey-attachment"
                  value="platform"
                  checked={attachment === "platform"}
                  onChange={() => setAttachment("platform")}
                  className="sr-only"
                />
                <span className="block text-sm font-black text-white">
                  This device
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Prefer Windows Hello, Touch ID, Face ID, or this device’s
                  secure unlock.
                </span>
              </label>

              <label
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  attachment === "cross-platform"
                    ? "border-sky-300/35 bg-sky-400/[0.08]"
                    : "border-white/10 bg-slate-950/35 hover:border-white/20"
                }`}
              >
                <input
                  type="radio"
                  name="passkey-attachment"
                  value="cross-platform"
                  checked={attachment === "cross-platform"}
                  onChange={() => setAttachment("cross-platform")}
                  className="sr-only"
                />
                <span className="block text-sm font-black text-white">
                  Security key or another device
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Use a hardware key or a browser-supported nearby-device flow.
                </span>
              </label>
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={isWorking || label.trim().length < 2}
            className="min-h-12 rounded-2xl bg-sky-500 px-6 text-sm font-black text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isWorking ? "Waiting for your device…" : submitLabel}
          </button>
        </form>
      )}
    </section>
  );
}
