import type {
  AdminManagedUserStatus,
} from "../types/admin";

export function formatAdminUserDate(
  value: string | null,
): string {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleString();
}

export function formatAdminUserRelativeDate(
  value: string | null,
): string {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);
  const difference = Date.now() - date.getTime();

  if (Number.isNaN(difference)) {
    return "Unknown";
  }

  const absolute = Math.abs(difference);
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: "auto",
  });

  if (absolute < 60_000) {
    return "Just now";
  }

  if (absolute < 60 * 60_000) {
    return formatter.format(
      -Math.round(difference / 60_000),
      "minute",
    );
  }

  if (absolute < 24 * 60 * 60_000) {
    return formatter.format(
      -Math.round(difference / (60 * 60_000)),
      "hour",
    );
  }

  return formatter.format(
    -Math.round(difference / (24 * 60 * 60_000)),
    "day",
  );
}

export function getAdminUserStatusLabel(
  status: AdminManagedUserStatus,
): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "active":
      return "Active";
    case "suspended":
      return "Suspended";
    case "deactivated":
      return "Deactivated";
    case "deleted":
      return "Deleted";
  }
}

export function getAdminUserStatusClass(
  status: AdminManagedUserStatus,
): string {
  switch (status) {
    case "active":
      return "border-emerald-300/15 bg-emerald-400/10 text-emerald-200";
    case "pending":
      return "border-amber-300/15 bg-amber-400/10 text-amber-100";
    case "suspended":
      return "border-red-300/15 bg-red-400/10 text-red-100";
    case "deactivated":
      return "border-slate-300/10 bg-slate-400/[0.08] text-slate-300";
    case "deleted":
      return "border-rose-300/15 bg-rose-400/10 text-rose-200";
  }
}

export function describeUserAgent(
  userAgent: string | null,
): string {
  if (!userAgent) {
    return "Unknown browser or device";
  }

  const browser =
    /Edg\//u.test(userAgent)
      ? "Microsoft Edge"
      : /Chrome\//u.test(userAgent)
        ? "Google Chrome"
        : /Firefox\//u.test(userAgent)
          ? "Mozilla Firefox"
          : /Safari\//u.test(userAgent)
            ? "Safari"
            : "Browser";

  const platform =
    /Windows/u.test(userAgent)
      ? "Windows"
      : /Android/u.test(userAgent)
        ? "Android"
        : /iPhone|iPad|iOS/u.test(userAgent)
          ? "iOS"
          : /Macintosh|Mac OS/u.test(userAgent)
            ? "macOS"
            : /Linux/u.test(userAgent)
              ? "Linux"
              : "Unknown device";

  return `${browser} on ${platform}`;
}
