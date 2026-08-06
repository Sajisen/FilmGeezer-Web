import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

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

export default function AdminRecentAuthenticationDialog({
  open,
  csrfToken,
  passkeyAvailable,
  totpAvailable,
  recoveryAvailable,
  onClose,
  onConfirmed,
}: {
  open: boolean;
  csrfToken: string;
  passkeyAvailable: boolean;
  totpAvailable: boolean;
  recoveryAvailable: boolean;
  onClose: () => void;
  onConfirmed: () => Promise<void>;
}) {
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

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const timer = window.setTimeout(() => {
      setPassword("");
      setCode("");
      setMethod(totpAvailable ? "totp" : "recovery");
      setErrorMessage(null);

      dialogRef.current
        ?.querySelector<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled])",
        )
        ?.focus();
    }, 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !workingRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled])",
        ) ?? [],
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousActiveElement?.focus();
    };
  }, [open, totpAvailable]);

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

  if (!open) {
    return null;
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
              <p className="mt-2 text-sm leading-6 text-slate-400">
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
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                placeholder="Administrator password"
                className="min-h-12 w-full rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/40"
              />

              <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                {totpAvailable && recoveryAvailable ? (
                  <select
                    value={method}
                    onChange={(event) => {
                      setMethod(
                        event.target.value as "totp" | "recovery",
                      );
                      setCode("");
                    }}
                    className="min-h-12 rounded-2xl border border-white/[0.08] bg-slate-950/45 px-3 text-sm font-bold text-slate-200 outline-none focus:border-sky-300/40"
                  >
                    <option value="totp">Authenticator</option>
                    <option value="recovery">Recovery code</option>
                  </select>
                ) : (
                  <div className="flex min-h-12 items-center rounded-2xl border border-white/[0.07] bg-slate-950/30 px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                    {totpAvailable
                      ? "Authenticator"
                      : "Recovery code"}
                  </div>
                )}

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
                  className="min-h-12 rounded-2xl border border-white/[0.08] bg-slate-950/45 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/40"
                />
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
