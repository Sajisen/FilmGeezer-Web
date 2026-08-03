import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  ContactApiError,
  submitContactMessage,
} from "../../../services/contactService";

import type {
  AuthStateStatus,
  AuthUser,
} from "../../../types/auth";

import type {
  ContactCategory,
  ContactComposerDraft,
  ContactFieldErrors,
  ContactFieldName,
  ContactSubmissionResponse,
} from "../../../types/contact";

import GuestContactChoiceDialog from "./GuestContactChoiceDialog";

interface ContactComposerProps {
  authStatus: AuthStateStatus;
  user: AuthUser | null;
  draft: ContactComposerDraft;
  onDraftChange: (draft: ContactComposerDraft) => void;
  onRequestAuthentication: () => void;
  onSubmitted: (response: ContactSubmissionResponse) => Promise<void>;
}

interface CategoryOption {
  value: Exclude<ContactCategory, "feedback">;
  label: string;
  description: string;
}

const CONTACT_CATEGORIES: CategoryOption[] = [
  {
    value: "general",
    label: "Question or feedback",
    description: "Ask a question, share an idea, or suggest an improvement.",
  },
  {
    value: "bug",
    label: "Report a problem",
    description: "Tell us about a feature that is not working correctly.",
  },
  {
    value: "content",
    label: "Content or link issue",
    description: "Report incorrect details or a FilmGeezer link problem.",
  },
  {
    value: "account",
    label: "Account help",
    description: "Get help with sign-in, verification, or account access.",
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

function getFirstFieldError(
  errors: ContactFieldErrors,
  field: ContactFieldName,
): string | null {
  return errors[field]?.[0] ?? null;
}

function ContactFieldMessage({
  id,
  message,
}: {
  id: string;
  message: string | null;
}) {
  if (!message) {
    return null;
  }

  return (
    <p id={id} className="mt-2 text-sm leading-5 text-red-300">
      {message}
    </p>
  );
}

function ContactComposer({
  authStatus,
  user,
  draft,
  onDraftChange,
  onRequestAuthentication,
  onSubmitted,
}: ContactComposerProps) {
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [fieldErrors, setFieldErrors] =
    useState<ContactFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGuestChoice, setShowGuestChoice] = useState(false);

  const name = draft.nameTouched
    ? draft.name
    : user?.displayName ?? draft.name;

  const email = draft.emailTouched
    ? draft.email
    : user?.email ?? draft.email;

  const selectedCategory =
    draft.category === "feedback" ? "general" : draft.category;

  useEffect(() => {
    if (authStatus === "authenticated") {
      setShowGuestChoice(false);
    }
  }, [authStatus]);

  const closeGuestChoice = useCallback(() => {
    setShowGuestChoice(false);
  }, []);

  function updateDraft(
    changes: Partial<ContactComposerDraft>,
  ) {
    onDraftChange({
      ...draft,
      ...changes,
    });
  }

  function clearFieldError(field: ContactFieldName) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  }

  function validateForm(): ContactFieldErrors {
    const errors: ContactFieldErrors = {};
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = draft.subject.trim();
    const trimmedMessage = draft.message.trim();

    if (trimmedName.length < 2) {
      errors.name = ["Enter your name."];
    } else if (trimmedName.length > 80) {
      errors.name = ["Your name is too long."];
    }

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = ["Enter a valid email address."];
    }

    if (trimmedSubject.length < 5) {
      errors.subject = ["Add a short subject."];
    } else if (trimmedSubject.length > 120) {
      errors.subject = ["The subject is too long."];
    }

    if (trimmedMessage.length < 20) {
      errors.message = [
        "Add a little more detail so we can understand the request.",
      ];
    } else if (trimmedMessage.length > 3_000) {
      errors.message = ["The message is too long."];
    }

    return errors;
  }

  async function submitValidatedMessage() {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError(null);

    try {
      const response = await submitContactMessage({
        category: selectedCategory,
        name: name.trim(),
        email: email.trim(),
        subject: draft.subject.trim(),
        message: draft.message.trim(),
        companyWebsite,
      });

      setCompanyWebsite("");
      setShowGuestChoice(false);
      await onSubmitted(response);
    } catch (error) {
      setShowGuestChoice(false);

      if (error instanceof ContactApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.formErrors[0] ?? error.message);
      } else {
        setFormError(
          "FilmGeezer could not send the message. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || authStatus === "loading") {
      return;
    }

    const clientErrors = validateForm();

    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setFormError("Check the highlighted fields and try again.");
      return;
    }

    if (authStatus !== "authenticated") {
      setShowGuestChoice(true);
      return;
    }

    await submitValidatedMessage();
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <div className="border-b border-white/8 px-5 py-5 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300/80">
                New support request
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-white">
                Send a message
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-slate-400">
                Choose a topic and tell us what happened. Clear details help us
                respond more effectively.
              </p>
            </div>

            {authStatus === "authenticated" && user ? (
              <span className="inline-flex shrink-0 self-start rounded-full border border-emerald-300/15 bg-emerald-400/[0.07] px-3 py-1.5 text-xs font-semibold text-emerald-200">
                Signed in as {user.email}
              </span>
            ) : authStatus === "guest" ? (
              <button
                type="button"
                onClick={onRequestAuthentication}
                className="inline-flex min-h-10 shrink-0 items-center self-start rounded-full border border-sky-300/25 bg-sky-400/10 px-4 text-xs font-bold text-sky-100 transition hover:bg-sky-400/15 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                Sign in for request history
              </button>
            ) : null}
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-7 sm:py-6">
          <fieldset>
            <legend className="text-sm font-bold text-white">
              What can we help with?
            </legend>

            <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(12rem,0.42fr)_minmax(0,0.58fr)] sm:items-stretch">
              <div className="relative">
                <label htmlFor="contact-category" className="sr-only">
                  Support category
                </label>
                <select
                  id="contact-category"
                  value={selectedCategory}
                  onChange={(event) => {
                    updateDraft({
                      category: event.target.value as ContactCategory,
                    });
                    clearFieldError("category");
                  }}
                  className="min-h-12 w-full appearance-none rounded-2xl border border-white/10 bg-slate-950/60 px-4 pr-11 text-sm font-bold text-white outline-none transition focus:border-sky-300/50 focus:ring-2 focus:ring-sky-300/20"
                >
                  {CONTACT_CATEGORIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                >
                  <path
                    d="M5 7.5l5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div className="flex min-h-12 items-center rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-2.5">
                <p className="text-xs leading-5 text-slate-400 sm:text-sm">
                  {
                    CONTACT_CATEGORIES.find(
                      (option) => option.value === selectedCategory,
                    )?.description
                  }
                </p>
              </div>
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="contact-name"
                className="text-sm font-bold text-slate-200"
              >
                Your name
              </label>
              <input
                id="contact-name"
                type="text"
                autoComplete="name"
                maxLength={80}
                value={name}
                aria-invalid={Boolean(
                  getFirstFieldError(fieldErrors, "name"),
                )}
                aria-describedby={
                  getFirstFieldError(fieldErrors, "name")
                    ? "contact-name-error"
                    : undefined
                }
                onChange={(event) => {
                  updateDraft({
                    name: event.target.value,
                    nameTouched: true,
                  });
                  clearFieldError("name");
                }}
                className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/50 focus:ring-2 focus:ring-sky-300/20"
                placeholder="Your name"
              />
              <ContactFieldMessage
                id="contact-name-error"
                message={getFirstFieldError(fieldErrors, "name")}
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                className="text-sm font-bold text-slate-200"
              >
                Reply email
              </label>
              <input
                id="contact-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={254}
                value={email}
                aria-invalid={Boolean(
                  getFirstFieldError(fieldErrors, "email"),
                )}
                aria-describedby={
                  getFirstFieldError(fieldErrors, "email")
                    ? "contact-email-error"
                    : undefined
                }
                onChange={(event) => {
                  updateDraft({
                    email: event.target.value,
                    emailTouched: true,
                  });
                  clearFieldError("email");
                }}
                className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/50 focus:ring-2 focus:ring-sky-300/20"
                placeholder="you@example.com"
              />
              <ContactFieldMessage
                id="contact-email-error"
                message={getFirstFieldError(fieldErrors, "email")}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="contact-subject"
              className="text-sm font-bold text-slate-200"
            >
              Subject
            </label>
            <input
              id="contact-subject"
              type="text"
              maxLength={120}
              value={draft.subject}
              aria-invalid={Boolean(
                getFirstFieldError(fieldErrors, "subject"),
              )}
              aria-describedby={
                getFirstFieldError(fieldErrors, "subject")
                  ? "contact-subject-error"
                  : undefined
              }
              onChange={(event) => {
                updateDraft({ subject: event.target.value });
                clearFieldError("subject");
              }}
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/50 focus:ring-2 focus:ring-sky-300/20"
              placeholder="A short summary"
            />
            <ContactFieldMessage
              id="contact-subject-error"
              message={getFirstFieldError(fieldErrors, "subject")}
            />
          </div>

          <div>
            <div className="flex items-end justify-between gap-4">
              <label
                htmlFor="contact-message"
                className="text-sm font-bold text-slate-200"
              >
                Message
              </label>
              <span
                className={`text-xs font-semibold ${
                  draft.message.length > 2_850
                    ? "text-amber-300"
                    : "text-slate-500"
                }`}
              >
                {draft.message.length}/3000
              </span>
            </div>

            <textarea
              id="contact-message"
              rows={5}
              maxLength={3_000}
              value={draft.message}
              aria-invalid={Boolean(
                getFirstFieldError(fieldErrors, "message"),
              )}
              aria-describedby={
                getFirstFieldError(fieldErrors, "message")
                  ? "contact-message-error"
                  : undefined
              }
              onChange={(event) => {
                updateDraft({ message: event.target.value });
                clearFieldError("message");
              }}
              className="contact-scrollbar mt-2 min-h-32 w-full resize-y rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-sky-300/50 focus:ring-2 focus:ring-sky-300/20"
              placeholder="Explain what happened, what you expected, and any steps that may help us understand the issue."
            />
            <ContactFieldMessage
              id="contact-message-error"
              message={getFirstFieldError(fieldErrors, "message")}
            />
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
          >
            <label htmlFor="contact-company-website">
              Company website
            </label>
            <input
              id="contact-company-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={companyWebsite}
              onChange={(event) =>
                setCompanyWebsite(event.target.value)
              }
            />
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-2xl border border-red-300/20 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-100"
            >
              {formError}
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-lg text-xs leading-5 text-slate-500">
              {authStatus === "authenticated"
                ? "This request will stay connected to your account so you can return and reply here."
                : "Guest requests are sent normally, but follow-up happens through the email you provide."}
            </p>

            <button
              type="submit"
              disabled={isSubmitting || authStatus === "loading"}
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-sky-500 px-7 text-sm font-bold text-white transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending…" : "Send message"}
            </button>
          </div>
        </div>
      </form>

      {showGuestChoice && (
        <GuestContactChoiceDialog
          email={email.trim()}
          isSending={isSubmitting}
          onClose={closeGuestChoice}
          onSignIn={() => {
            setShowGuestChoice(false);
            onRequestAuthentication();
          }}
          onSendAsGuest={() => void submitValidatedMessage()}
        />
      )}
    </>
  );
}

export default ContactComposer;
