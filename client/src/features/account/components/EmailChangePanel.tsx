import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  cancelAccountEmailChange,
  requestAccountEmailChange,
  resendAccountEmailChangeCode,
  verifyAccountEmailChange,
} from "../../../services/accountService";

import {
  AuthApiError,
  getAuthFieldErrors,
} from "../../../services/authService";

import type {
  AccountEmailChangeReceipt,
} from "../../../types/account";

import {
  AuthField,
  AuthFormMessage,
  AuthSubmitButton,
} from "../../auth/components/AuthFields";

import AccountIcon from "./AccountSectionIcons";

import OneTimeCodeInput, {
  type OneTimeCodeInputHandle,
} from "../../auth/components/OneTimeCodeInput";

interface EmailChangePanelProps {
  currentEmail: string;
  csrfToken: string;
  initialPending:
    | AccountEmailChangeReceipt
    | null;
  onCancelPanel: () => void;
  onPendingChange: (
    pending:
      | AccountEmailChangeReceipt
      | null,
  ) => void;
  onChanged: (
    message: string,
    newEmail: string,
  ) => Promise<void>;
  onRecentAuthenticationRequired: () => void;
}

function parseTimestamp(
  value: string,
): number | null {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp)
    ? timestamp
    : null;
}

function formatCountdown(
  milliseconds: number,
): string {
  const totalSeconds = Math.max(
    0,
    Math.ceil(milliseconds / 1_000),
  );

  const minutes = Math.floor(
    totalSeconds / 60,
  );

  const seconds = totalSeconds % 60;

  return minutes > 0
    ? `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`
    : `${seconds}s`;
}

