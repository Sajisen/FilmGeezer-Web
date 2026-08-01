import {
  useState,
  type InputHTMLAttributes,
} from "react";

interface AuthFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "className"
  > {
  label: string;
  errorMessages?: string[];
  hint?: string;
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M2.75 12s3.25-5.25 9.25-5.25S21.25 12 21.25 12 18 17.25 12 17.25 2.75 12 2.75 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="m4 4 16 16"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />

      <path
        d="M9.65 7.12A10.6 10.6 0 0 1 12 6.75c6 0 9.25 5.25 9.25 5.25a15.2 15.2 0 0 1-3.08 3.55M14.3 16.9c-.72.23-1.49.35-2.3.35C6 17.25 2.75 12 2.75 12a15.5 15.5 0 0 1 3.08-3.55"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AuthField({
  label,
  id,
  errorMessages = [],
  hint,
  ...inputProps
}: AuthFieldProps) {
  const errorId =
    errorMessages.length > 0
      ? `${id}-error`
      : undefined;

  const hintId =
    hint && !errorId
      ? `${id}-hint`
      : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-slate-200"
      >
        {label}
      </label>

      <input
        {...inputProps}
        id={id}
        aria-invalid={
          errorMessages.length > 0
        }
        aria-describedby={
          errorId ?? hintId
        }
        className={`mt-1.5 min-h-12 w-full rounded-xl border bg-slate-950/70 px-4 text-[16px] text-white outline-none transition placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 ${
          errorMessages.length > 0
            ? "border-rose-400/70 focus:border-rose-300 focus:ring-2 focus:ring-rose-300/20"
            : "border-white/10 hover:border-white/20 focus:border-sky-300/70 focus:ring-2 focus:ring-sky-300/20"
        }`}
      />

      {errorMessages.length > 0 ? (
        <div
          id={errorId}
          className="mt-1.5 space-y-1 text-xs leading-5 text-rose-200"
        >
          {errorMessages.map(
            (message) => (
              <p key={message}>
                {message}
              </p>
            ),
          )}
        </div>
      ) : hint ? (
        <p
          id={hintId}
          className="mt-1.5 text-xs leading-5 text-slate-500"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type PasswordFieldProps = Omit<
  AuthFieldProps,
  "type"
>;

export function PasswordField({
  label,
  id,
  errorMessages = [],
  hint,
  ...inputProps
}: PasswordFieldProps) {
  const [isVisible, setIsVisible] =
    useState(false);

  const errorId =
    errorMessages.length > 0
      ? `${id}-error`
      : undefined;

  const hintId =
    hint && !errorId
      ? `${id}-hint`
      : undefined;

  const visibilityLabel =
    isVisible
      ? "Hide password"
      : "Show password";

  return (
    <div>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-slate-200"
      >
        {label}
      </label>

      <div className="relative mt-1.5">
        <input
          {...inputProps}
          id={id}
          type={
            isVisible
              ? "text"
              : "password"
          }
          aria-invalid={
            errorMessages.length > 0
          }
          aria-describedby={
            errorId ?? hintId
          }
          className={`min-h-12 w-full rounded-xl border bg-slate-950/70 px-4 pr-12 text-[16px] text-white outline-none transition placeholder:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60 ${
            errorMessages.length > 0
              ? "border-rose-400/70 focus:border-rose-300 focus:ring-2 focus:ring-rose-300/20"
              : "border-white/10 hover:border-white/20 focus:border-sky-300/70 focus:ring-2 focus:ring-sky-300/20"
          }`}
        />

        <button
          type="button"
          onClick={() => {
            setIsVisible(
              (currentValue) =>
                !currentValue,
            );
          }}
          aria-label={visibilityLabel}
          aria-pressed={isVisible}
          title={visibilityLabel}
          disabled={inputProps.disabled}
          className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-white/5 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isVisible
            ? <EyeOffIcon />
            : <EyeIcon />}
        </button>
      </div>

      {errorMessages.length > 0 ? (
        <div
          id={errorId}
          className="mt-1.5 space-y-1 text-xs leading-5 text-rose-200"
        >
          {errorMessages.map(
            (message) => (
              <p key={message}>
                {message}
              </p>
            ),
          )}
        </div>
      ) : hint ? (
        <p
          id={hintId}
          className="mt-1.5 text-xs leading-5 text-slate-500"
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface AuthSubmitButtonProps {
  label: string;
  loadingLabel: string;
  isSubmitting: boolean;
  disabled?: boolean;
}

export function AuthSubmitButton({
  label,
  loadingLabel,
  isSubmitting,
  disabled = false,
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={
        disabled ||
        isSubmitting
      }
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 font-bold text-white shadow-lg shadow-sky-950/30 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
    >
      {isSubmitting && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white motion-reduce:animate-none"
        />
      )}

      {isSubmitting
        ? loadingLabel
        : label}
    </button>
  );
}

interface AuthFormMessageProps {
  message: string | null;
}

export function AuthFormMessage({
  message,
}: AuthFormMessageProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm leading-6 text-rose-100"
    >
      {message}
    </div>
  );
}
