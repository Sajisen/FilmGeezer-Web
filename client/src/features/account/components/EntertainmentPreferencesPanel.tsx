import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { AuthApiError } from "../../../services/authService";
import {
  getEntertainmentPreferences,
  updateEntertainmentPreferences,
} from "../../../services/preferencesService";

import type {
  EntertainmentPreferenceOptions,
  EntertainmentPreferences,
  EntertainmentPreferencesValues,
  PreferenceCategory,
  PreferenceGenre,
  PreferenceLanguage,
} from "../../../types/preferences";

interface EntertainmentPreferencesPanelProps {
  csrfToken: string;
}

interface PreferenceGroupProps {
  title: string;
  description: string;
  countLabel?: string;
  disabled?: boolean;
  children: ReactNode;
}

function PreferenceSparkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="h-5 w-5"
    >
      <path
        d="M12 3.75l1.3 4.04a4 4 0 002.58 2.58l4.04 1.3-4.04 1.3a4 4 0 00-2.58 2.58L12 19.6l-1.3-4.05a4 4 0 00-2.58-2.58l-4.04-1.3 4.04-1.3a4 4 0 002.58-2.58L12 3.75z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PreferenceToggle({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={`group inline-flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[17rem] ${
        checked
          ? "border-sky-300/30 bg-sky-400/12 text-sky-100"
          : "border-white/10 bg-slate-950/40 text-slate-300"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-white">
          Personalised suggestions
        </p>
        <p className="mt-0.5 text-xs leading-5 text-slate-400">
          Use your interests for future recommendations.
        </p>
      </div>

      <span
        aria-hidden="true"
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
          checked ? "bg-sky-500" : "bg-slate-700"
        }`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow-[0_3px_10px_rgba(15,23,42,0.35)] transition-transform duration-200 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}

function PreferenceGroup({
  title,
  description,
  countLabel,
  disabled = false,
  children,
}: PreferenceGroupProps) {
  return (
    <fieldset
      disabled={disabled}
      className={`rounded-2xl border border-white/8 bg-slate-950/25 p-4 transition sm:p-5 ${
        disabled ? "opacity-50" : "opacity-100"
      }`}
    >
      <legend className="sr-only">{title}</legend>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white sm:text-[0.95rem]">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-400">
            {description}
          </p>
        </div>

        {countLabel && (
          <span className="inline-flex shrink-0 self-start rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs font-semibold text-slate-400">
            {countLabel}
          </span>
        )}
      </div>

      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

function SelectionChip({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`min-h-10 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed ${
        selected
          ? "border-sky-300/35 bg-sky-400/15 text-sky-100 shadow-sm shadow-sky-950/30"
          : "border-white/10 bg-slate-950/35 text-slate-300 hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function orderSelectedValues<T extends string>(
  selected: T[],
  options: Array<{ value: T }>,
): T[] {
  const selectedSet = new Set(selected);

  return options
    .map((option) => option.value)
    .filter((value) => selectedSet.has(value));
}

function normalizeDraft(
  draft: EntertainmentPreferencesValues,
  options: EntertainmentPreferenceOptions,
): EntertainmentPreferencesValues {
  return {
    personalizationEnabled: draft.personalizationEnabled,
    preferredCategories: orderSelectedValues(
      draft.preferredCategories,
      options.categories,
    ),
    preferredGenres: orderSelectedValues(
      draft.preferredGenres,
      options.genres,
    ),
    hiddenGenres: orderSelectedValues(draft.hiddenGenres, options.genres),
    preferredLanguages: orderSelectedValues(
      draft.preferredLanguages,
      options.languages,
    ),
  };
}

function valuesMatch(
  first: EntertainmentPreferencesValues,
  second: EntertainmentPreferencesValues,
): boolean {
  return (
    first.personalizationEnabled === second.personalizationEnabled &&
    first.preferredCategories.join("\u0000") ===
      second.preferredCategories.join("\u0000") &&
    first.preferredGenres.join("\u0000") ===
      second.preferredGenres.join("\u0000") &&
    first.hiddenGenres.join("\u0000") ===
      second.hiddenGenres.join("\u0000") &&
    first.preferredLanguages.join("\u0000") ===
      second.preferredLanguages.join("\u0000")
  );
}

