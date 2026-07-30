import {
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import {
  getAuthFieldErrors,
  getAuthFormErrors,
} from "../../../services/authService";

import {
  updateAccountProfile,
} from "../../../services/accountService";

import {
  AuthField,
  AuthFormMessage,
  AuthSubmitButton,
} from "../../auth/components/AuthFields";

interface ProfileEditorProps {
  displayName: string;
  email: string;
  csrfToken: string;
  onUpdated: (
    displayName: string,
    message: string,
  ) => Promise<void>;
}

function ProfileEditor({
  displayName,
  email,
  csrfToken,
  onUpdated,
}: ProfileEditorProps) {
  const [nextDisplayName, setNextDisplayName] =
    useState(displayName);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const [displayNameErrors, setDisplayNameErrors] =
    useState<string[]>([]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setDisplayNameErrors([]);

    try {
      const response =
        await updateAccountProfile(
          {
            displayName:
              nextDisplayName,
          },
          csrfToken,
        );

      setNextDisplayName(
        response.user.displayName,
      );

      setSuccessMessage(
        response.message,
      );

      await onUpdated(
        response.user.displayName,
        response.message,
      );
    } catch (error) {
      const fieldErrors =
        getAuthFieldErrors(
          error,
          "displayName",
        );

      setDisplayNameErrors(
        fieldErrors,
      );

      const formErrors =
        getAuthFormErrors(error);

      setErrorMessage(
        formErrors[0] ??
          (
            fieldErrors.length > 0
              ? null
              : error instanceof Error
                ? error.message
                : "FilmGeezer could not update your profile."
          ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasChanged =
    nextDisplayName.trim() !==
    displayName.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      noValidate
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300">
          Profile details
        </p>

        <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
          How FilmGeezer addresses you
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Your display name appears in the account menu and personal FilmGeezer areas.
        </p>
      </div>

      <AuthFormMessage
        message={errorMessage}
      />

      {successMessage && (
        <p
          role="status"
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100"
        >
          {successMessage}
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <AuthField
          id="account-display-name"
          label="Display name"
          type="text"
          autoComplete="name"
          required
          maxLength={200}
          value={nextDisplayName}
          disabled={isSubmitting}
          errorMessages={displayNameErrors}
          placeholder="Your name"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setNextDisplayName(
              event.target.value,
            );
            setSuccessMessage(null);

            if (displayNameErrors.length > 0) {
              setDisplayNameErrors([]);
            }
          }}
        />

        <AuthField
          id="account-email"
          label="Email address"
          type="email"
          value={email}
          disabled
          readOnly
          hint="Email changes will use a separate verification flow."
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/8 pt-5">
        <p className="text-xs leading-5 text-slate-500">
          Display-name changes do not require password confirmation.
        </p>

        <div className="w-full sm:w-52">
          <AuthSubmitButton
            label="Save profile"
            loadingLabel="Saving…"
            isSubmitting={isSubmitting}
            disabled={!hasChanged}
          />
        </div>
      </div>
    </form>
  );
}

export default ProfileEditor;
