import {
  useCallback,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  AuthApiError,
  getAuthFieldErrors,
  getAuthFormErrors,
} from "../../../services/authService";

import {
  changeAccountPassword,
} from "../../../services/accountService";

import type {
  PasswordStrengthAssessment,
} from "../../auth/passwordStrength";

import {
  AuthFormMessage,
  AuthSubmitButton,
  PasswordField,
} from "../../auth/components/AuthFields";

import PasswordStrengthMeter from "../../auth/components/PasswordStrengthMeter";

interface ChangePasswordPanelProps {
  csrfToken: string;
  email: string;
  displayName: string;
  onCancel: () => void;
  onChanged: (
    message: string,
  ) => Promise<void>;
  onRecentAuthenticationRequired: () => void;
}

function ChangePasswordPanel({
  csrfToken,
  email,
  displayName,
  onCancel,
  onChanged,
  onRecentAuthenticationRequired,
}: ChangePasswordPanelProps) {
  const [newPassword, setNewPassword] =
    useState("");

  const [confirmation, setConfirmation] =
    useState("");

  const [assessment, setAssessment] =
    useState<PasswordStrengthAssessment | null>(
      null,
    );

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [fieldErrors, setFieldErrors] =
    useState<
      Record<
        "newPassword" | "confirmation",
        string[]
      >
    >({
      newPassword: [],
      confirmation: [],
    });

  const handleAssessment =
    useCallback(
      (
        nextAssessment:
          | PasswordStrengthAssessment
          | null,
      ) => {
        setAssessment(nextAssessment);
      },
      [],
    );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const confirmationErrors =
      confirmation !== newPassword
        ? ["Passwords do not match."]
        : [];

    if (confirmationErrors.length > 0) {
      setFieldErrors((current) => ({
        ...current,
        confirmation:
          confirmationErrors,
      }));

      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({
      newPassword: [],
      confirmation: [],
    });

    try {
      const response =
        await changeAccountPassword(
          {
            newPassword,
          },
          csrfToken,
        );

      await onChanged(response.message);
    } catch (error) {
      if (
        error instanceof AuthApiError &&
        error.code ===
          "AUTH_RECENT_AUTHENTICATION_REQUIRED"
      ) {
        onRecentAuthenticationRequired();
        return;
      }

      const nextFieldErrors = {
        newPassword:
          getAuthFieldErrors(
            error,
            "newPassword",
          ),
        confirmation: [],
      };

      if (
        error instanceof AuthApiError &&
        (
          error.code === "AUTH_WEAK_PASSWORD" ||
          error.code === "AUTH_PASSWORD_REUSE_REJECTED"
        ) &&
        nextFieldErrors.newPassword.length === 0
      ) {
        nextFieldErrors.newPassword = [
          error.message,
        ];
      }

      setFieldErrors(nextFieldErrors);

      const formErrors =
        getAuthFormErrors(error);

      setErrorMessage(
        formErrors[0] ??
          (
            nextFieldErrors.newPassword.length > 0
              ? null
              : error instanceof Error
                ? error.message
                : "FilmGeezer could not change your password."
          ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordCharacterCount =
    Array.from(newPassword).length;

  const passwordIsReady =
    passwordCharacterCount >= 8 &&
    passwordCharacterCount <= 128 &&
    assessment?.accepted === true;

  const confirmationIsReady =
    confirmation.length > 0 &&
    confirmation === newPassword;

  return (
    <section className="rounded-3xl border border-sky-400/20 bg-sky-400/[0.045] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
            Change password
          </p>

          <h3 className="mt-2 text-xl font-bold text-white">
            Choose a new password
          </h3>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
            FilmGeezer will rotate this session and sign out every other device after the change.
          </p>
        </div>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-4 lg:grid-cols-2"
        noValidate
      >
        <div>
          <AuthFormMessage
            message={errorMessage}
          />

          <div className={errorMessage ? "mt-4" : ""}>
            <PasswordField
              id="account-new-password"
              label="New password"
              autoComplete="new-password"
              autoFocus
              required
              maxLength={128}
              value={newPassword}
              disabled={isSubmitting}
              errorMessages={fieldErrors.newPassword}
              placeholder="Use a memorable passphrase"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setNewPassword(event.target.value);
                setAssessment(null);

                if (fieldErrors.newPassword.length > 0) {
                  setFieldErrors((current) => ({
                    ...current,
                    newPassword: [],
                  }));
                }
              }}
            />

            <PasswordStrengthMeter
              password={newPassword}
              email={email}
              displayName={displayName}
              onAssessmentChange={handleAssessment}
            />
          </div>
        </div>

        <div>
          <PasswordField
            id="account-confirm-password"
            label="Confirm new password"
            autoComplete="new-password"
            required
            maxLength={128}
            value={confirmation}
            disabled={isSubmitting}
            errorMessages={fieldErrors.confirmation}
            placeholder="Type the new password again"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setConfirmation(event.target.value);

              if (fieldErrors.confirmation.length > 0) {
                setFieldErrors((current) => ({
                  ...current,
                  confirmation: [],
                }));
              }
            }}
          />

          <div className="mt-5">
            <AuthSubmitButton
              label="Change password"
              loadingLabel="Changing password…"
              isSubmitting={isSubmitting}
              disabled={
                !passwordIsReady ||
                !confirmationIsReady
              }
            />
          </div>
        </div>
      </form>
    </section>
  );
}

export default ChangePasswordPanel;
