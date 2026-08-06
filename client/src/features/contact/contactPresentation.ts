import type {
  ContactCategory,
  ContactConversationStatus,
} from "../../types/contact";

export const CONTACT_CATEGORY_LABELS: Record<ContactCategory, string> = {
  general: "Question or feedback",
  bug: "Problem report",
  content: "Content or link issue",
  account: "Account help",
  feedback: "Product feedback",
};

export const CONTACT_STATUS_PRESENTATION: Record<
  ContactConversationStatus,
  {
    label: string;
    className: string;
  }
> = {
  new: {
    label: "New",
    className:
      "border-sky-300/20 bg-sky-400/10 text-sky-200",
  },
  "in-review": {
    label: "In review",
    className:
      "border-amber-300/20 bg-amber-400/10 text-amber-100",
  },
  resolved: {
    label: "Resolved",
    className:
      "border-emerald-300/20 bg-emerald-400/10 text-emerald-100",
  },
};

export function formatContactDate(
  value: string,
  options?: {
    includeTime?: boolean;
  },
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(options?.includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
}
