import type {
  ContactCategory,
  ContactComposerDraft,
} from "../../types/contact";

const CONTACT_DRAFT_STORAGE_KEY =
  "filmgeezer.contact-composer-draft.v1";

const CONTACT_DRAFT_MAX_AGE_MS = 2 * 60 * 60 * 1_000;

const CONTACT_CATEGORIES = new Set<ContactCategory>([
  "general",
  "bug",
  "content",
  "account",
  "feedback",
]);

interface StoredContactDraft {
  version: 1;
  savedAt: number;
  draft: ContactComposerDraft;
}

export function createEmptyContactDraft(): ContactComposerDraft {
  return {
    category: "general",
    name: "",
    email: "",
    subject: "",
    message: "",
    nameTouched: false,
    emailTouched: false,
  };
}

function isContactComposerDraft(
  value: unknown,
): value is ContactComposerDraft {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const draft = value as Partial<ContactComposerDraft>;

  return (
    typeof draft.category === "string" &&
    CONTACT_CATEGORIES.has(draft.category as ContactCategory) &&
    typeof draft.name === "string" &&
    typeof draft.email === "string" &&
    typeof draft.subject === "string" &&
    typeof draft.message === "string" &&
    typeof draft.nameTouched === "boolean" &&
    typeof draft.emailTouched === "boolean"
  );
}

export function readContactDraft(): ContactComposerDraft | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(
      CONTACT_DRAFT_STORAGE_KEY,
    );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredContactDraft>;

    if (
      parsed.version !== 1 ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > CONTACT_DRAFT_MAX_AGE_MS ||
      !isContactComposerDraft(parsed.draft)
    ) {
      clearContactDraft();
      return null;
    }

    return parsed.draft.category === "feedback"
      ? {
          ...parsed.draft,
          category: "general",
        }
      : parsed.draft;
  } catch {
    clearContactDraft();
    return null;
  }
}

export function saveContactDraft(
  draft: ContactComposerDraft,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const stored: StoredContactDraft = {
    version: 1,
    savedAt: Date.now(),
    draft,
  };

  try {
    window.sessionStorage.setItem(
      CONTACT_DRAFT_STORAGE_KEY,
      JSON.stringify(stored),
    );
  } catch {
    // The route-backed auth modal still keeps the in-memory draft alive.
  }
}

export function clearContactDraft(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(CONTACT_DRAFT_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in restricted browsing contexts.
  }
}
