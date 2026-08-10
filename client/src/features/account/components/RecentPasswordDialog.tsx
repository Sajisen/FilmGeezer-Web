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
  confirmAccountPassword,
} from "../../../services/accountService";

import {
  AuthFormMessage,
  AuthSubmitButton,
  PasswordField,
} from "../../auth/components/AuthFields";

import AccountIcon from "./AccountSectionIcons";

interface RecentPasswordDialogProps {
  csrfToken: string;
  title: string;
  description: string;
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
  onCancel,
  onConfirmed,
}: RecentPasswordDialogProps) {
  const [password, setPassword] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [passwordErrors, setPasswordErrors] =
    useState<string[]>([]);

  const dialogRef =
    useRef<HTMLDivElement | null>(null);

  useModalAccessibility({
    isOpen: true,
    dialogRef,
    initialFocusSelector: "[autofocus]",
    onEscape: onCancel,
    escapeEnabled: !isSubmitting,
  });

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
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
      setIsSubmitting(false);
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
        aria-labelledby="recent-password-title"
        aria-describedby="recent-password-description"
        aria-busy={isSubmitting}
        className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-900 shadow-2xl shadow-black/60"
      >
        <div className="relative border-b border-white/8 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_55%)] px-5 pb-5 pt-6 sm:px-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Close password confirmation"
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
            id="recent-password-title"
            className="mt-2 pr-10 text-2xl font-black tracking-tight text-white"
          >
            {title}
          </h2>

          <p
            id="recent-password-description"
            className="mt-2 max-w-sm text-sm leading-6 text-slate-400"
          >
            {description}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 p-5 sm:p-6"
          noValidate
        >
          <AuthFormMessage
            message={errorMessage}
          />

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

          <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
            <span className="mt-0.5 text-sky-300">
              <AccountIcon name="check" className="h-4 w-4" />
            </span>
            This confirmation stays active briefly so you can finish the selected account change.
          </p>

          <div className="pt-1">
            <AuthSubmitButton
              label="Continue"
              loadingLabel="Checking…"
              isSubmitting={isSubmitting}
              disabled={password.length === 0}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecentPasswordDialog;
