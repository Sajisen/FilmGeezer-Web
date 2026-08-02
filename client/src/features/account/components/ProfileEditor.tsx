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

import EntertainmentPreferencesPanel from "./EntertainmentPreferencesPanel";
import ProfileImageEditor from "./ProfileImageEditor";

interface ProfileEditorProps {
  displayName: string;
  profileImagePath: string | null;
  csrfToken: string;
  onDisplayNameUpdated: (
    displayName: string,
    message: string,
  ) => Promise<void>;
  onProfileImageUpdated: (
    profileImagePath: string | null,
  ) => Promise<void>;
}

function ProfileEditor({
  displayName,
  profileImagePath,
  csrfToken,
  onDisplayNameUpdated,
  onProfileImageUpdated,
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
      const response = await updateAccountProfile(
        {
          displayName: nextDisplayName,
        },
        csrfToken,
      );

      setNextDisplayName(response.user.displayName);
      setSuccessMessage(response.message);

      await onDisplayNameUpdated(
        response.user.displayName,
        response.message,
      );
    } catch (error) {
      const fieldErrors = getAuthFieldErrors(
        error,
        "displayName",
      );

      setDisplayNameErrors(fieldErrors);

      const formErrors = getAuthFormErrors(error);

      setErrorMessage(
        formErrors[0] ??
          (fieldErrors.length > 0
            ? null
            : error instanceof Error
              ? error.message
              : "FilmGeezer could not update your profile."),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasChanged =
    nextDisplayName.trim() !== displayName.trim();

  return (
    <div className="w-full space-y-4">
      <section className="w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/15">
      <div className="border-b border-white/8 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-bold tracking-tight text-white">
          Profile details
        </h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Choose how your FilmGeezer account appears across the app.
        </p>
      </div>

      <ProfileImageEditor
        displayName={nextDisplayName}
        profileImagePath={profileImagePath}
        csrfToken={csrfToken}
        onChanged={onProfileImageUpdated}
      />

      <form
        onSubmit={handleSubmit}
        className="space-y-5 p-5 sm:p-6"
        noValidate
      >
        <div>
          <h3 className="text-base font-bold text-white">
            Display name
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            This name appears in your account and navigation menu.
          </p>
        </div>

        <AuthFormMessage message={errorMessage} />

        {successMessage && (
          <p
            role="status"
            className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100"
          >
            {successMessage}
          </p>
        )}

        <AuthField
          id="account-display-name"
          label="Display name"
          type="text"
          autoComplete="name"
          required
          maxLength={50}
          value={nextDisplayName}
          disabled={isSubmitting}
          errorMessages={displayNameErrors}
          placeholder="Your name"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setNextDisplayName(event.target.value);
            setSuccessMessage(null);

            if (displayNameErrors.length > 0) {
              setDisplayNameErrors([]);
            }
          }}
        />

        <div className="flex justify-end border-t border-white/8 pt-5">
          <div className="w-full sm:w-44">
            <AuthSubmitButton
              label="Save changes"
              loadingLabel="Saving…"
              isSubmitting={isSubmitting}
              disabled={!hasChanged}
            />
          </div>
        </div>
      </form>
      </section>

      <EntertainmentPreferencesPanel csrfToken={csrfToken} />
    </div>
  );
}

export default ProfileEditor;
