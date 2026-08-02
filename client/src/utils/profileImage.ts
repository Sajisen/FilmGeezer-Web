const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ?? "",
).replace(/\/+$/u, "");

export function createProfileInitials(
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

  return `${Array.from(parts[0])[0] ?? ""}${
    Array.from(parts.at(-1) ?? "")[0] ?? ""
  }`.toUpperCase();
}

export function resolveProfileImageUrl(
  profileImagePath: string | null,
): string | null {
  if (!profileImagePath) {
    return null;
  }

  if (
    profileImagePath.startsWith("blob:") ||
    profileImagePath.startsWith("data:") ||
    /^https?:\/\//iu.test(profileImagePath)
  ) {
    return profileImagePath;
  }

  const normalizedPath = profileImagePath.startsWith("/")
    ? profileImagePath
    : `/${profileImagePath}`;

  return `${API_BASE_URL}${normalizedPath}`;
}