function EmailChangePanel({
  currentEmail,
  csrfToken,
  initialPending,
  onCancelPanel,
  onPendingChange,
  onChanged,
  onRecentAuthenticationRequired,
}: EmailChangePanelProps) {
  const [pending, setPending] =
    useState<AccountEmailChangeReceipt | null>(
      initialPending,
    );

  const [newEmail, setNewEmail] =
    useState("");

  const [code, setCode] =
    useState("");

  const [emailErrors, setEmailErrors] =
    useState<string[]>([]);

  const [codeErrors, setCodeErrors] =
    useState<string[]>([]);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [isRequesting, setIsRequesting] =
    useState(false);

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [isResending, setIsResending] =
    useState(false);

  const [isCancelling, setIsCancelling] =
    useState(false);

  const [now, setNow] =
    useState(() => Date.now());

  const codeInputRef =
    useRef<OneTimeCodeInputHandle>(
      null,
    );

  const verificationInFlightRef =
    useRef(false);

  const lastSubmittedCodeRef =
    useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(
      () => {
        setNow(Date.now());
      },
      1_000,
    );

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const isBusy =
    isRequesting ||
    isVerifying ||
    isResending ||
    isCancelling;

  const resendTimestamp = pending
    ? parseTimestamp(
        pending.resendAvailableAt,
      )
    : null;

  const expiryTimestamp = pending
    ? parseTimestamp(pending.expiresAt)
    : null;

  const resendMilliseconds =
    resendTimestamp === null
      ? 0
      : Math.max(
          0,
          resendTimestamp - now,
        );

  const expiryMilliseconds =
    expiryTimestamp === null
      ? 0
      : Math.max(
          0,
          expiryTimestamp - now,
        );

  function updatePending(
    next:
      | AccountEmailChangeReceipt
      | null,
  ) {
    setPending(next);
    onPendingChange(next);
    setCode("");
    setCodeErrors([]);
    lastSubmittedCodeRef.current = null;
  }

  async function handleRequest(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setIsRequesting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailErrors([]);

    try {
      const response =
        await requestAccountEmailChange(
          { newEmail },
          csrfToken,
        );

      updatePending(
        response.verification,
      );

      setSuccessMessage(
        response.message,
      );

      window.setTimeout(() => {
        codeInputRef.current?.focus();
      }, 0);
    } catch (error) {
      const fieldErrors =
        getAuthFieldErrors(
          error,
          "newEmail",
        );

      setEmailErrors(fieldErrors);

      if (
        error instanceof AuthApiError &&
        error.code ===
          "AUTH_RECENT_AUTHENTICATION_REQUIRED"
      ) {
        onRecentAuthenticationRequired();
        return;
      }

      setErrorMessage(
        fieldErrors.length > 0
          ? null
          : error instanceof Error
            ? error.message
            : "FilmGeezer could not start the email change.",
      );
    } finally {
      setIsRequesting(false);
    }
  }

  async function submitVerification(
    submittedCode: string,
  ) {
    if (
      !pending ||
      submittedCode.length !== 6 ||
      verificationInFlightRef.current ||
      lastSubmittedCodeRef.current ===
        submittedCode
    ) {
      return;
    }

    verificationInFlightRef.current = true;
    lastSubmittedCodeRef.current =
      submittedCode;

    setIsVerifying(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCodeErrors([]);

    try {
      const response =
        await verifyAccountEmailChange(
          {
            challengeId:
              pending.challengeId,
            code: submittedCode,
          },
          csrfToken,
        );

      updatePending(null);

      await onChanged(
        response.message,
        response.user.email,
      );
    } catch (error) {
      const fieldErrors =
        getAuthFieldErrors(
          error,
          "code",
        );

      setCodeErrors(fieldErrors);

      const attemptsRemaining =
        error instanceof AuthApiError
          ? error.payload
              .attemptsRemaining
          : null;

      const attemptsMessage =
        typeof attemptsRemaining ===
          "number"
          ? `${attemptsRemaining} attempt${
              attemptsRemaining === 1
                ? ""
                : "s"
            } remaining.`
          : null;

      setErrorMessage(
        [
          fieldErrors.length > 0
            ? null
            : error instanceof Error
              ? error.message
              : "FilmGeezer could not verify the new email address.",
          attemptsMessage,
        ]
          .filter(Boolean)
          .join(" ") || null,
      );

      setCode("");
      lastSubmittedCodeRef.current = null;

      window.setTimeout(() => {
        codeInputRef.current?.focus();
      }, 0);
    } finally {
      verificationInFlightRef.current =
        false;
      setIsVerifying(false);
    }
  }

  function handleCodeChange(
    nextCode: string,
  ) {
    setCode(nextCode);
    setCodeErrors([]);
    setErrorMessage(null);

    if (nextCode.length < 6) {
      lastSubmittedCodeRef.current =
        null;
      return;
    }

    void submitVerification(nextCode);
  }

  async function handleVerify(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    await submitVerification(code);
  }

  async function handleResend() {
    if (
      !pending ||
      isBusy ||
      resendMilliseconds > 0
    ) {
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setCodeErrors([]);

    try {
      const response =
        await resendAccountEmailChangeCode(
          {
            challengeId:
              pending.challengeId,
          },
          csrfToken,
        );

      updatePending(
        response.verification,
      );

      setSuccessMessage(
        response.message,
      );

      window.setTimeout(() => {
        codeInputRef.current?.focus();
      }, 0);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not send another code.",
      );
    } finally {
      setIsResending(false);
    }
  }

  async function handleCancelChange() {
    if (!pending || isBusy) {
      return;
    }

    setIsCancelling(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response =
        await cancelAccountEmailChange(
          pending.challengeId,
          csrfToken,
        );

      updatePending(null);
      setNewEmail("");
      setSuccessMessage(
        response.message,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not cancel the email change.",
      );
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-sky-300/15 bg-slate-900/75 shadow-xl shadow-black/15">
      <div className="border-b border-white/8 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-3.5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-400/10 text-sky-300">
            <AccountIcon name="mail" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                {pending
                  ? "Verify your new email"
                  : "Change your email"}
              </h2>

              <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[0.7rem] font-semibold text-slate-400">
                {pending ? "Step 2 of 2" : "Step 1 of 2"}
              </span>
            </div>

            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400">
              {pending
                ? `Enter the code sent to ${pending.targetEmail}. Your current email continues to work until this step is complete.`
                : "Enter the new address you want to use for sign-in and account recovery."}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2" aria-label="Email change progress">
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
            pending
              ? "border-emerald-300/15 bg-emerald-400/[0.06] text-emerald-200"
              : "border-sky-300/20 bg-sky-400/[0.08] text-sky-200"
          }`}>
            <span className="grid h-5 w-5 place-items-center rounded-full border border-current/20">
              {pending ? (
                <AccountIcon name="check" className="h-3.5 w-3.5" />
              ) : (
                "1"
              )}
            </span>
            New address
          </div>

          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${
            pending
              ? "border-sky-300/20 bg-sky-400/[0.08] text-sky-200"
              : "border-white/8 bg-white/[0.025] text-slate-500"
          }`}>
            <span className="grid h-5 w-5 place-items-center rounded-full border border-current/20">
              2
            </span>
            Verify
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        <AuthFormMessage
          message={errorMessage}
        />

        {successMessage && (
          <p
            role="status"
            className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100"
          >
            {successMessage}
          </p>
        )}

        {!pending ? (
          <form
            onSubmit={handleRequest}
            className="space-y-5"
            noValidate
          >
            <div className="rounded-2xl border border-white/8 bg-slate-950/50 p-4 text-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Current email
              </p>
              <p className="mt-2 break-all font-semibold text-slate-200">
                {currentEmail}
              </p>
            </div>

            <div className="max-w-xl">
              <AuthField
                id="account-new-email"
                label="New email address"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={newEmail}
                disabled={isBusy}
                errorMessages={emailErrors}
                placeholder="you@example.com"
                hint="We will send a six-digit code to make sure the address belongs to you."
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setNewEmail(event.target.value);
                  setEmailErrors([]);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onCancelPanel}
                disabled={isBusy}
                className="min-h-11 rounded-xl border border-white/10 px-5 font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.035] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50"
              >
                Cancel
              </button>

              <div className="w-full sm:w-56">
                <AuthSubmitButton
                  label="Send code"
                  loadingLabel="Sending…"
                  isSubmitting={isRequesting}
                  disabled={
                    isBusy ||
                    newEmail.trim().length === 0
                  }
                />
              </div>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleVerify}
            className="space-y-5"
            noValidate
          >
            <div className="rounded-2xl border border-sky-300/15 bg-sky-400/[0.055] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">
                Code sent to
              </p>
              <p className="mt-2 break-all font-bold text-white">
                {pending.targetEmail}
              </p>
            </div>

            <div className="max-w-xl">
              <OneTimeCodeInput
                ref={codeInputRef}
                value={code}
                disabled={isBusy}
                hasError={
                  codeErrors.length > 0 ||
                  Boolean(errorMessage)
                }
                autoFocus
                onChange={handleCodeChange}
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <AccountIcon name="clock" className="h-3.5 w-3.5" />
                {expiryMilliseconds > 0
                  ? `Expires in ${formatCountdown(expiryMilliseconds)}`
                  : "Code expired"}
              </span>

              <span>
                {pending.attemptsRemaining} attempt{
                  pending.attemptsRemaining === 1 ? "" : "s"
                } remaining
              </span>
            </div>

            <div className="w-full sm:max-w-xs">
              <AuthSubmitButton
                label="Confirm new email"
                loadingLabel="Verifying…"
                isSubmitting={isVerifying}
                disabled={
                  isBusy ||
                  code.length !== 6 ||
                  expiryMilliseconds === 0
                }
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => {
                  void handleResend();
                }}
                disabled={
                  isBusy ||
                  resendMilliseconds > 0
                }
                className="min-h-10 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-sky-300/30 hover:bg-sky-400/[0.05] hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isResending
                  ? "Sending…"
                  : resendMilliseconds > 0
                    ? `Resend in ${formatCountdown(resendMilliseconds)}`
                    : "Send another code"}
              </button>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onCancelPanel}
                  disabled={isBusy}
                  className="min-h-10 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.035] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50"
                >
                  Continue later
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void handleCancelChange();
                  }}
                  disabled={isBusy}
                  className="min-h-10 rounded-xl border border-rose-300/20 px-4 text-sm font-semibold text-rose-200 transition hover:bg-rose-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-50"
                >
                  {isCancelling
                    ? "Cancelling…"
                    : "Cancel change"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export default EmailChangePanel;
