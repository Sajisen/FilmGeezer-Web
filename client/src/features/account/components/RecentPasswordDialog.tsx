import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";

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

  useEffect(() => {
    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousBodyOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape" && !isSubmitting) {
        event.preventDefault();
        onCancel();
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.body.style.overflow =
        previousBodyOverflow;

      previousActiveElement?.focus();
    };
  }, [isSubmitting, onCancel]);

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
      className="fixed inset-0 z-[220] grid place-items-center overflow-y-auto bg-slate-950/82 px-4 py-8 backdrop-blur-sm"
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
        className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-slate-900 p-5 shadow-2xl shadow-black/50 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
              Security check
            </p>

            <h2
              id="recent-password-title"
              className="mt-2 text-2xl font-black tracking-tight text-white"
            >
              {title}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Close password confirmation"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-slate-950/70 text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50"
          >
            <CloseIcon />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
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

          <AuthSubmitButton
            label="Confirm password"
            loadingLabel="Confirming…"
            isSubmitting={isSubmitting}
            disabled={password.length === 0}
          />
        </form>
      </div>
    </div>
  );
}

export default RecentPasswordDialog;
