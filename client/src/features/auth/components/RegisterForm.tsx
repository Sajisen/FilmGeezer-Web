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
  registerLocalAccount,
} from "../../../services/authService";

import type {
  AuthVerificationReceipt,
} from "../../../types/auth";

import type {
  PasswordStrengthAssessment,
} from "../passwordStrength";

import {
  AuthField,
  AuthFormMessage,
  AuthSubmitButton,
  PasswordField,
} from "./AuthFields";

import PasswordStrengthMeter from "./PasswordStrengthMeter";

interface RegisterFormProps {
  onRegistrationSubmitted: (
    verification: AuthVerificationReceipt,
    email: string,
  ) => void;
  onSwitchToLogin: () => void;
  onBusyChange: (
    isBusy: boolean,
  ) => void;
  onDirtyChange: (
    isDirty: boolean,
  ) => void;
}

function RegisterForm({
  onRegistrationSubmitted,
  onSwitchToLogin,
  onBusyChange,
  onDirtyChange,
}: RegisterFormProps) {
  const [email, setEmail] =
    useState("");

  const [
    displayName,
    setDisplayName,
  ] = useState("");

  const [password, setPassword] =
    useState("");

  const [
    passwordAssessment,
    setPasswordAssessment,
  ] =
    useState<PasswordStrengthAssessment | null>(
      null,
    );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

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
      | "email"
      | "displayName"
      | "password",
      string[]
    >
  >({
    email: [],
    displayName: [],
    password: [],
  });

  useEffect(() => {
    onBusyChange(isSubmitting);

    return () => {
      onBusyChange(false);
    };
  }, [
    isSubmitting,
    onBusyChange,
  ]);

  const handlePasswordAssessment =
    useCallback(
      (
        assessment:
          | PasswordStrengthAssessment
          | null,
      ) => {
        setPasswordAssessment(
          assessment,
        );
      },
      [],
    );

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmissionError(null);

    setFieldErrors({
      email: [],
      displayName: [],
      password: [],
    });

    setIsSubmitting(true);

    try {
      const response =
        await registerLocalAccount(
          {
            email,
            displayName,
            password,
          },
        );

      onDirtyChange(false);

      onRegistrationSubmitted(
        response.verification,
        email.trim(),
      );
    } catch (error) {
      const nextFieldErrors = {
        email:
          getAuthFieldErrors(
            error,
            "email",
          ),

        displayName:
          getAuthFieldErrors(
            error,
            "displayName",
          ),

        password:
          getAuthFieldErrors(
            error,
            "password",
          ),
      };

      if (
        error instanceof
          AuthApiError &&
        error.code ===
          "AUTH_WEAK_PASSWORD" &&
        nextFieldErrors.password
          .length === 0
      ) {
        nextFieldErrors.password = [
          error.message,
        ];
      }

      setFieldErrors(
        nextFieldErrors,
      );

      const formErrors =
        getAuthFormErrors(error);

      const hasFieldError =
        Object.values(
          nextFieldErrors,
        ).some(
          (
            messages,
          ) =>
            messages.length > 0,
        );

      setSubmissionError(
        formErrors[0] ??
          (hasFieldError
            ? null
            : error instanceof Error
              ? error.message
              : "FilmGeezer could not create your account."),
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

      <AuthField
        id="auth-register-name"
        label="Display name"
        type="text"
        autoComplete="name"
        autoFocus
        required
        maxLength={200}
        value={displayName}
        disabled={isSubmitting}
        errorMessages={
          fieldErrors.displayName
        }
        placeholder="Your name"
        onChange={(event) => {
          const nextDisplayName =
            event.target.value;

          setDisplayName(
            nextDisplayName,
          );

          setPasswordAssessment(
            null,
          );

          onDirtyChange(
            nextDisplayName.length > 0 ||
              email.length > 0 ||
              password.length > 0,
          );

          if (
            fieldErrors
              .displayName.length >
            0
          ) {
            setFieldErrors(
              (
                currentErrors,
              ) => ({
                ...currentErrors,
                displayName: [],
              }),
            );
          }
        }}
      />

      <AuthField
        id="auth-register-email"
        label="Email address"
        type="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        value={email}
        disabled={isSubmitting}
        errorMessages={
          fieldErrors.email
        }
        placeholder="you@example.com"
        onChange={(event) => {
          const nextEmail =
            event.target.value;

          setEmail(nextEmail);

          setPasswordAssessment(
            null,
          );

          onDirtyChange(
            displayName.length > 0 ||
              nextEmail.length > 0 ||
              password.length > 0,
          );

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

      <div>
        <PasswordField
          id="auth-register-password"
          label="Password"
          autoComplete="new-password"
          required
          value={password}
          disabled={isSubmitting}
          errorMessages={
            fieldErrors.password
          }
          placeholder="Create a password"
          onChange={(event) => {
            const nextPassword =
              event.target.value;

            setPassword(
              nextPassword,
            );

            setPasswordAssessment(
              null,
            );

            onDirtyChange(
              displayName.length > 0 ||
                email.length > 0 ||
                nextPassword.length > 0,
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

        <PasswordStrengthMeter
          password={password}
          email={email}
          displayName={
            displayName
          }
          onAssessmentChange={
            handlePasswordAssessment
          }
        />
      </div>

      <AuthSubmitButton
        label="Create account"
        loadingLabel="Creating account…"
        isSubmitting={
          isSubmitting
        }
        disabled={
          email.trim().length === 0 ||
          displayName.trim()
            .length === 0 ||
          !passwordIsReady
        }
      />

      <p className="text-center text-sm leading-6 text-slate-400">
        Already have an account?{" "}

        <button
          type="button"
          onClick={onSwitchToLogin}
          disabled={isSubmitting}
          className="font-semibold text-sky-300 transition hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

export default RegisterForm;
