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
            (
              message,
            ) => (
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

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={id}
          className="text-sm font-semibold text-slate-200"
        >
          {label}
        </label>

        <button
          type="button"
          onClick={() => {
            setIsVisible(
              (
                currentValue,
              ) =>
                !currentValue,
            );
          }}
          className="rounded-full px-2 py-1 text-xs font-semibold text-sky-300 transition hover:bg-sky-400/10 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          {isVisible
            ? "Hide"
            : "Show"}
        </button>
      </div>

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
            (
              message,
            ) => (
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
