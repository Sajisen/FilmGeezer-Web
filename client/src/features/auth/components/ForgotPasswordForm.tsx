import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  getAuthFieldErrors,
  getAuthFormErrors,
  requestLocalPasswordReset,
} from "../../../services/authService";

import {
  AuthField,
  AuthFormMessage,
  AuthSubmitButton,
} from "./AuthFields";

interface ForgotPasswordFormProps {
  initialEmail?: string;
  onBusyChange: (isBusy: boolean) => void;
  onDirtyChange: (isDirty: boolean) => void;
  onSwitchToLogin: (email?: string) => void;
}

function ForgotPasswordForm({
  initialEmail = "",
  onBusyChange,
  onDirtyChange,
  onSwitchToLogin,
}: ForgotPasswordFormProps) {
  const [email, setEmail] =
    useState(initialEmail);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [requestAccepted, setRequestAccepted] =
    useState(false);

  const [submissionError, setSubmissionError] =
    useState<string | null>(null);

  const [emailErrors, setEmailErrors] =
    useState<string[]>([]);

  useEffect(() => {
    onBusyChange(isSubmitting);

    return () => {
      onBusyChange(false);
    };
  }, [isSubmitting, onBusyChange]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmissionError(null);
    setEmailErrors([]);
    setIsSubmitting(true);

    try {
      await requestLocalPasswordReset({
        email,
      });

      setRequestAccepted(true);
      onDirtyChange(true);
    } catch (error) {
      const nextEmailErrors =
        getAuthFieldErrors(error, "email");

      setEmailErrors(nextEmailErrors);

      const formErrors =
        getAuthFormErrors(error);

      setSubmissionError(
        formErrors[0] ??
          (nextEmailErrors.length > 0
            ? null
            : error instanceof Error
              ? error.message
              : "FilmGeezer could not start password recovery."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (requestAccepted) {
    return (
      <div className="space-y-5">
        <div
          role="status"
          className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-5 text-sm leading-6 text-emerald-50"
        >
          <h2 className="text-base font-bold text-white">
            Check your inbox
          </h2>

          <p className="mt-2">
            If this email can receive a FilmGeezer password reset, a secure link will arrive shortly.
          </p>

          <p className="mt-2 text-emerald-100/75">
            The link is single-use and expires after 30 minutes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onSwitchToLogin(email.trim());
          }}
          className="min-h-12 w-full rounded-xl bg-sky-500 px-5 font-bold text-white shadow-lg shadow-sky-950/30 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
        >
          Return to sign in
        </button>

        <button
          type="button"
          onClick={() => {
            setRequestAccepted(false);
            setSubmissionError(null);
            setEmailErrors([]);
            onDirtyChange(email.length > 0);
          }}
          className="w-full text-sm font-semibold text-slate-400 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          Use another email
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      <AuthFormMessage
        message={submissionError}
      />

      <AuthField
        id="auth-forgot-password-email"
        label="Email address"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        required
        value={email}
        disabled={isSubmitting}
        errorMessages={emailErrors}
        placeholder="you@example.com"
        onChange={(event) => {
          const nextEmail = event.target.value;

          setEmail(nextEmail);
          onDirtyChange(nextEmail.length > 0);

          if (emailErrors.length > 0) {
            setEmailErrors([]);
          }
        }}
      />

      <AuthSubmitButton
        label="Send reset link"
        loadingLabel="Preparing reset link…"
        isSubmitting={isSubmitting}
        disabled={email.trim().length === 0}
      />

      <p className="text-center text-sm leading-6 text-slate-400">
        Remembered your password?{" "}

        <button
          type="button"
          onClick={() => {
            onSwitchToLogin(email.trim());
          }}
          disabled={isSubmitting}
          className="font-semibold text-sky-300 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

export default ForgotPasswordForm;
