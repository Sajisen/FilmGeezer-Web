import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  AuthApiError,
  getAuthFieldErrors,
  getAuthFormErrors,
  resetLocalPassword,
} from "../../../services/authService";

import type {
  PasswordStrengthAssessment,
} from "../passwordStrength";

import {
  AuthFormMessage,
  AuthSubmitButton,
  PasswordField,
} from "./AuthFields";

import PasswordStrengthMeter from "./PasswordStrengthMeter";

interface ResetPasswordFormProps {
  challengeId: string | null;
  token: string | null;
  onBusyChange: (isBusy: boolean) => void;
  onDirtyChange: (isDirty: boolean) => void;
  onCompleted: (message: string) => Promise<void>;
  onRequestNewLink: () => void;
  onSwitchToLogin: () => void;
}

function ResetPasswordForm({
  challengeId,
  token,
  onBusyChange,
  onDirtyChange,
  onCompleted,
  onRequestNewLink,
  onSwitchToLogin,
}: ResetPasswordFormProps) {
  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [passwordAssessment, setPasswordAssessment] =
    useState<PasswordStrengthAssessment | null>(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [submissionError, setSubmissionError] =
    useState<string | null>(null);

  const [fieldErrors, setFieldErrors] =
    useState<
      Record<"password" | "confirmPassword", string[]>
    >({
      password: [],
      confirmPassword: [],
    });

  useEffect(() => {
    onBusyChange(isSubmitting);

    return () => {
      onBusyChange(false);
    };
  }, [isSubmitting, onBusyChange]);

  const handlePasswordAssessment =
    useCallback(
      (
        assessment: PasswordStrengthAssessment | null,
      ) => {
        setPasswordAssessment(assessment);
      },
      [],
    );

  if (!challengeId || !token) {
    return (
      <div className="space-y-4">
        <AuthFormMessage
          message="This password-reset link is incomplete or no longer available. Request a new link from FilmGeezer."
        />

        <button
          type="button"
          onClick={onRequestNewLink}
          className="min-h-12 w-full rounded-xl bg-sky-500 px-5 font-bold text-white shadow-lg shadow-sky-950/30 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
        >
          Request a new link
        </button>

        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full text-sm font-semibold text-slate-400 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          Return to sign in
        </button>
      </div>
    );
  }

  const resetChallengeId = challengeId;
  const resetToken = token;

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmissionError(null);
    setFieldErrors({
      password: [],
      confirmPassword: [],
    });

    if (password !== confirmPassword) {
      setFieldErrors({
        password: [],
        confirmPassword: [
          "The passwords do not match.",
        ],
      });

      return;
    }

    setIsSubmitting(true);

    try {
      const response = await resetLocalPassword({
        challengeId: resetChallengeId,
        token: resetToken,
        password,
      });

      onDirtyChange(false);
      await onCompleted(response.message);
    } catch (error) {
      const nextPasswordErrors =
        getAuthFieldErrors(error, "password");

      if (
        error instanceof AuthApiError &&
        (error.code === "AUTH_WEAK_PASSWORD" ||
          error.code ===
            "AUTH_PASSWORD_REUSE_REJECTED") &&
        nextPasswordErrors.length === 0
      ) {
        nextPasswordErrors.push(error.message);
      }

      setFieldErrors({
        password: nextPasswordErrors,
        confirmPassword: [],
      });

      const formErrors =
        getAuthFormErrors(error);

      setSubmissionError(
        formErrors[0] ??
          (nextPasswordErrors.length > 0
            ? null
            : error instanceof Error
              ? error.message
              : "FilmGeezer could not reset your password."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const characterCount =
    Array.from(password).length;

  const passwordLengthIsValid =
    characterCount >= 8 &&
    characterCount <= 128;

  const passwordIsReady =
    passwordLengthIsValid &&
    passwordAssessment !== null &&
    passwordAssessment.accepted;

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      noValidate
    >
      <AuthFormMessage
        message={submissionError}
      />

      <div>
        <PasswordField
          id="auth-reset-password"
          label="New password"
          autoComplete="new-password"
          autoFocus
          required
          value={password}
          disabled={isSubmitting}
          errorMessages={fieldErrors.password}
          placeholder="Create a new password"
          onChange={(event) => {
            const nextPassword = event.target.value;

            setPassword(nextPassword);
            setPasswordAssessment(null);
            onDirtyChange(
              nextPassword.length > 0 ||
                confirmPassword.length > 0,
            );

            if (fieldErrors.password.length > 0) {
              setFieldErrors((currentErrors) => ({
                ...currentErrors,
                password: [],
              }));
            }
          }}
        />

        <PasswordStrengthMeter
          password={password}
          email=""
          displayName=""
          onAssessmentChange={
            handlePasswordAssessment
          }
        />
      </div>

      <PasswordField
        id="auth-reset-password-confirmation"
        label="Confirm new password"
        autoComplete="new-password"
        required
        value={confirmPassword}
        disabled={isSubmitting}
        errorMessages={fieldErrors.confirmPassword}
        placeholder="Enter the new password again"
        onChange={(event) => {
          const nextConfirmation = event.target.value;

          setConfirmPassword(nextConfirmation);
          onDirtyChange(
            password.length > 0 ||
              nextConfirmation.length > 0,
          );

          if (
            fieldErrors.confirmPassword.length > 0
          ) {
            setFieldErrors((currentErrors) => ({
              ...currentErrors,
              confirmPassword: [],
            }));
          }
        }}
      />

      <AuthSubmitButton
        label="Reset password"
        loadingLabel="Resetting password…"
        isSubmitting={isSubmitting}
        disabled={
          !passwordIsReady ||
          confirmPassword.length === 0 ||
          password !== confirmPassword
        }
      />

      <p className="text-center text-xs leading-5 text-slate-500">
        A successful reset signs out every FilmGeezer session for this account.
      </p>
    </form>
  );
}

export default ResetPasswordForm;
