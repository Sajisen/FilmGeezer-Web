import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getEmailPreferences,
  updateEmailPreferences,
} from "../../../services/emailPreferencesService";
import {
  AuthApiError,
} from "../../../services/authService";
import type {
  EmailPreferences,
  EmailPreferencesValues,
} from "../../../types/emailPreferences";
import AccountIcon from "./AccountSectionIcons";

interface EmailPreferencesPanelProps {
  csrfToken: string;
}

function formatSavedAt(
  value: string | null,
): string {
  if (!value) {
    return "Using FilmGeezer defaults";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Saved";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(date);
}

function toValues(
  preferences: EmailPreferences,
): EmailPreferencesValues {
  return {
    recommendationsAndDiscoveryEmailsEnabled:
      preferences
        .recommendationsAndDiscoveryEmailsEnabled,
    productUpdatesEmailsEnabled:
      preferences.productUpdatesEmailsEnabled,
  };
}

function valuesMatch(
  first: EmailPreferencesValues,
  second: EmailPreferencesValues,
): boolean {
  return (
    first
      .recommendationsAndDiscoveryEmailsEnabled ===
      second
        .recommendationsAndDiscoveryEmailsEnabled &&
    first.productUpdatesEmailsEnabled ===
      second.productUpdatesEmailsEnabled
  );
}

function PreferenceSwitch({
  checked,
  disabled,
  label,
  description,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  label: string;
  description: string;
  onToggle(): void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className="flex w-full items-start justify-between gap-4 rounded-2xl border border-white/[0.08] bg-slate-950/35 px-4 py-4 text-left transition hover:border-sky-300/20 hover:bg-slate-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-400">
          {description}
        </span>
      </span>

      <span
        aria-hidden="true"
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
          checked
            ? "bg-sky-500"
            : "bg-slate-700"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            checked
              ? "translate-x-5"
              : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function EssentialEmailRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.045] px-4 py-4 sm:px-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-400/10 text-emerald-200">
        <AccountIcon
          name="shield"
          className="h-4.5 w-4.5"
        />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h4 className="text-sm font-bold text-white">
            {title}
          </h4>
          <span className="rounded-full border border-emerald-300/15 bg-emerald-400/10 px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.11em] text-emerald-200">
            Always on
          </span>
        </div>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function EmailPreferencesPanel({
  csrfToken,
}: EmailPreferencesPanelProps) {
  const [savedPreferences, setSavedPreferences] =
    useState<EmailPreferences | null>(
      null,
    );
  const [draft, setDraft] =
    useState<EmailPreferencesValues | null>(
      null,
    );
  const [isLoading, setIsLoading] =
    useState(true);
  const [isSaving, setIsSaving] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const loadPreferences = useCallback(
    async (
      signal?: AbortSignal,
    ) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response =
          await getEmailPreferences(signal);

        if (!signal?.aborted) {
          setSavedPreferences(
            response.preferences,
          );
          setDraft(
            toValues(
              response.preferences,
            ),
          );
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        if (!signal?.aborted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "FilmGeezer could not load your email preferences.",
          );
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller =
      new AbortController();
    const timer =
      window.setTimeout(() => {
        void loadPreferences(
          controller.signal,
        );
      }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadPreferences]);

  const hasChanges =
    useMemo(() => {
      if (
        !savedPreferences ||
        !draft
      ) {
        return false;
      }

      return !valuesMatch(
        toValues(savedPreferences),
        draft,
      );
    }, [
      draft,
      savedPreferences,
    ]);

  function setPreference<
    Key extends keyof EmailPreferencesValues,
  >(
    key: Key,
    value: EmailPreferencesValues[Key],
  ) {
    setDraft((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  async function handleSave() {
    if (
      !savedPreferences ||
      !draft ||
      isSaving ||
      !hasChanges
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response =
        await updateEmailPreferences(
          {
            revision:
              savedPreferences.revision,
            ...draft,
          },
          csrfToken,
        );

      setSavedPreferences(
        response.preferences,
      );
      setDraft(
        toValues(response.preferences),
      );
      setSuccessMessage(
        response.message,
      );
    } catch (error) {
      if (
        error instanceof AuthApiError &&
        error.code ===
          "EMAIL_PREFERENCES_REVISION_CONFLICT"
      ) {
        try {
          const latest =
            await getEmailPreferences();

          setSavedPreferences(
            latest.preferences,
          );
          setDraft(
            toValues(
              latest.preferences,
            ),
          );
        } catch {
          // The original conflict message remains more useful.
        }

        setErrorMessage(
          "Your email choices changed on another device. FilmGeezer loaded the latest saved version; review it and try again.",
        );
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "FilmGeezer could not save your email preferences.",
        );
      }
    } finally {
      setIsSaving(false);
    }
  }

  function resetOptionalEmails() {
    if (!draft || isSaving) {
      return;
    }

    setDraft({
      recommendationsAndDiscoveryEmailsEnabled:
        false,
      productUpdatesEmailsEnabled:
        false,
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  if (isLoading) {
    return (
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/15">
        <div className="border-b border-white/8 px-5 py-4 sm:px-6">
          <div className="h-5 w-40 animate-pulse rounded bg-white/[0.07] motion-reduce:animate-none" />
          <div className="mt-2 h-3.5 w-full max-w-lg animate-pulse rounded bg-white/[0.04] motion-reduce:animate-none" />
        </div>
        <div className="grid gap-3 p-5 sm:px-6">
          <div className="h-20 animate-pulse rounded-2xl bg-white/[0.035] motion-reduce:animate-none" />
          <div className="h-20 animate-pulse rounded-2xl bg-white/[0.035] motion-reduce:animate-none" />
          <div className="h-24 animate-pulse rounded-2xl bg-white/[0.035] motion-reduce:animate-none" />
        </div>
      </section>
    );
  }

  if (
    !savedPreferences ||
    !draft
  ) {
    return (
      <section className="overflow-hidden rounded-2xl border border-rose-300/15 bg-slate-900/70 shadow-xl shadow-black/15">
        <div className="flex items-start gap-3.5 p-5 sm:px-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-rose-300/15 bg-rose-400/10 text-rose-200">
            <AccountIcon
              name="warning"
              className="h-4.5 w-4.5"
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-white">
              Email preferences are unavailable
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {errorMessage ??
                "FilmGeezer could not load your email choices right now."}
            </p>
            <button
              type="button"
              onClick={() => {
                void loadPreferences();
              }}
              className="mt-4 min-h-10 rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 text-sm font-bold text-sky-100 transition hover:bg-sky-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/15">
      <header className="border-b border-white/[0.08] px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3.5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-sky-300/15 bg-sky-400/10 text-sky-200">
            <AccountIcon
              name="mail"
              className="h-5 w-5"
            />
          </span>

          <div className="min-w-0">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-sky-300">
              Communication
            </p>
            <h2 className="mt-1 text-lg font-black text-white sm:text-xl">
              Email preferences
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Important account, security, and support emails stay on. Everything else is optional and off by default.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-5 p-5 sm:p-6">
        {errorMessage ? (
          <p
            role="alert"
            className="rounded-xl border border-rose-300/15 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100"
          >
            {errorMessage}
          </p>
        ) : null}

        {successMessage ? (
          <p
            role="status"
            className="rounded-xl border border-emerald-300/15 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-100"
          >
            {successMessage}
          </p>
        ) : null}

        <div>
          <div className="mb-3">
            <h3 className="text-sm font-black text-white">
              Emails you’ll always receive
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              These messages are needed for your account and any support requests, so they stay on.
            </p>
          </div>

          <div className="grid gap-3">
            <EssentialEmailRow
              title="Account & security"
              description="Verification codes, password resets, email or password changes, account recovery, and important security alerts."
            />
            <EssentialEmailRow
              title="Support conversations"
              description="Replies and updates about support requests you send to FilmGeezer."
            />
          </div>
        </div>

        <div className="border-t border-white/[0.07] pt-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h3 className="text-sm font-black text-white">
                Optional FilmGeezer emails
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                FilmGeezer does not currently send newsletters or promotions. These choices stay off unless you decide to turn them on.
              </p>
            </div>

            <span className="rounded-full border border-sky-300/10 bg-sky-400/[0.06] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.12em] text-sky-200">
              Off by default
            </span>
          </div>

          <div className="grid gap-3">
            <PreferenceSwitch
              checked={
                draft
                  .recommendationsAndDiscoveryEmailsEnabled
              }
              disabled={isSaving}
              label="Recommendations & discovery"
              description="Occasional suggestions based on your FilmGeezer activity and the entertainment preferences you choose."
              onToggle={() => {
                setPreference(
                  "recommendationsAndDiscoveryEmailsEnabled",
                  !draft
                    .recommendationsAndDiscoveryEmailsEnabled,
                );
              }}
            />

            <PreferenceSwitch
              checked={
                draft
                  .productUpdatesEmailsEnabled
              }
              disabled={isSaving}
              label="FilmGeezer product updates"
              description="Occasional news about useful new FilmGeezer features and improvements."
              onToggle={() => {
                setPreference(
                  "productUpdatesEmailsEnabled",
                  !draft
                    .productUpdatesEmailsEnabled,
                );
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.07] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-slate-500">
            {formatSavedAt(
              savedPreferences.updatedAt,
            )}
          </p>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={resetOptionalEmails}
              disabled={
                isSaving ||
                (
                  !draft
                    .recommendationsAndDiscoveryEmailsEnabled &&
                  !draft
                    .productUpdatesEmailsEnabled
                )
              }
              className="min-h-10 rounded-xl border border-white/10 px-4 text-sm font-bold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Turn optional off
            </button>

            <button
              type="button"
              onClick={() => {
                void handleSave();
              }}
              disabled={
                isSaving ||
                !hasChanges
              }
              className="min-h-10 rounded-xl bg-sky-500 px-4 text-sm font-black text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving
                ? "Saving…"
                : "Save email preferences"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default EmailPreferencesPanel;
