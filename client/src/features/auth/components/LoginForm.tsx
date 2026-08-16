import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  AuthApiError,
  getAuthFieldErrors,
  getAuthFormErrors,
  loginLocalAccount,
} from "../../../services/authService";

import type {
  AuthVerificationReceipt,
} from "../../../types/auth";

import {
  AuthField,
  AuthFormMessage,
  AuthSubmitButton,
  PasswordField,
} from "./AuthFields";

import GoogleAuthPanel from "./GoogleAuthPanel";

interface LoginFormProps {
  initialEmail?: string;
  notice?: string | null;
  onAuthenticated: () => Promise<void>;
  onSwitchToRegistration: () => void;
  onForgotPassword: (email?: string) => void;
  onVerificationRequired: (
    verification: AuthVerificationReceipt,
    email: string,
  ) => void;
  onBusyChange: (
    isBusy: boolean,
  ) => void;
  onDirtyChange: (
    isDirty: boolean,
  ) => void;
}

function LoginForm({
  initialEmail = "",
  notice = null,
  onAuthenticated,
  onSwitchToRegistration,
  onForgotPassword,
  onVerificationRequired,
  onBusyChange,
  onDirtyChange,
}: LoginFormProps) {
  const [email, setEmail] =
    useState(initialEmail);

  const [password, setPassword] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isGoogleSubmitting,
    setIsGoogleSubmitting,
  ] = useState(false);

  const [
    isGoogleDirty,
    setIsGoogleDirty,
  ] = useState(false);

  const isBusy =
    isSubmitting || isGoogleSubmitting;

  const [
    submissionError,
    setSubmissionError,
  ] = useState<string | null>(
    null,
  );

  const [
    fieldErrors,
    setFieldErrors,
  ] = useState<
    Record<
      "email" | "password",
      string[]
    >
  >({
    email: [],
    password: [],
  });

  useEffect(() => {
    onBusyChange(isBusy);

    return () => {
      onBusyChange(false);
    };
  }, [
    isBusy,
    onBusyChange,
  ]);

  useEffect(() => {
    onDirtyChange(
      email.length > 0 ||
        password.length > 0 ||
        isGoogleDirty,
    );
  }, [
    email,
    isGoogleDirty,
    onDirtyChange,
    password,
  ]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setSubmissionError(null);

    setFieldErrors({
      email: [],
      password: [],
    });

    setIsSubmitting(true);

    try {
      await loginLocalAccount({
        email,
        password,
      });

      setIsGoogleDirty(false);
      await onAuthenticated();
    } catch (error) {
      if (
        error instanceof
          AuthApiError &&
        error.code ===
          "AUTH_EMAIL_VERIFICATION_REQUIRED"
      ) {
        const challengeId =
          error.payload
            .verification
            ?.challengeId;

        if (
          typeof challengeId ===
            "string" &&
          challengeId.length > 0
        ) {
          setIsGoogleDirty(false);

          onVerificationRequired(
            {
              challengeId,

              expiresAt:
                error.payload
                  .verification
                  ?.expiresAt ??
                null,

              resendAvailableAt:
                error.payload
                  .verification
                  ?.resendAvailableAt ??
                null,
            },

            email.trim(),
          );

          return;
        }
      }

      const nextFieldErrors = {
        email:
          getAuthFieldErrors(
            error,
            "email",
          ),

        password:
          getAuthFieldErrors(
            error,
            "password",
          ),
      };

      setFieldErrors(
        nextFieldErrors,
      );

      const formErrors =
        getAuthFormErrors(error);

      setSubmissionError(
        formErrors[0] ??
          (error instanceof Error
            ? error.message
            : "FilmGeezer could not sign you in."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      {notice ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-50"
        >
          {notice}
        </div>
      ) : null}

      <GoogleAuthPanel
        disabled={isBusy}
        onAuthenticated={onAuthenticated}
        onVerificationRequired={onVerificationRequired}
        onBusyChange={setIsGoogleSubmitting}
        onDirtyChange={setIsGoogleDirty}
      />

      <AuthFormMessage
        message={submissionError}
      />

      <AuthField
        id="auth-login-email"
        label="Email address"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        required
        value={email}
        disabled={isBusy}
        errorMessages={
          fieldErrors.email
        }
        placeholder="you@example.com"
        onChange={(event) => {
          const nextEmail =
            event.target.value;

          setEmail(nextEmail);

          if (
            fieldErrors.email
              .length > 0
          ) {
            setFieldErrors(
              (
                currentErrors,
              ) => ({
                ...currentErrors,
                email: [],
              }),
            );
          }
        }}
      />

      <PasswordField
        id="auth-login-password"
        label="Password"
        autoComplete="current-password"
        required
        value={password}
        disabled={isBusy}
        errorMessages={
          fieldErrors.password
        }
        placeholder="Enter your password"
        onChange={(event) => {
          const nextPassword =
            event.target.value;

          setPassword(
            nextPassword,
          );

          if (
            fieldErrors.password
              .length > 0
          ) {
            setFieldErrors(
              (
                currentErrors,
              ) => ({
                ...currentErrors,
                password: [],
              }),
            );
          }
        }}
      />

      <div className="-mt-1 flex justify-end">
        <button
          type="button"
          onClick={() => {
            onForgotPassword(
              email.trim(),
            );
          }}
          disabled={isBusy}
          className="text-sm font-semibold text-sky-300 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Forgot password?
        </button>
      </div>

      <AuthSubmitButton
        label="Sign in"
        loadingLabel="Signing in…"
        isSubmitting={
          isSubmitting
        }
        disabled={
          isBusy ||
          email.trim().length === 0 ||
          password.length === 0
        }
      />

      <p className="text-center text-sm leading-6 text-slate-400">
        New to FilmGeezer?{" "}

        <button
          type="button"
          onClick={
            onSwitchToRegistration
          }
          disabled={isBusy}
          className="font-semibold text-sky-300 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Create an account
        </button>
      </p>
    </form>
  );
}

export default LoginForm;
