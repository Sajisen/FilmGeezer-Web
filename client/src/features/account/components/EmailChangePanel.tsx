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

import OneTimeCodeInput, {
  type OneTimeCodeInputHandle,
} from "../../auth/components/OneTimeCodeInput";

import AccountIcon from "./AccountSectionIcons";

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

const SUCCESS_MESSAGE_DURATION_MS = 5_000;

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

function EmailChangeProgress({
  verificationStep,
}: {
  verificationStep: boolean;
}) {
  return (
    <div className="relative mt-6 px-2 sm:px-8">
      <div
        aria-hidden="true"
        className="absolute left-1/4 right-1/4 top-5 h-px bg-white/10"
      >
        <div
          className={`h-full bg-gradient-to-r from-emerald-300/70 to-sky-300/70 transition-[width] duration-300 motion-reduce:transition-none ${
            verificationStep
              ? "w-full"
              : "w-0"
          }`}
        />
      </div>

      <ol
        aria-label="Email change progress"
        className="relative grid grid-cols-2"
      >
        <li
          aria-current={
            verificationStep
              ? undefined
              : "step"
          }
          className="flex flex-col items-center text-center"
        >
          <span
            className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-black shadow-lg shadow-black/10 ${
              verificationStep
                ? "border-emerald-300/25 bg-emerald-400/15 text-emerald-200"
                : "border-sky-300/35 bg-sky-400/15 text-sky-100 ring-4 ring-sky-400/5"
            }`}
          >
            {verificationStep ? (
              <AccountIcon
                name="check"
                className="h-4 w-4"
              />
            ) : (
              "1"
            )}
          </span>
          <span className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-500">
            Step 1
          </span>
          <span
            className={`mt-1 text-sm font-bold ${
              verificationStep
                ? "text-emerald-200"
                : "text-white"
            }`}
          >
            New address
          </span>
        </li>

        <li
          aria-current={
            verificationStep
              ? "step"
              : undefined
          }
          className="flex flex-col items-center text-center"
        >
          <span
            className={`grid h-10 w-10 place-items-center rounded-full border text-sm font-black shadow-lg shadow-black/10 ${
              verificationStep
                ? "border-sky-300/35 bg-sky-400/15 text-sky-100 ring-4 ring-sky-400/5"
                : "border-white/10 bg-slate-950/70 text-slate-500"
            }`}
          >
            2
          </span>
          <span className="mt-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-500">
            Step 2
          </span>
          <span
            className={`mt-1 text-sm font-bold ${
              verificationStep
                ? "text-white"
                : "text-slate-500"
            }`}
          >
            Verify
          </span>
        </li>
      </ol>
    </div>
  );
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

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(
      () => {
        setSuccessMessage(null);
      },
      SUCCESS_MESSAGE_DURATION_MS,
    );

    return () => {
      window.clearTimeout(timer);
    };
  }, [successMessage]);

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

  const codeErrorId =
    codeErrors.length > 0
      ? "account-email-change-code-error"
      : undefined;

  const codeHelpId =
    "account-email-change-code-help";

  const codeDescriptionIds =
    [codeErrorId, codeHelpId]
      .filter(Boolean)
      .join(" ");

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
    <section
      aria-busy={isBusy}
      className="overflow-hidden rounded-[1.75rem] border border-sky-300/15 bg-slate-900/75 shadow-xl shadow-black/15"
    >
      <header className="border-b border-white/8 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-400/10 text-sky-300 shadow-lg shadow-black/10">
            <AccountIcon name="mail" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-sky-300">
              Email security
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-white sm:text-2xl">
              {pending
                ? "Verify your new email"
                : "Change your email"}
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {pending
                ? `Enter the six-digit code sent to ${pending.targetEmail}. Your current email will keep working until verification is complete.`
                : "Choose the new email address you want to use for sign-in and account recovery."}
            </p>
          </div>
        </div>

        <EmailChangeProgress
          verificationStep={Boolean(pending)}
        />
      </header>

      <div className="p-5 sm:p-7">
        <div className="mx-auto w-full max-w-2xl">
          <AuthFormMessage
            message={errorMessage}
          />

          {successMessage && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] px-4 py-3 text-sm leading-6 text-emerald-100"
            >
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-400/15 text-emerald-200">
                <AccountIcon
                  name="check"
                  className="h-3.5 w-3.5"
                />
              </span>
              <span>{successMessage}</span>
            </div>
          )}

          {!pending ? (
            <form
              onSubmit={handleRequest}
              className="space-y-5"
              noValidate
            >
              <div className="rounded-2xl border border-white/8 bg-slate-950/45 px-4 py-3.5 sm:flex sm:items-center sm:justify-between sm:gap-5">
                <div>
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-500">
                    Current email
                  </p>
                  <p className="mt-1.5 break-all text-sm font-semibold text-slate-200">
                    {currentEmail}
                  </p>
                </div>
                <span className="mt-3 inline-flex rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[0.68rem] font-bold text-emerald-200 sm:mt-0">
                  Active
                </span>
              </div>

              <AuthField
                id="account-new-email"
                label="New email address"
                type="email"
                autoFocus
                autoComplete="email"
                required
                maxLength={254}
                value={newEmail}
                disabled={isBusy}
                errorMessages={emailErrors}
                placeholder="you@example.com"
                hint="We’ll send a six-digit code to this address before anything changes."
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setNewEmail(event.target.value);
                  setEmailErrors([]);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
              />

              <div className="flex flex-col-reverse gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={onCancelPanel}
                  disabled={isBusy}
                  className="min-h-11 rounded-xl border border-white/10 px-5 font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.035] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50"
                >
                  Cancel
                </button>

                <div className="w-full sm:w-52">
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
              className="space-y-6"
              noValidate
            >
              <div className="flex items-center gap-3 rounded-2xl border border-sky-300/15 bg-sky-400/[0.055] px-4 py-3.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-sky-300/15 bg-sky-400/10 text-sky-300">
                  <AccountIcon name="mail" />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-sky-300">
                    Code sent to
                  </p>
                  <p className="mt-1 break-all text-sm font-bold text-white">
                    {pending.targetEmail}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="account-email-change-code"
                  className="block text-sm font-bold text-white"
                >
                  Verification code
                </label>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Enter the six digits from the email we sent you.
                </p>

                <div className="mt-4 max-w-[25rem]">
                  <OneTimeCodeInput
                    id="account-email-change-code"
                    ref={codeInputRef}
                    value={code}
                    disabled={isBusy}
                    hasError={
                      codeErrors.length > 0 ||
                      Boolean(errorMessage)
                    }
                    autoFocus
                    compact
                    ariaLabel="Six-digit code for your new email address"
                    ariaDescribedBy={codeDescriptionIds}
                    onChange={handleCodeChange}
                  />
                </div>

                {codeErrors.length > 0 && (
                  <div
                    id={codeErrorId}
                    role="alert"
                    className="mt-2 space-y-1 text-xs leading-5 text-rose-200"
                  >
                    {codeErrors.map((message) => (
                      <p key={message}>{message}</p>
                    ))}
                  </div>
                )}

                <p
                  id={codeHelpId}
                  className="mt-2 text-xs leading-5 text-slate-500"
                >
                  Verification starts automatically after the sixth digit.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 text-xs">
                <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.025] px-3 text-slate-400">
                  <AccountIcon
                    name="clock"
                    className="h-3.5 w-3.5"
                  />
                  {expiryMilliseconds > 0
                    ? `Expires in ${formatCountdown(expiryMilliseconds)}`
                    : "Code expired"}
                </span>

                <span className="inline-flex min-h-8 items-center rounded-full border border-white/8 bg-white/[0.025] px-3 text-slate-400">
                  {pending.attemptsRemaining} attempt{
                    pending.attemptsRemaining === 1 ? "" : "s"
                  } remaining
                </span>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => {
                    void handleResend();
                  }}
                  disabled={
                    isBusy ||
                    resendMilliseconds > 0
                  }
                  className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-sky-300/30 hover:bg-sky-400/[0.05] hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResending
                    ? "Sending…"
                    : resendMilliseconds > 0
                      ? `Resend in ${formatCountdown(resendMilliseconds)}`
                      : "Send another code"}
                </button>

                <div className="w-full sm:w-44">
                  <AuthSubmitButton
                    label="Verify email"
                    loadingLabel="Verifying…"
                    isSubmitting={isVerifying}
                    disabled={
                      isBusy ||
                      code.length !== 6 ||
                      expiryMilliseconds === 0
                    }
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
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
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

export default EmailChangePanel;
