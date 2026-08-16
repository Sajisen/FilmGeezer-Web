import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
} from "react";

import {
  AuthApiError,
  authenticateGoogleAccount,
  getAuthFieldErrors,
} from "../../../services/authService";

import type {
  AuthVerificationReceipt,
} from "../../../types/auth";

import {
  AuthFormMessage,
  PasswordField,
} from "./AuthFields";

import GoogleIdentityButton from "./GoogleIdentityButton";

interface GoogleAuthPanelProps {
  disabled?: boolean;
  onAuthenticated: () => Promise<void>;
  onVerificationRequired: (
    verification: AuthVerificationReceipt,
    email: string,
  ) => void;
  onBusyChange: (isBusy: boolean) => void;
  onDirtyChange: (isDirty: boolean) => void;
}

function GoogleAuthPanel({
  disabled = false,
  onAuthenticated,
  onVerificationRequired,
  onBusyChange,
  onDirtyChange,
}: GoogleAuthPanelProps) {
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [pendingCredential, setPendingCredential] =
    useState<string | null>(null);

  const [password, setPassword] =
    useState("");

  const [passwordErrors, setPasswordErrors] =
    useState<string[]>([]);

  useEffect(() => {
    onBusyChange(isSubmitting);

    return () => {
      onBusyChange(false);
    };
  }, [isSubmitting, onBusyChange]);

  const completeGoogleAuthentication = useCallback(
    async (
      credential: string,
      linkPassword?: string,
    ) => {
      if (isSubmitting || disabled) {
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);
      setPasswordErrors([]);

      try {
        const response =
          await authenticateGoogleAccount({
            credential,
            password: linkPassword,
          });

        if (
          response.code ===
          "AUTH_GOOGLE_EMAIL_VERIFICATION_REQUIRED"
        ) {
          setPendingCredential(null);
          setPassword("");
          onDirtyChange(false);
          onVerificationRequired(
            response.verification,
            response.email,
          );
          return;
        }

        setPendingCredential(null);
        setPassword("");
        onDirtyChange(false);
        await onAuthenticated();
      } catch (error) {
        if (
          error instanceof AuthApiError &&
          error.code ===
            "AUTH_GOOGLE_LINK_CONFIRMATION_REQUIRED"
        ) {
          setPendingCredential(credential);
          onDirtyChange(true);

          const nextPasswordErrors =
            getAuthFieldErrors(
              error,
              "password",
            );

          setPasswordErrors(
            nextPasswordErrors,
          );

          setErrorMessage(
            nextPasswordErrors.length > 0
              ? null
              : "This Google account uses the same email as an existing FilmGeezer account. Enter your FilmGeezer password once to connect them securely.",
          );
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "FilmGeezer could not continue with Google.",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      disabled,
      isSubmitting,
      onAuthenticated,
      onDirtyChange,
      onVerificationRequired,
    ],
  );

  function handleLinkSubmit() {
    if (!pendingCredential || password.length === 0) {
      return;
    }

    void completeGoogleAuthentication(
      pendingCredential,
      password,
    );
  }

  if (pendingCredential) {
    return (
      <div className="space-y-4 rounded-2xl border border-sky-300/15 bg-sky-400/[0.045] p-4">
        <AuthFormMessage
          message={errorMessage}
        />

        <div>
          <p className="text-sm font-bold text-white">
            Connect your existing account
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            This extra check prevents someone from linking a Google account to FilmGeezer using only a matching email address.
          </p>
        </div>

        <div className="space-y-3">
          <PasswordField
            id="auth-google-link-password"
            label="FilmGeezer password"
            autoComplete="current-password"
            autoFocus
            required
            maxLength={128}
            value={password}
            disabled={isSubmitting || disabled}
            errorMessages={passwordErrors}
            placeholder="Enter your FilmGeezer password"
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                password.length > 0 &&
                !isSubmitting &&
                !disabled
              ) {
                event.preventDefault();
                handleLinkSubmit();
              }
            }}
            onChange={(
              event: ChangeEvent<HTMLInputElement>,
            ) => {
              setPassword(event.target.value);
              setPasswordErrors([]);
              setErrorMessage(null);
            }}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isSubmitting || disabled}
              onClick={() => {
                setPendingCredential(null);
                setPassword("");
                setPasswordErrors([]);
                setErrorMessage(null);
                onDirtyChange(false);
              }}
              className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <div className="sm:w-56">
              <button
                type="button"
                onClick={handleLinkSubmit}
                disabled={
                  password.length === 0 ||
                  disabled ||
                  isSubmitting
                }
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 font-bold text-white shadow-lg shadow-sky-950/30 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none"
                  />
                ) : null}
                {isSubmitting
                  ? "Connecting…"
                  : "Connect & continue"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AuthFormMessage
        message={errorMessage}
      />

      <GoogleIdentityButton
        disabled={disabled || isSubmitting}
        onCredential={(credential) => {
          void completeGoogleAuthentication(
            credential,
          );
        }}
        onUnavailable={(message) => {
          setErrorMessage(message);
        }}
      />

      <div
        aria-hidden="true"
        className="flex items-center gap-3"
      >
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>
    </div>
  );
}

export default GoogleAuthPanel;
