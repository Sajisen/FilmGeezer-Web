import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
} from "react";

import {
  deactivateAccount,
} from "../../../services/accountService";

import {
  AuthApiError,
  getAuthFieldErrors,
} from "../../../services/authService";

import {
  AuthFormMessage,
} from "../../auth/components/AuthFields";

import AccountIcon from "./AccountSectionIcons";

interface AccountDeactivationDialogProps {
  csrfToken: string;
  onCancel: () => void;
  onRecentAuthenticationRequired: () => void;
  onDeactivated: (
    message: string,
  ) => Promise<void> | void;
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

function AccountDeactivationDialog({
  csrfToken,
  onCancel,
  onRecentAuthenticationRequired,
  onDeactivated,
}: AccountDeactivationDialogProps) {
  const [confirmation, setConfirmation] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [confirmationErrors, setConfirmationErrors] =
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

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        !isSubmitting
      ) {
        event.preventDefault();
        onCancel();
        return;
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

      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) {
        event.preventDefault();
        return;
      }

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    }

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

    if (
      isSubmitting ||
      confirmation !== "DEACTIVATE"
    ) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setConfirmationErrors([]);

    try {
      const response =
        await deactivateAccount(
          {
            confirmation: "DEACTIVATE",
          },
          csrfToken,
        );

      await onDeactivated(
        response.message,
      );
    } catch (error) {
      if (
        error instanceof AuthApiError &&
        error.code ===
          "AUTH_RECENT_AUTHENTICATION_REQUIRED"
      ) {
        onRecentAuthenticationRequired();
        return;
      }

      const fieldErrors =
        getAuthFieldErrors(
          error,
          "confirmation",
        );

      setConfirmationErrors(
        fieldErrors,
      );

      setErrorMessage(
        fieldErrors.length > 0
          ? null
          : error instanceof Error
            ? error.message
            : "FilmGeezer could not deactivate your account.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[230] grid place-items-center overflow-y-auto bg-slate-950/85 px-4 py-6 backdrop-blur-md sm:py-10"
      onMouseDown={(
        event: MouseEvent<HTMLDivElement>,
      ) => {
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
        aria-labelledby="account-deactivation-title"
        className="flex max-h-[calc(100dvh-3rem)] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-rose-300/20 bg-slate-900 shadow-2xl shadow-black/65"
      >
        <div className="relative shrink-0 border-b border-rose-300/10 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_56%)] px-5 pb-5 pt-6 sm:px-7">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Close account deactivation"
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-slate-950/55 text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-wait disabled:opacity-50"
          >
            <CloseIcon />
          </button>

          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-rose-300/20 bg-rose-400/10 text-rose-200">
            <AccountIcon name="warning" />
          </span>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">
            Account access
          </p>

          <h2
            id="account-deactivation-title"
            className="mt-2 pr-10 text-2xl font-black tracking-tight text-white"
          >
            Deactivate your account?
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-300">
            Your account will become unavailable immediately, but your saved FilmGeezer data will not be permanently deleted.
          </p>
        </div>

        <div className="min-h-0 overflow-y-auto p-5 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3 text-sm text-slate-300">
              <span className="mb-2 block text-rose-300">
                <AccountIcon name="logout" className="h-4 w-4" />
              </span>
              Every device is signed out.
            </div>

            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3 text-sm text-slate-300">
              <span className="mb-2 block text-rose-300">
                <AccountIcon name="key" className="h-4 w-4" />
              </span>
              New sign-ins are blocked.
            </div>

            <div className="rounded-xl border border-white/8 bg-slate-950/50 p-3 text-sm text-slate-300">
              <span className="mb-2 block text-rose-300">
                <AccountIcon name="profile" className="h-4 w-4" />
              </span>
              Your stored data remains.
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-5 space-y-4"
            noValidate
          >
            <AuthFormMessage
              message={errorMessage}
            />

            <div>
              <label
                htmlFor="account-deactivation-confirmation"
                className="block text-sm font-semibold text-slate-200"
              >
                Type <span className="font-black text-white">DEACTIVATE</span> to continue
              </label>

              <input
                id="account-deactivation-confirmation"
                type="text"
                autoComplete="off"
                autoFocus
                value={confirmation}
                disabled={isSubmitting}
                aria-invalid={
                  confirmationErrors.length > 0
                }
                aria-describedby={
                  confirmationErrors.length > 0
                    ? "account-deactivation-confirmation-error"
                    : undefined
                }
                onChange={(
                  event: ChangeEvent<HTMLInputElement>,
                ) => {
                  setConfirmation(event.target.value);
                  setConfirmationErrors([]);
                  setErrorMessage(null);
                }}
                className="mt-2 min-h-12 w-full rounded-xl border border-white/10 bg-slate-950/75 px-4 text-base font-semibold tracking-wide text-white outline-none transition placeholder:text-slate-600 focus:border-rose-300/60 focus:ring-2 focus:ring-rose-300/20 disabled:cursor-wait disabled:opacity-60"
              />

              {confirmationErrors.length > 0 && (
                <div
                  id="account-deactivation-confirmation-error"
                  className="mt-2 space-y-1 text-sm text-rose-200"
                >
                  {confirmationErrors.map(
                    (message) => (
                      <p key={message}>
                        {message}
                      </p>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/8 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="min-h-11 rounded-xl border border-white/10 px-5 font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.035] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-wait disabled:opacity-50"
              >
                Keep account
              </button>

              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  confirmation !== "DEACTIVATE"
                }
                className="min-h-11 rounded-xl bg-rose-500 px-5 font-bold text-white transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                {isSubmitting
                  ? "Deactivating…"
                  : "Deactivate account"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AccountDeactivationDialog;
