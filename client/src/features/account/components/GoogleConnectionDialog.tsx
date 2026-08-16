import {
  useRef,
  useState,
  type MouseEvent,
} from "react";

import {
  useModalAccessibility,
} from "../../../hooks/useModalAccessibility";

import {
  disconnectAccountGoogleConnection,
  replaceAccountGoogleConnection,
} from "../../../services/accountService";

import GoogleIdentityButton from "../../auth/components/GoogleIdentityButton";

import type {
  AccountGoogleConnectionChangeResponse,
  AccountGoogleDisconnectResponse,
} from "../../../types/account";
import AccountIcon from "./AccountSectionIcons";

interface GoogleConnectionDialogProps {
  csrfToken: string;
  accountEmail: string;
  googleEmail: string | null;
  connected: boolean;
  onCancel: () => void;
  onChanged: (response: AccountGoogleConnectionChangeResponse) => Promise<void> | void;
  onDisconnected: (response: AccountGoogleDisconnectResponse) => Promise<void> | void;
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none">
      <path
        d="m6.5 6.5 11 11m0-11-11 11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GoogleConnectionDialog({
  csrfToken,
  accountEmail,
  googleEmail,
  connected,
  onCancel,
  onChanged,
  onDisconnected,
}: GoogleConnectionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const googleEmailMismatch =
    connected &&
    googleEmail !== null &&
    googleEmail.trim().toLowerCase() !==
      accountEmail.trim().toLowerCase();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useModalAccessibility({
    isOpen: true,
    dialogRef,
    initialFocusSelector: "button",
    onEscape: onCancel,
    escapeEnabled: !isSubmitting,
  });

  async function handleCredential(credential: string) {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await replaceAccountGoogleConnection(
        credential,
        csrfToken,
      );
      await onChanged(response);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not update Google sign-in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDisconnect() {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await disconnectAccountGoogleConnection(csrfToken);
      await onDisconnected(response);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not disconnect Google sign-in.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[220] grid place-items-center overflow-y-auto bg-slate-950/80 px-4 py-6 backdrop-blur-md sm:py-10"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-connection-title"
        aria-busy={isSubmitting}
        className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900 shadow-2xl shadow-black/60"
      >
        <div className="relative border-b border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_55%)] px-5 pb-5 pt-6 sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Close Google sign-in settings"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-slate-950/55 text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50"
          >
            <CloseIcon />
          </button>

          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
            <AccountIcon name="shield" />
          </span>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
            Sign-in method
          </p>
          <h2 id="google-connection-title" className="mt-2 pr-10 text-2xl font-black tracking-tight text-white">
            Manage Google sign-in
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {googleEmailMismatch
              ? "This older Google connection uses a different email. Reconnect Google using your FilmGeezer email, or disconnect Google sign-in."
              : connected
                ? "Google sign-in is connected to the same email as your FilmGeezer account. You can disconnect it below whenever you need to."
                : "Connect the Google account that uses the same email as your FilmGeezer account."}
          </p>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {googleEmail ? (
            <div
              className={
                googleEmailMismatch
                  ? "rounded-xl border border-amber-300/20 bg-amber-400/[0.07] px-4 py-3"
                  : "rounded-xl border border-white/10 bg-slate-950/45 px-4 py-3"
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p
                  className={
                    googleEmailMismatch
                      ? "text-xs font-semibold uppercase tracking-[0.16em] text-amber-200/80"
                      : "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500"
                  }
                >
                  Currently connected
                </p>
                {googleEmailMismatch ? (
                  <span className="rounded-full border border-amber-200/20 bg-amber-300/10 px-2 py-1 text-[11px] font-bold text-amber-100">
                    Needs attention
                  </span>
                ) : null}
              </div>
              <p
                className={
                  googleEmailMismatch
                    ? "mt-1 break-all text-sm font-semibold text-amber-50"
                    : "mt-1 break-all text-sm font-semibold text-slate-200"
                }
              >
                {googleEmail}
              </p>
              {googleEmailMismatch ? (
                <p className="mt-2 text-xs leading-5 text-amber-100/75">
                  FilmGeezer now keeps one account email. Reconnect Google using {accountEmail}, or disconnect this older connection.
                </p>
              ) : null}
            </div>
          ) : null}

          {errorMessage ? (
            <p role="alert" className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100">
              {errorMessage}
            </p>
          ) : null}

          {!connected || googleEmailMismatch ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-200">
                {googleEmailMismatch
                  ? "Reconnect the correct Google account"
                  : "Connect Google account"}
              </p>
              <GoogleIdentityButton
                disabled={isSubmitting}
                onCredential={(credential) => {
                  void handleCredential(credential);
                }}
              />
              <p className="text-xs leading-5 text-slate-500">
                Select the Google account for{" "}
                <span className="font-semibold text-slate-300">
                  {accountEmail}
                </span>
                . FilmGeezer does not support a different Google email on the same account.
              </p>
            </div>
          ) : null}

          {connected ? (
            <div className="border-t border-white/10 pt-4">
              {confirmDisconnect ? (
                <div className="rounded-xl border border-rose-300/20 bg-rose-400/[0.07] p-4">
                  <p className="text-sm font-bold text-rose-100">
                    Disconnect Google sign-in?
                  </p>
                  <p className="mt-1 text-xs leading-5 text-rose-100/70">
                    You will keep your FilmGeezer account and password, but Google will no longer sign in to this account. Existing Google-authenticated sessions will be signed out.
                  </p>
                  <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setConfirmDisconnect(false)}
                      disabled={isSubmitting}
                      className="min-h-10 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:opacity-60"
                    >
                      Keep connected
                    </button>
                    <button
                      type="button"
                      onClick={() => { void handleDisconnect(); }}
                      disabled={isSubmitting}
                      className="min-h-10 rounded-xl border border-rose-300/25 bg-rose-400/15 px-4 text-sm font-bold text-rose-100 transition hover:bg-rose-400/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSubmitting ? "Disconnecting…" : "Disconnect Google"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(true)}
                    disabled={isSubmitting}
                    className="min-h-11 w-full rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 text-sm font-bold text-rose-100 transition hover:bg-rose-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-60"
                  >
                    Disconnect Google sign-in
                  </button>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Your FilmGeezer password remains available. Google-authenticated sessions are signed out when this connection changes. To connect Google again, use a Google account with the same email as your FilmGeezer account.
                  </p>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default GoogleConnectionDialog;
