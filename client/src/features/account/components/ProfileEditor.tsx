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
  csrfToken: string;
  onUpdated: (
    displayName: string,
    message: string,
  ) => Promise<void>;
}

function createInitials(
  displayName: string,
): string {
  const parts = displayName
    .trim()
    .split(/\s+/u)
    .filter(Boolean);

  if (parts.length === 0) {
    return "FG";
  }

  if (parts.length === 1) {
    return Array.from(parts[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }

  return `${Array.from(parts[0])[0] ?? ""}${Array.from(parts.at(-1) ?? "")[0] ?? ""}`.toUpperCase();
}

function ProfileEditor({
  displayName,
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
            displayName: nextDisplayName,
          },
          csrfToken,
        );

      setNextDisplayName(
        response.user.displayName,
      );
      setSuccessMessage(response.message);

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

      setDisplayNameErrors(fieldErrors);

      const formErrors =
        getAuthFormErrors(error);

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
    nextDisplayName.trim() !==
    displayName.trim();

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/15">
      <div className="border-b border-white/8 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-bold tracking-tight text-white">
          Profile details
        </h2>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start">
        <div className="flex items-center gap-4 lg:flex-col lg:items-start">
          <div
            aria-label={`Profile initials: ${createInitials(nextDisplayName)}`}
            className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-sky-200/20 bg-[radial-gradient(circle_at_30%_20%,rgba(125,211,252,0.34),rgba(14,116,144,0.18)_45%,rgba(15,23,42,0.92))] text-2xl font-black text-sky-50 shadow-lg shadow-sky-950/30"
          >
            {createInitials(nextDisplayName)}
          </div>

          <div>
            <h3 className="text-sm font-bold text-white">
              Profile picture
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Your initials are shown for now.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-w-0 space-y-5"
          noValidate
        >
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
      </div>
    </section>
  );
}

export default ProfileEditor;
