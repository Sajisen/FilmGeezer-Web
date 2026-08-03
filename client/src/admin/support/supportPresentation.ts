import type {
  AdminSupportCategory,
  AdminSupportStatus,
} from "../types/admin";

export const SUPPORT_CATEGORY_LABELS: Record<
  AdminSupportCategory,
  string
> = {
  general: "Question or feedback",
  bug: "Problem report",
  content: "Content or link issue",
  account: "Account help",
  feedback: "Product feedback",
};

export const SUPPORT_STATUS_LABELS: Record<
  AdminSupportStatus,
  string
> = {
  new: "New",
  "in-review": "In review",
  resolved: "Resolved",
  spam: "Spam",
};

export function getSupportStatusClasses(
  status: AdminSupportStatus,
): string {
  switch (status) {
    case "new":
      return "border-sky-300/25 bg-sky-400/10 text-sky-200";
    case "in-review":
      return "border-amber-300/25 bg-amber-300/10 text-amber-100";
    case "resolved":
      return "border-emerald-300/25 bg-emerald-300/10 text-emerald-100";
    case "spam":
      return "border-red-300/20 bg-red-400/[0.08] text-red-100";
  }
}

export function formatAdminDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatAdminShortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
