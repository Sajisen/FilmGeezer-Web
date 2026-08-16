import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  useModalAccessibility,
} from "../../../hooks/useModalAccessibility";

import {
  AuthApiError,
  getAuthFieldErrors,
} from "../../../services/authService";

import {
  confirmAccountGoogle,
  confirmAccountPassword,
} from "../../../services/accountService";

import {
  AuthFormMessage,
  AuthSubmitButton,
  PasswordField,
} from "../../auth/components/AuthFields";

import GoogleIdentityButton from "../../auth/components/GoogleIdentityButton";

import AccountIcon from "./AccountSectionIcons";

interface RecentPasswordDialogProps {
  csrfToken: string;
  title: string;
  description: string;
  passwordConfigured: boolean;
  googleConnected: boolean;
  onCancel: () => void;
  onConfirmed: (
    expiresAt: string,
  ) => void;
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="m6.5 6.5 11 11m0-11-11 11"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RecentPasswordDialog({
  csrfToken,
  title,
  description,
  passwordConfigured,
  googleConnected,
  onCancel,
  onConfirmed,
}: RecentPasswordDialogProps) {
  const [password, setPassword] =
    useState("");

  const [isPasswordSubmitting, setIsPasswordSubmitting] =
    useState(false);

  const [isGoogleSubmitting, setIsGoogleSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [passwordErrors, setPasswordErrors] =
    useState<string[]>([]);

  const isSubmitting =
    isPasswordSubmitting || isGoogleSubmitting;

  const dialogRef =
    useRef<HTMLDivElement | null>(null);

  useModalAccessibility({
    isOpen: true,
    dialogRef,
    initialFocusSelector: passwordConfigured
      ? "[autofocus]"
      : "button",
    onEscape: onCancel,
    escapeEnabled: !isSubmitting,
  });

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting || !passwordConfigured) {
      return;
    }

    setIsPasswordSubmitting(true);
    setErrorMessage(null);
    setPasswordErrors([]);

    try {
      const response =
        await confirmAccountPassword(
          {
            password,
          },
          csrfToken,
        );

      onConfirmed(response.expiresAt);
    } catch (error) {
      const fieldErrors =
        getAuthFieldErrors(
          error,
          "password",
        );

      setPasswordErrors(fieldErrors);

      setErrorMessage(
        fieldErrors.length > 0
          ? null
          : error instanceof AuthApiError
            ? error.message
            : "FilmGeezer could not confirm your password.",
      );
    } finally {
      setIsPasswordSubmitting(false);
    }
  }

  async function handleGoogleCredential(
    credential: string,
  ) {
    if (isSubmitting || !googleConnected) {
      return;
    }

    setIsGoogleSubmitting(true);
    setErrorMessage(null);
    setPasswordErrors([]);

    try {
      const response =
        await confirmAccountGoogle(
          { credential },
          csrfToken,
        );

      onConfirmed(response.expiresAt);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not confirm your Google account.",
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[220] grid place-items-center overflow-y-auto bg-slate-950/80 px-4 py-6 backdrop-blur-md sm:py-10"
      onMouseDown={(event: MouseEvent<HTMLDivElement>) => {
        if (
          event.target === event.currentTarget &&
          !isSubmitting
        ) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recent-authentication-title"
        aria-describedby="recent-authentication-description"
        aria-busy={isSubmitting}
        className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900 shadow-2xl shadow-black/60"
      >
        <div className="relative border-b border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_55%)] px-5 pb-5 pt-6 sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Close identity confirmation"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-slate-950/55 text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50"
          >
            <CloseIcon />
          </button>

          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-300/20 bg-sky-400/10 text-sky-300">
            <AccountIcon name="shield" />
          </span>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
            Confirm it is you
          </p>

          <h2
            id="recent-authentication-title"
            className="mt-2 pr-10 text-2xl font-black tracking-tight text-white"
          >
            {title}
          </h2>

          <p
            id="recent-authentication-description"
            className="mt-2 max-w-sm text-sm leading-6 text-slate-400"
          >
            {description}
          </p>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          <AuthFormMessage
            message={errorMessage}
          />

          {googleConnected ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-200">
                Continue with Google
              </p>

              <GoogleIdentityButton
                disabled={isSubmitting}
                onCredential={(credential) => {
                  void handleGoogleCredential(
                    credential,
                  );
                }}
                onUnavailable={(message) => {
                  if (!passwordConfigured) {
                    setErrorMessage(message);
                  }
                }}
              />
            </div>
          ) : null}

          {googleConnected && passwordConfigured ? (
            <div
              aria-hidden="true"
              className="flex items-center gap-3"
            >
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                or use your password
              </span>
              <span className="h-px flex-1 bg-white/10" />
            </div>
          ) : null}

          {passwordConfigured ? (
            <form
              onSubmit={handlePasswordSubmit}
              className="space-y-4"
              noValidate
            >
              <PasswordField
                id="account-current-password"
                label="Current password"
                autoComplete="current-password"
                autoFocus
                required
                maxLength={128}
                value={password}
                disabled={isSubmitting}
                errorMessages={passwordErrors}
                placeholder="Enter your current password"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setPassword(event.target.value);

                  if (passwordErrors.length > 0) {
                    setPasswordErrors([]);
                  }

                  if (errorMessage) {
                    setErrorMessage(null);
                  }
                }}
              />

              <div className="pt-1">
                <AuthSubmitButton
                  label="Continue"
                  loadingLabel="Checking…"
                  isSubmitting={isPasswordSubmitting}
                  disabled={
                    password.length === 0 ||
                    isGoogleSubmitting
                  }
                />
              </div>
            </form>
          ) : null}

          {!passwordConfigured && !googleConnected ? (
            <p className="rounded-xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
              FilmGeezer could not find a sign-in method that can confirm this security change.
            </p>
          ) : null}

          <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
            <span className="mt-0.5 text-sky-300">
              <AccountIcon name="check" className="h-4 w-4" />
            </span>
            This confirmation stays active briefly so you can finish the selected account change.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RecentPasswordDialog;