function toValues(
  preferences: EntertainmentPreferences,
): EntertainmentPreferencesValues {
  return {
    personalizationEnabled: preferences.personalizationEnabled,
    preferredCategories: [...preferences.preferredCategories],
    preferredGenres: [...preferences.preferredGenres],
    hiddenGenres: [...preferences.hiddenGenres],
    preferredLanguages: [...preferences.preferredLanguages],
  };
}

function EntertainmentPreferencesPanel({
  csrfToken,
}: EntertainmentPreferencesPanelProps) {
  const [savedPreferences, setSavedPreferences] =
    useState<EntertainmentPreferences | null>(null);
  const [draft, setDraft] =
    useState<EntertainmentPreferencesValues | null>(null);
  const [options, setOptions] =
    useState<EntertainmentPreferenceOptions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);
  const [selectionMessage, setSelectionMessage] =
    useState<string | null>(null);

  const loadPreferences = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getEntertainmentPreferences(signal);

        setSavedPreferences(response.preferences);
        setOptions(response.options);
        setDraft(toValues(response.preferences));
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "FilmGeezer could not load your entertainment choices.",
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadPreferences(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadPreferences]);

  const normalizedDraft = useMemo(() => {
    if (!draft || !options) {
      return null;
    }

    return normalizeDraft(draft, options);
  }, [draft, options]);

  const hasChanges = useMemo(() => {
    if (!savedPreferences || !normalizedDraft) {
      return false;
    }

    return !valuesMatch(toValues(savedPreferences), normalizedDraft);
  }, [normalizedDraft, savedPreferences]);

  function prepareSelectionChange() {
    setSelectionMessage(null);
    setSuccessMessage(null);
  }

  function toggleCategory(value: PreferenceCategory) {
    if (!draft) {
      return;
    }

    prepareSelectionChange();

    const isSelected = draft.preferredCategories.includes(value);

    if (isSelected && draft.preferredCategories.length === 1) {
      setSelectionMessage(
        "Keep at least one content category selected.",
      );
      return;
    }

    setDraft({
      ...draft,
      preferredCategories: isSelected
        ? draft.preferredCategories.filter((item) => item !== value)
        : [...draft.preferredCategories, value],
    });
  }

  function togglePreferredGenre(value: PreferenceGenre) {
    if (!draft || !options) {
      return;
    }

    prepareSelectionChange();

    const isSelected = draft.preferredGenres.includes(value);

    if (
      !isSelected &&
      draft.preferredGenres.length >=
        options.limits.maximumPreferredGenres
    ) {
      setSelectionMessage(
        `Choose up to ${options.limits.maximumPreferredGenres} genres you enjoy.`,
      );
      return;
    }

    setDraft({
      ...draft,
      preferredGenres: isSelected
        ? draft.preferredGenres.filter((item) => item !== value)
        : [...draft.preferredGenres, value],
      hiddenGenres: isSelected
        ? draft.hiddenGenres
        : draft.hiddenGenres.filter((item) => item !== value),
    });
  }

  function toggleHiddenGenre(value: PreferenceGenre) {
    if (!draft || !options) {
      return;
    }

    prepareSelectionChange();

    const isSelected = draft.hiddenGenres.includes(value);

    if (
      !isSelected &&
      draft.hiddenGenres.length >= options.limits.maximumHiddenGenres
    ) {
      setSelectionMessage(
        `Choose up to ${options.limits.maximumHiddenGenres} genres to see less often.`,
      );
      return;
    }

    setDraft({
      ...draft,
      hiddenGenres: isSelected
        ? draft.hiddenGenres.filter((item) => item !== value)
        : [...draft.hiddenGenres, value],
      preferredGenres: isSelected
        ? draft.preferredGenres
        : draft.preferredGenres.filter((item) => item !== value),
    });
  }

  function toggleLanguage(value: PreferenceLanguage) {
    if (!draft || !options) {
      return;
    }

    prepareSelectionChange();

    const isSelected = draft.preferredLanguages.includes(value);

    if (
      !isSelected &&
      draft.preferredLanguages.length >=
        options.limits.maximumPreferredLanguages
    ) {
      setSelectionMessage(
        `Choose up to ${options.limits.maximumPreferredLanguages} preferred languages.`,
      );
      return;
    }

    setDraft({
      ...draft,
      preferredLanguages: isSelected
        ? draft.preferredLanguages.filter((item) => item !== value)
        : [...draft.preferredLanguages, value],
    });
  }

  function restoreSavedPreferences() {
    if (!savedPreferences) {
      return;
    }

    setDraft(toValues(savedPreferences));
    setSelectionMessage(null);
    setSuccessMessage(null);
    setErrorMessage(null);
  }

  async function handlePersonalizationToggle() {
    if (!draft || !savedPreferences || !options || isSaving) {
      return;
    }

    const previousDraft = draft;
    const nextDraft = {
      ...draft,
      personalizationEnabled: !draft.personalizationEnabled,
    };

    setDraft(nextDraft);
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectionMessage(null);

    try {
      const response = await updateEntertainmentPreferences(
        {
          revision: savedPreferences.revision,
          ...normalizeDraft(nextDraft, options),
        },
        csrfToken,
      );

      setSavedPreferences(response.preferences);
      setOptions(response.options);
      setDraft(toValues(response.preferences));
    } catch (error) {
      if (
        error instanceof AuthApiError &&
        error.code === "PREFERENCES_REVISION_CONFLICT"
      ) {
        await loadPreferences();
        setErrorMessage(
          "Your choices changed on another device, so FilmGeezer loaded the latest version.",
        );
        return;
      }

      setDraft(previousDraft);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not update personalised suggestions.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSave() {
    if (
      !savedPreferences ||
      !normalizedDraft ||
      isSaving ||
      !hasChanges
    ) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSelectionMessage(null);

    try {
      const response = await updateEntertainmentPreferences(
        {
          revision: savedPreferences.revision,
          ...normalizedDraft,
        },
        csrfToken,
      );

      setSavedPreferences(response.preferences);
      setOptions(response.options);
      setDraft(toValues(response.preferences));
      setSuccessMessage(response.message);
    } catch (error) {
      if (
        error instanceof AuthApiError &&
        error.code === "PREFERENCES_REVISION_CONFLICT"
      ) {
        await loadPreferences();
        setErrorMessage(
          "Your choices changed on another device, so FilmGeezer loaded the latest version. Review them and save again.",
        );
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "FilmGeezer could not save your entertainment choices.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl shadow-black/15">
      <div className="border-b border-white/8 bg-[linear-gradient(135deg,rgba(8,47,73,0.28),rgba(15,23,42,0))] px-5 py-5 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center lg:gap-8">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-cyan-300 shadow-sm shadow-cyan-950/20">
              <PreferenceSparkIcon />
            </span>

            <div className="min-w-0 self-center">
              <h2 className="text-lg font-bold tracking-tight text-white">
                Your interests
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-400">
                {draft?.personalizationEnabled === false
                  ? "Turn on personalised suggestions to choose what you enjoy."
                  : "Choose what you enjoy to shape future FilmGeezer recommendations."}
              </p>
            </div>
          </div>

          {draft && (
            <PreferenceToggle
              checked={draft.personalizationEnabled}
              disabled={isLoading || isSaving}
              onToggle={() => void handlePersonalizationToggle()}
            />
          )}
        </div>

        {errorMessage && draft && options && !draft.personalizationEnabled && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-300/20 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-100"
          >
            {errorMessage}
          </p>
        )}
      </div>

      {(isLoading ||
        (errorMessage && (!draft || !options)) ||
        (draft &&
          options &&
          savedPreferences &&
          draft.personalizationEnabled)) && (
        <div className="space-y-5 p-5 sm:p-6">
          {isLoading ? (
            <div aria-live="polite" className="space-y-4">
              <p className="sr-only">Loading entertainment preferences…</p>
              <div className="skeleton-placeholder h-20 rounded-2xl" />
              <div className="skeleton-placeholder h-28 rounded-2xl" />
              <div className="skeleton-placeholder h-24 rounded-2xl" />
            </div>
          ) : errorMessage && (!draft || !options) ? (
            <div className="rounded-2xl border border-red-300/20 bg-red-400/[0.07] p-4">
              <p role="alert" className="text-sm leading-6 text-red-100">
                {errorMessage}
              </p>
              <button
                type="button"
                onClick={() => void loadPreferences()}
                className="mt-3 min-h-10 rounded-full border border-red-200/20 bg-red-300/10 px-4 text-sm font-bold text-red-100 transition hover:bg-red-300/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                Try again
              </button>
            </div>
          ) : draft && options && savedPreferences ? (
            <>
              <PreferenceGroup
                title="What do you watch?"
                description="Keep at least one category selected."
                disabled={isSaving}
              >
                <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {options.categories.map((option) => {
                    const selected = draft.preferredCategories.includes(
                      option.value,
                    );

                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={selected}
                        disabled={isSaving}
                        onClick={() => toggleCategory(option.value)}
                        className={`flex h-[8.5rem] min-w-0 flex-col rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed sm:h-[7.75rem] ${
                          selected
                            ? "border-sky-300/30 bg-sky-400/10 shadow-sm shadow-sky-950/25"
                            : "border-white/10 bg-slate-950/30 hover:border-white/20 hover:bg-white/[0.035]"
                        }`}
                      >
                        <span className="flex min-h-5 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                              selected ? "bg-sky-300" : "bg-slate-600"
                            }`}
                          />
                          <span
                            className={`truncate text-sm font-bold ${
                              selected ? "text-sky-100" : "text-white"
                            }`}
                          >
                            {option.label}
                          </span>
                        </span>
                        <span className="mt-2 line-clamp-3 text-xs leading-5 text-slate-400">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PreferenceGroup>

              <div className="grid gap-4 xl:grid-cols-2">
                <PreferenceGroup
                  title="Genres you enjoy"
                  description="Choose the strongest signals for what you would like to discover."
                  countLabel={`${draft.preferredGenres.length}/${options.limits.maximumPreferredGenres}`}
                  disabled={isSaving}
                >
                  <div className="flex flex-wrap gap-2">
                    {options.genres.map((option) => (
                      <SelectionChip
                        key={option.value}
                        label={option.label}
                        selected={draft.preferredGenres.includes(
                          option.value,
                        )}
                        disabled={isSaving}
                        onClick={() =>
                          togglePreferredGenre(option.value)
                        }
                      />
                    ))}
                  </div>
                </PreferenceGroup>

                <PreferenceGroup
                  title="Show less of"
                  description="Optional. These genres receive less priority, not disappear completely."
                  countLabel={`${draft.hiddenGenres.length}/${options.limits.maximumHiddenGenres}`}
                  disabled={isSaving}
                >
                  <div className="flex flex-wrap gap-2">
                    {options.genres.map((option) => (
                      <SelectionChip
                        key={option.value}
                        label={option.label}
                        selected={draft.hiddenGenres.includes(option.value)}
                        disabled={isSaving}
                        onClick={() => toggleHiddenGenre(option.value)}
                      />
                    ))}
                  </div>
                </PreferenceGroup>
              </div>

              <PreferenceGroup
                title="Languages you prefer"
                description="Optional. Leave everything unselected to keep all languages equally open."
                countLabel={`${draft.preferredLanguages.length}/${options.limits.maximumPreferredLanguages}`}
                disabled={isSaving}
              >
                <div className="flex flex-wrap gap-2">
                  {options.languages.map((option) => (
                    <SelectionChip
                      key={option.value}
                      label={option.label}
                      selected={draft.preferredLanguages.includes(
                        option.value,
                      )}
                      disabled={isSaving}
                      onClick={() => toggleLanguage(option.value)}
                    />
                  ))}
                </div>
              </PreferenceGroup>

              {(selectionMessage || errorMessage || successMessage) && (
                <div aria-live="polite" className="space-y-3">
                  {selectionMessage && (
                    <p className="rounded-xl border border-amber-300/20 bg-amber-400/[0.07] px-4 py-3 text-sm leading-6 text-amber-100">
                      {selectionMessage}
                    </p>
                  )}
                  {errorMessage && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-300/20 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-100"
                    >
                      {errorMessage}
                    </p>
                  )}
                  {successMessage && (
                    <p
                      role="status"
                      className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.07] px-4 py-3 text-sm leading-6 text-emerald-100"
                    >
                      {successMessage}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-4 border-t border-white/8 pt-5 xl:flex-row xl:items-center xl:justify-between">
                <p className="max-w-xl text-xs leading-5 text-slate-500">
                  These choices are private to your account. They do not
                  change your Watchlist or hide titles from Search.
                </p>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:shrink-0">
                  <button
                    type="button"
                    onClick={restoreSavedPreferences}
                    disabled={!hasChanges || isSaving}
                    className="min-h-11 whitespace-nowrap rounded-full border border-white/12 px-5 text-sm font-bold text-slate-300 transition hover:bg-white/7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    disabled={!hasChanges || isSaving}
                    className="min-h-11 whitespace-nowrap rounded-full bg-sky-500 px-6 text-sm font-bold text-white transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isSaving ? "Saving…" : "Save interests"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

export default EntertainmentPreferencesPanel;