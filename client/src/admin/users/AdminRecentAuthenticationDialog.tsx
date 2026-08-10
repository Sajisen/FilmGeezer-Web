import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { useModalAccessibility } from "../../hooks/useModalAccessibility";

import AdminIcon from "../components/AdminIcon";
import {
  completeAdminPasskeyReauthentication,
  reauthenticateAdmin,
  startAdminPasskeyReauthentication,
} from "../services/adminService";
import {
  authenticateAdminPasskey,
  isPasskeyPromptCancellation,
  supportsAdminPasskeys,
} from "../security/adminPasskeyBrowser";

interface AdminRecentAuthenticationDialogProps {
  open: boolean;
  csrfToken: string;
  passkeyAvailable: boolean;
  totpAvailable: boolean;
  recoveryAvailable: boolean;
  onClose: () => void;
  onConfirmed: () => Promise<void>;
}

export default function AdminRecentAuthenticationDialog({
  open,
  csrfToken,
  passkeyAvailable,
  totpAvailable,
  recoveryAvailable,
  onClose,
  onConfirmed,
}: AdminRecentAuthenticationDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <OpenAdminRecentAuthenticationDialog
      key={`${passkeyAvailable}:${totpAvailable}:${recoveryAvailable}`}
      csrfToken={csrfToken}
      passkeyAvailable={passkeyAvailable}
      totpAvailable={totpAvailable}
      recoveryAvailable={recoveryAvailable}
      onClose={onClose}
      onConfirmed={onConfirmed}
    />
  );
}

function OpenAdminRecentAuthenticationDialog({
  csrfToken,
  passkeyAvailable,
  totpAvailable,
  recoveryAvailable,
  onClose,
  onConfirmed,
}: Omit<AdminRecentAuthenticationDialogProps, "open">) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const workingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const [password, setPassword] = useState("");
  const [method, setMethod] = useState<"totp" | "recovery">(
    totpAvailable ? "totp" : "recovery",
  );
  const [code, setCode] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);


  useEffect(() => {
    workingRef.current = isWorking;
  }, [isWorking]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const canUsePasskey =
    passkeyAvailable && supportsAdminPasskeys();
  const canUseFallback = totpAvailable || recoveryAvailable;

  useModalAccessibility({
    isOpen: true,
    dialogRef,
    initialFocusSelector: "[data-admin-recent-auth-initial]",
    onEscape: onClose,
    escapeEnabled: !isWorking,
  });

  async function finishConfirmation(action: () => Promise<void>) {
    setIsWorking(true);
    setErrorMessage(null);

    try {
      await action();
      await onConfirmed();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Administrator identity could not be confirmed.",
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function confirmWithPasskey() {
    await finishConfirmation(async () => {
      const options =
        await startAdminPasskeyReauthentication(csrfToken);

      try {
        const credential = await authenticateAdminPasskey(
          options.options,
        );
        await completeAdminPasskeyReauthentication(
          {
            challengeId: options.challengeId,
            response: credential,
          },
          csrfToken,
        );
      } catch (error) {
        if (isPasskeyPromptCancellation(error)) {
          throw new Error("Passkey confirmation was cancelled.", {
            cause: error,
          });
        }

        throw error;
      }
    });
  }

  async function handleFallbackSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    await finishConfirmation(async () => {
      await reauthenticateAdmin(
        {
          password,
          method,
          code,
        },
        csrfToken,
      );
    });
  }

  function preventBackdropKeyboardActivation(
    event: ReactKeyboardEvent<HTMLDivElement>,
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-slate-950/75 px-4 py-8 backdrop-blur-md"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !workingRef.current
        ) {
          onCloseRef.current();
        }
      }}
      onKeyDown={preventBackdropKeyboardActivation}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-recent-authentication-title"
        aria-describedby="admin-recent-authentication-description"
        aria-busy={isWorking}
        className="w-full max-w-xl overflow-hidden rounded-[1.75rem] border border-white/[0.1] bg-slate-900 shadow-2xl shadow-black/50"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-5 py-5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-200">
              <AdminIcon name="lock" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.2em] text-sky-300">
                Sensitive administrator action
              </p>
              <h2
                id="admin-recent-authentication-title"
                className="mt-1 text-xl font-black text-white"
              >
                Confirm your identity
              </h2>
              <p
                id="admin-recent-authentication-description"
                className="mt-2 text-sm leading-6 text-slate-400"
              >
                FilmGeezer requires a fresh strong verification before
                changing another account or revoking its sessions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isWorking}
            aria-label="Close identity confirmation"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] text-slate-400 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
          >
            <AdminIcon name="close" className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
          {errorMessage ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-300/15 bg-red-400/[0.08] px-4 py-3 text-sm font-bold text-red-100"
            >
              {errorMessage}
            </div>
          ) : null}

          {canUsePasskey ? (
            <button
              type="button"
              data-admin-recent-auth-initial
              onClick={() => void confirmWithPasskey()}
              disabled={isWorking}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 text-sm font-black text-white transition hover:bg-sky-400 disabled:cursor-wait disabled:opacity-60"
            >
              <AdminIcon name="key" className="h-4 w-4" />
              {isWorking
                ? "Waiting for passkey…"
                : "Confirm with passkey"}
            </button>
          ) : null}

          {canUsePasskey && canUseFallback ? (
            <div className="flex items-center gap-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-slate-600">
              <span className="h-px flex-1 bg-white/[0.07]" />
              Use another method
              <span className="h-px flex-1 bg-white/[0.07]" />
            </div>
          ) : null}

          {canUseFallback ? (
            <form onSubmit={handleFallbackSubmit} className="space-y-3">
              <label className="block">
                <span className="sr-only">Administrator password</span>
                <input
                  type="password"
                  data-admin-recent-auth-initial={
                    canUsePasskey ? undefined : "true"
                  }
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="Administrator password"
                  className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/40"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                {totpAvailable && recoveryAvailable ? (
                  <label className="block">
                    <span className="sr-only">Verification method</span>
                    <select
                      value={method}
                      onChange={(event) => {
                        setMethod(
                          event.target.value as "totp" | "recovery",
                        );
                        setCode("");
                      }}
                      className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/45 px-3 text-sm font-bold text-slate-200 outline-none focus:border-sky-300/40"
                    >
                      <option value="totp">Authenticator</option>
                      <option value="recovery">Recovery code</option>
                    </select>
                  </label>
                ) : (
                  <div className="flex min-h-12 items-center rounded-2xl border border-white/[0.07] bg-slate-950/30 px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    {totpAvailable
                      ? "Authenticator"
                      : "Recovery code"}
                  </div>
                )}

                <label className="block">
                  <span className="sr-only">
                    {method === "totp"
                      ? "Six-digit authenticator code"
                      : "Recovery code"}
                  </span>
                  <input
                    type="text"
                    inputMode={method === "totp" ? "numeric" : "text"}
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    required
                    placeholder={
                      method === "totp"
                        ? "Six-digit code"
                        : "Recovery code"
                    }
                    className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/40"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isWorking}
                className="min-h-11 w-full rounded-2xl border border-sky-300/20 bg-sky-400/[0.08] px-4 text-sm font-black text-sky-100 transition hover:bg-sky-400/[0.12] disabled:cursor-wait disabled:opacity-60"
              >
                {isWorking ? "Confirming…" : "Confirm identity"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
